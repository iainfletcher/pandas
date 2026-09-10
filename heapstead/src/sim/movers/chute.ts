import type { Mover, MoverContext, MoverSnapshot, MoverId, CarriedBlock } from '../mover.ts';
import type { Vec3 } from '../vec.ts';
import { vec, lerp } from '../vec.ts';
import type { BlockType } from '../blocks.ts';
import type { BlockId } from '../registry.ts';
import { SIM } from '../config.ts';
import type { BlockSink } from './common.ts';
import type { Pile } from '../pile.ts';

/**
 * The chute drops blocks down a fixed run (SPEC §4). It does not move; the
 * blocks move through it.
 *
 * Blocks travel as a parameter t along a polyline. Tumble and wall-bounce
 * (§11.2) are visual: the renderer offsets around this deterministic path, so
 * arrival timing never depends on the animation.
 *
 * The chute is where backpressure lives. When its outlet pile is full it stops
 * releasing, which fills the run, which makes `canAccept` false, which makes
 * the digger wait. Nothing anywhere needs to poll for that.
 */

interface InRun {
  readonly id: BlockId;
  readonly type: BlockType;
  /** 0 at the intake mouth, 1 at the outfall. */
  t: number;
}

export class Chute implements Mover, BlockSink {
  readonly id: MoverId;
  readonly kind = 'chute' as const;

  /** Intake mouth, in cell units. Movers deliver here. */
  readonly intake: Vec3;
  private readonly runPath: readonly Vec3[];
  private readonly segmentLengths: readonly number[];
  private readonly totalLength: number;
  private readonly outlet: Pile;
  private readonly run: InRun[] = [];
  private released = 0;

  /**
   * @param path polyline from intake to outfall, in cell units.
   * @param outlet the pile the outfall feeds; it also decides where blocks land.
   */
  constructor(id: MoverId, path: readonly Vec3[], outlet: Pile) {
    if (path.length < 2) throw new Error('Chute needs at least two path points');
    this.id = id;
    this.runPath = path;
    this.outlet = outlet;
    this.intake = path[0] as Vec3;

    const lengths: number[] = [];
    let total = 0;
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1] as Vec3, b = path[i] as Vec3;
      const d = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
      lengths.push(d);
      total += d;
    }
    this.segmentLengths = lengths;
    this.totalLength = total;
  }

  get outfall(): Vec3 { return this.runPath[this.runPath.length - 1] as Vec3; }
  get occupancy(): number { return this.run.length; }
  get releasedCount(): number { return this.released; }

  /** Point at parameter t (0..1), by arc length so blocks travel at constant speed. */
  pointAt(t: number): Vec3 {
    const clamped = Math.min(1, Math.max(0, t));
    let remaining = clamped * this.totalLength;
    for (let i = 0; i < this.segmentLengths.length; i++) {
      const len = this.segmentLengths[i] ?? 0;
      if (remaining <= len || i === this.segmentLengths.length - 1) {
        const a = this.runPath[i] as Vec3;
        const b = this.runPath[i + 1] as Vec3;
        return lerp(a, b, len === 0 ? 0 : Math.min(1, remaining / len));
      }
      remaining -= len;
    }
    return this.outfall;
  }

  canAccept(): boolean {
    if (this.run.length >= SIM.chute.capacity) return false;
    // Keep the mouth clear so blocks in the run stay visually separate.
    for (const b of this.run) if (b.t < SIM.chute.minSpacing) return false;
    return true;
  }

  accept(id: BlockId, type: BlockType, _at: Vec3): void {
    if (!this.canAccept()) throw new Error(`Chute ${this.id} cannot accept right now — call canAccept first`);
    this.run.push({ id, type, t: 0 });
  }

  step(ctx: MoverContext): void {
    // Advance from the outfall end backwards, so a block that cannot leave
    // blocks the one behind it rather than being overtaken.
    for (let i = this.run.length - 1; i >= 0; i--) {
      const block = this.run[i];
      if (block === undefined) continue;

      const ahead = this.run[i - 1];
      const ceiling = ahead === undefined ? 1 : Math.min(1, ahead.t - SIM.chute.minSpacing);
      block.t = Math.min(block.t + SIM.chute.speed, Math.max(block.t, ceiling));

      if (block.t < 1) continue;

      // At the mouth. Reserve a cell on the outlet pile and hand the block to
      // gravity. If the pile is full, hold — do not destroy the block.
      const cell = this.outlet.nextCell();
      if (cell === null) continue;
      this.outlet.add();
      ctx.blocks.launch(block.id, block.type, this.outfall, cell, ctx.tick);
      this.run.splice(i, 1);
      this.released++;
    }
  }

  carried(): readonly CarriedBlock[] {
    return this.run.map((b) => ({ id: b.id, type: b.type, pos: this.pointAt(b.t) }));
  }

  snapshot(): MoverSnapshot {
    return {
      id: this.id,
      kind: this.kind,
      pos: this.intake,
      facing: 'east',
      state: this.run.length === 0 ? 'empty' : this.canAccept() ? 'flowing' : 'full',
      stateProgress: this.run.length / SIM.chute.capacity,
      velocity: vec(0, 0, 0),
      carried: this.carried(),
      parts: { intake: this.intake, outfall: this.outfall },
      path: this.runPath,
    };
  }
}
