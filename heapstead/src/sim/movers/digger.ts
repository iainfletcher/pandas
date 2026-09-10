import type { Mover, MoverContext, MoverSnapshot, MoverId, CarriedBlock } from '../mover.ts';
import type { Vec3, Facing } from '../vec.ts';
import { vec, cellCentre, sub, FACING_VECTORS } from '../vec.ts';
import { BlockType } from '../blocks.ts';
import { SIM } from '../config.ts';
import { moveTowardXZ, facingOf, progress, type BlockSink } from './common.ts';

/**
 * The digger excavates a cell and hands the block to a sink (SPEC §4).
 *
 * States: idle → travelToFace → digging → travelToSink → unloading → idle.
 *
 * It rocks against the work face while digging and puffs dust on the stroke
 * that frees the block (§11.4) — but both of those are the renderer's job,
 * driven by `state` and `stateProgress`. What lives here is only the part that
 * decides where blocks are.
 */

export interface DiggerJob {
  /** The cell to excavate. */
  readonly cell: Vec3;
  /** Where to stand while digging it. */
  readonly stand: Vec3;
}

type DiggerState = 'idle' | 'travelToFace' | 'digging' | 'travelToSink' | 'unloading';

export class Digger implements Mover {
  readonly id: MoverId;
  readonly kind = 'digger' as const;

  private pos: Vec3;
  private previousPos: Vec3;
  private facing: Facing = 'east';
  private state: DiggerState = 'idle';
  private stateTicks = 0;
  private job: DiggerJob | null = null;
  private held: CarriedBlock | null = null;
  private readonly sink: BlockSink;

  constructor(id: MoverId, start: Vec3, sink: BlockSink) {
    this.id = id;
    this.pos = start;
    this.previousPos = start;
    this.sink = sink;
  }

  get isIdle(): boolean { return this.state === 'idle' && this.held === null; }

  /** The director (M0) or the job board (M1) hands work in through here. */
  assign(job: DiggerJob): void {
    if (!this.isIdle) return;
    this.job = job;
    this.enter('travelToFace');
  }

  private enter(state: DiggerState): void {
    this.state = state;
    this.stateTicks = 0;
  }

  /** Position of the bucket — where a carried block rides. */
  private bucket(): Vec3 {
    const f = FACING_VECTORS[this.facing];
    return vec(this.pos.x + f.x * 0.55, this.pos.y + 0.45, this.pos.z + f.z * 0.55);
  }

  step(ctx: MoverContext): void {
    this.previousPos = this.pos;
    this.stateTicks++;

    switch (this.state) {
      case 'idle':
        break;

      case 'travelToFace': {
        const job = this.job;
        if (job === null) { this.enter('idle'); break; }
        const target = cellCentre(job.stand);
        const moved = moveTowardXZ(this.pos, target, SIM.digger.moveSpeed, SIM.digger.arriveEpsilon);
        this.pos = this.settle(ctx, moved.pos);
        this.facing = facingOf(sub(this.pos, this.previousPos), this.facing);
        if (moved.arrived) {
          // Face the work, not the direction of travel.
          this.facing = facingOf(sub(cellCentre(job.cell), this.pos), this.facing);
          this.enter('digging');
        }
        break;
      }

      case 'digging': {
        const job = this.job;
        if (job === null) { this.enter('idle'); break; }
        if (this.stateTicks < SIM.digger.digTicks) break;

        const type = ctx.world.getAt(job.cell);
        if (type === BlockType.Air) {
          // Someone got there first. Not an error, just nothing to do.
          this.job = null;
          this.enter('idle');
          break;
        }
        // The block leaves the grid and enters our hands in one step: no
        // ledger check can observe it in neither population (SPEC §9).
        ctx.world.setAt(job.cell, BlockType.Air);
        this.held = { id: ctx.blocks.mintId(), type, pos: this.bucket() };
        this.job = null;
        this.enter('travelToSink');
        break;
      }

      case 'travelToSink': {
        const moved = moveTowardXZ(this.pos, this.sink.intake, SIM.digger.moveSpeed, SIM.digger.arriveEpsilon);
        this.pos = this.settle(ctx, moved.pos);
        this.facing = facingOf(sub(this.pos, this.previousPos), this.facing);
        this.reseatHeld();
        if (moved.arrived) this.enter('unloading');
        break;
      }

      case 'unloading': {
        this.reseatHeld();
        if (this.stateTicks < SIM.digger.dropTicks) break;
        const held = this.held;
        if (held === null) { this.enter('idle'); break; }
        // A full chute simply makes us wait, which is the backpressure the
        // whole chain relies on. Do not drop the block to get unstuck.
        if (!this.sink.canAccept()) break;
        this.sink.accept(held.id, held.type, held.pos);
        this.held = null;
        this.enter('idle');
        break;
      }
    }
  }

  /** Keep the digger standing on top of whatever terrain it is over. */
  private settle(ctx: MoverContext, p: Vec3): Vec3 {
    const surface = ctx.world.surfaceY(Math.floor(p.x), Math.floor(p.z));
    return vec(p.x, surface + 1, p.z);
  }

  private reseatHeld(): void {
    if (this.held !== null) this.held = { ...this.held, pos: this.bucket() };
  }

  carried(): readonly CarriedBlock[] {
    return this.held === null ? [] : [this.held];
  }

  snapshot(): MoverSnapshot {
    const total = this.state === 'digging' ? SIM.digger.digTicks
      : this.state === 'unloading' ? SIM.digger.dropTicks
        : 0;
    return {
      id: this.id,
      kind: this.kind,
      pos: this.pos,
      facing: this.facing,
      state: this.state,
      stateProgress: total > 0 ? progress(this.stateTicks, total) : 0,
      velocity: sub(this.pos, this.previousPos),
      carried: this.carried(),
      parts: { bucket: this.bucket() },
    };
  }
}
