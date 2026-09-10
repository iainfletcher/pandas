import type { Mover, MoverContext, MoverSnapshot, MoverId, CarriedBlock } from '../mover.ts';
import type { Vec3 } from '../vec.ts';
import { vec, cellCentre, sub } from '../vec.ts';
import { BlockType } from '../blocks.ts';
import { SIM } from '../config.ts';
import { moveToward, moveTowardXZ, progress } from './common.ts';
import type { Pile } from '../pile.ts';

/**
 * The crane lifts blocks out of the pit and sets them on the rim (SPEC §4).
 * The base does not move; the hook does.
 *
 * States: idle → swingToPit → lowering → grabbing → raising → swingToDrop →
 * releasing → idle.
 *
 * The pendulum (§11.1) is the crane's entire personality, and it is *not*
 * here: the hook's logical position is what this file computes, and the
 * renderer hangs the load off it with a damped swing driven by hook velocity.
 * That split is deliberate — a swinging load must never change which cell a
 * block ends up in.
 */

export interface CraneJob {
  /** The cell to lift. */
  readonly from: Vec3;
}

type CraneState = 'idle' | 'swingToPit' | 'lowering' | 'grabbing' | 'raising' | 'swingToDrop' | 'releasing' | 'blocked';

export class Crane implements Mover {
  readonly id: MoverId;
  readonly kind = 'crane' as const;

  private readonly base: Vec3;
  private readonly topY: number;
  private hook: Vec3;
  private previousHook: Vec3;
  private state: CraneState = 'idle';
  private stateTicks = 0;
  private job: CraneJob | null = null;
  private held: CarriedBlock | null = null;
  private target: Vec3 | null = null;
  private readonly destination: Pile;
  private lifted = 0;

  constructor(id: MoverId, base: Vec3, destination: Pile) {
    this.id = id;
    this.base = base;
    this.topY = base.y + SIM.crane.restHeight;
    this.hook = vec(base.x, this.topY, base.z);
    this.previousHook = this.hook;
    this.destination = destination;
  }

  get isIdle(): boolean { return this.state === 'idle' && this.held === null; }
  get liftCount(): number { return this.lifted; }

  assign(job: CraneJob): void {
    if (!this.isIdle) return;
    this.job = job;
    this.enter('swingToPit');
  }

  private enter(state: CraneState): void {
    this.state = state;
    this.stateTicks = 0;
  }

  step(ctx: MoverContext): void {
    this.previousHook = this.hook;
    this.stateTicks++;

    switch (this.state) {
      case 'idle': {
        const rest = vec(this.base.x, this.topY, this.base.z);
        this.hook = moveToward(this.hook, rest, SIM.crane.hoistSpeed, SIM.crane.arriveEpsilon).pos;
        break;
      }

      case 'swingToPit': {
        const job = this.job;
        if (job === null) { this.enter('idle'); break; }
        const over = cellCentre(job.from);
        const moved = moveTowardXZ(this.hook, vec(over.x, this.hook.y, over.z), SIM.crane.swingSpeed, SIM.crane.arriveEpsilon);
        this.hook = moved.pos;
        if (moved.arrived) this.enter('lowering');
        break;
      }

      case 'lowering': {
        const job = this.job;
        if (job === null) { this.enter('idle'); break; }
        const down = cellCentre(job.from);
        const moved = moveToward(this.hook, vec(this.hook.x, down.y + 0.6, this.hook.z), SIM.crane.hoistSpeed, SIM.crane.arriveEpsilon);
        this.hook = moved.pos;
        if (moved.arrived) this.enter('grabbing');
        break;
      }

      case 'grabbing': {
        const job = this.job;
        if (job === null) { this.enter('idle'); break; }
        if (this.stateTicks < SIM.crane.grabTicks) break;
        const type = ctx.world.getAt(job.from);
        if (type === BlockType.Air) {
          this.job = null;
          this.enter('raising');
          break;
        }
        ctx.world.setAt(job.from, BlockType.Air);
        this.held = { id: ctx.blocks.mintId(), type, pos: this.hook };
        this.job = null;
        this.target = this.destination.nextCell();
        this.enter('raising');
        break;
      }

      case 'raising': {
        const moved = moveToward(this.hook, vec(this.hook.x, this.topY, this.hook.z), SIM.crane.hoistSpeed, SIM.crane.arriveEpsilon);
        this.hook = moved.pos;
        this.reseatHeld();
        if (!moved.arrived) break;
        if (this.held === null) { this.enter('idle'); break; }
        if (this.target === null) this.target = this.destination.nextCell();
        this.enter('swingToDrop');
        break;
      }

      case 'blocked': {
        // The rim pile is full. Park over the base still holding the load —
        // the block stays ours so the ledger stays balanced, and a crane
        // waiting at rest reads as waiting, where a crane frozen mid-swing
        // reads as a bug. Resume the moment space appears.
        const rest = vec(this.base.x, this.topY, this.base.z);
        this.hook = moveToward(this.hook, rest, SIM.crane.hoistSpeed, SIM.crane.arriveEpsilon).pos;
        this.reseatHeld();
        const freed = this.destination.nextCell();
        if (freed !== null) {
          this.target = freed;
          this.enter('swingToDrop');
        }
        break;
      }

      case 'swingToDrop': {
        const target = this.target;
        if (target === null) {
          this.target = this.destination.nextCell();
          if (this.target === null) this.enter('blocked');
          break;
        }
        const over = cellCentre(target);
        const moved = moveTowardXZ(this.hook, vec(over.x, this.hook.y, over.z), SIM.crane.swingSpeed, SIM.crane.arriveEpsilon);
        this.hook = moved.pos;
        this.reseatHeld();
        if (moved.arrived) this.enter('releasing');
        break;
      }

      case 'releasing': {
        this.reseatHeld();
        if (this.stateTicks < SIM.crane.releaseTicks) break;
        const held = this.held;
        const target = this.target;
        if (held === null || target === null) { this.enter('idle'); break; }
        // Re-check: the pile may have grown under us while we swung.
        const cell = this.destination.nextCell();
        if (cell === null) { this.enter('blocked'); break; }
        this.destination.add();
        ctx.blocks.launch(held.id, held.type, this.hook, cell, ctx.tick);
        this.held = null;
        this.target = null;
        this.lifted++;
        this.enter('idle');
        break;
      }
    }
  }

  private reseatHeld(): void {
    if (this.held !== null) this.held = { ...this.held, pos: this.hook };
  }

  carried(): readonly CarriedBlock[] {
    return this.held === null ? [] : [this.held];
  }

  snapshot(): MoverSnapshot {
    const total = this.state === 'grabbing' ? SIM.crane.grabTicks
      : this.state === 'releasing' ? SIM.crane.releaseTicks
        : 0;
    return {
      id: this.id,
      kind: this.kind,
      pos: this.base,
      facing: 'north',
      state: this.state,
      stateProgress: total > 0 ? progress(this.stateTicks, total) : 0,
      // The hook's velocity, not the base's — this is what drives the pendulum.
      velocity: sub(this.hook, this.previousHook),
      carried: this.carried(),
      parts: { hook: this.hook, top: vec(this.base.x, this.topY, this.base.z) },
    };
  }
}
