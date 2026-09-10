import type { Mover, MoverContext, MoverSnapshot, MoverId, CarriedBlock } from '../mover.ts';
import type { Vec3, Facing } from '../vec.ts';
import { vec, cellCentre, sub, FACING_VECTORS } from '../vec.ts';
import { BlockType } from '../blocks.ts';
import { SIM } from '../config.ts';
import { moveTowardXZ, facingOf, progress } from './common.ts';
import type { Pile } from '../pile.ts';

/**
 * The barrow carries one block at a time from a source pile to a destination
 * pile (SPEC §4).
 *
 * States: toSource → loading → toPile → tipping → toSource.
 *
 * The tip *is* the delivery (§11.3): the block leaves the tray partway through
 * the animation, at `SIM.barrow.tipReleaseAt`, rather than teleporting at the
 * end. That single number is why the delivery reads as a dump rather than a
 * disappearance, which is exactly the kind of thing SPEC §12.3 wants tunable
 * without opening this file.
 */

type BarrowState = 'toSource' | 'loading' | 'toPile' | 'tipping';

export class Barrow implements Mover {
  readonly id: MoverId;
  readonly kind = 'barrow' as const;

  private pos: Vec3;
  private previousPos: Vec3;
  private facing: Facing = 'east';
  private state: BarrowState = 'toSource';
  private stateTicks = 0;
  private held: CarriedBlock | null = null;
  private hasReleased = false;

  private readonly source: Pile;
  private readonly destination: Pile;
  private readonly sourceStand: Vec3;
  private readonly destinationStand: Vec3;

  constructor(id: MoverId, start: Vec3, source: Pile, sourceStand: Vec3, destination: Pile, destinationStand: Vec3) {
    this.id = id;
    this.pos = start;
    this.previousPos = start;
    this.source = source;
    this.sourceStand = sourceStand;
    this.destination = destination;
    this.destinationStand = destinationStand;
  }

  get deliveries(): number { return this.delivered; }
  private delivered = 0;

  /** Where a carried block rides. Tips forward with the tray during a dump. */
  private tray(): Vec3 {
    const f = FACING_VECTORS[this.facing];
    const tip = this.state === 'tipping' ? progress(this.stateTicks, SIM.barrow.tipTicks) : 0;
    return vec(
      this.pos.x + f.x * (0.35 + tip * 0.45),
      this.pos.y + 0.55 - tip * 0.3,
      this.pos.z + f.z * (0.35 + tip * 0.45),
    );
  }

  private enter(state: BarrowState): void {
    this.state = state;
    this.stateTicks = 0;
  }

  private get speed(): number {
    return SIM.barrow.moveSpeed * (this.held === null ? 1 : SIM.barrow.loadedSpeedFactor);
  }

  step(ctx: MoverContext): void {
    this.previousPos = this.pos;
    this.stateTicks++;

    switch (this.state) {
      case 'toSource': {
        const moved = moveTowardXZ(this.pos, this.sourceStand, this.speed, SIM.barrow.arriveEpsilon);
        this.pos = this.settle(ctx, moved.pos);
        this.facing = facingOf(sub(this.pos, this.previousPos), this.facing);
        if (moved.arrived) this.enter('loading');
        break;
      }

      case 'loading': {
        if (this.held !== null) {
          // We came back still loaded because the destination was full. Do not
          // load again — that would overwrite the block we are holding, which
          // the ledger would (correctly) report as a loss.
          this.enter('toPile');
          break;
        }
        if (this.stateTicks < SIM.barrow.loadTicks) break;
        const cell = this.source.topCell();
        if (cell === null) {
          // Nothing to collect yet. Wait at the pile rather than setting off empty.
          this.stateTicks = 0;
          break;
        }
        const type = ctx.world.getAt(cell);
        if (type === BlockType.Air) {
          // The pile's count and the grid disagree. Resync rather than
          // inventing a block: the ledger would catch us either way, but this
          // way the failure is a visible stall, not a silent duplication.
          this.source.take();
          this.stateTicks = 0;
          break;
        }
        this.source.take();
        ctx.world.setAt(cell, BlockType.Air);
        this.held = { id: ctx.blocks.mintId(), type, pos: this.tray() };
        this.facing = facingOf(sub(this.destinationStand, this.pos), this.facing);
        this.hasReleased = false;
        this.enter('toPile');
        break;
      }

      case 'toPile': {
        const moved = moveTowardXZ(this.pos, this.destinationStand, this.speed, SIM.barrow.arriveEpsilon);
        this.pos = this.settle(ctx, moved.pos);
        this.facing = facingOf(sub(this.pos, this.previousPos), this.facing);
        this.reseatHeld();
        if (moved.arrived) {
          this.facing = facingOf(sub(cellCentre(this.destination.shape.origin), this.pos), this.facing);
          this.hasReleased = false;
          this.enter('tipping');
        }
        break;
      }

      case 'tipping': {
        this.reseatHeld();
        const t = progress(this.stateTicks, SIM.barrow.tipTicks);
        const held = this.held;

        if (!this.hasReleased && held !== null && t >= SIM.barrow.tipReleaseAt) {
          const cell = this.destination.nextCell();
          if (cell !== null) {
            this.destination.add();
            const from = this.tray();
            ctx.blocks.launch(held.id, held.type, from, cell, ctx.tick);
            this.held = null;
            this.hasReleased = true;
            this.delivered++;
          }
          // Destination full: keep the load and let the tip finish empty-handed.
          // The block stays ours, so the ledger stays balanced.
        }

        if (t >= 1) {
          this.facing = facingOf(sub(this.sourceStand, this.pos), this.facing);
          this.enter('toSource');
        }
        break;
      }
    }
  }

  private settle(ctx: MoverContext, p: Vec3): Vec3 {
    const surface = ctx.world.surfaceY(Math.floor(p.x), Math.floor(p.z));
    return vec(p.x, surface + 1, p.z);
  }

  private reseatHeld(): void {
    if (this.held !== null) this.held = { ...this.held, pos: this.tray() };
  }

  carried(): readonly CarriedBlock[] {
    return this.held === null ? [] : [this.held];
  }

  snapshot(): MoverSnapshot {
    const total = this.state === 'loading' ? SIM.barrow.loadTicks
      : this.state === 'tipping' ? SIM.barrow.tipTicks
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
      parts: { tray: this.tray() },
    };
  }
}
