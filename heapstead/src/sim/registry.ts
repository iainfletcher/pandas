import type { BlockType } from './blocks.ts';
import { BlockType as BT } from './blocks.ts';
import type { Vec3 } from './vec.ts';
import { vec, cellCentre } from './vec.ts';
import type { VoxelWorld } from './world.ts';
import { SIM } from './config.ts';

export type BlockId = number;

/**
 * A block released by one mover and not yet accepted by the grid: the third
 * population in the ledger (SPEC §9). A block tumbling out of a chute mouth or
 * dropping off a tipping barrow lives here for a handful of ticks.
 */
export interface FlyingBlock {
  readonly id: BlockId;
  readonly type: BlockType;
  pos: Vec3;
  velocity: Vec3;
  /** The cell this block is falling into. It becomes grid when it gets there. */
  readonly target: Vec3;
  /** Tick it was launched, so the renderer can age it. */
  readonly launchedTick: number;
}

/** Reported for one tick after a block lands, so the renderer can squash it (§11.5). */
export interface Landing {
  readonly id: BlockId;
  readonly cell: Vec3;
  readonly speed: number;
  readonly tick: number;
}

/**
 * Mints block identities and owns blocks in flight.
 *
 * Identity exists because the ledger only needs counts but *diagnosis* needs
 * names: "block 41 is in no population" is a bug report, "Soil is one short"
 * is a puzzle. The renderer also uses ids to keep animating the same block
 * across ticks, which the chute's tumble depends on (§11.2).
 */
export class BlockRegistry {
  private nextId: BlockId = 1;
  private readonly flying: FlyingBlock[] = [];
  private landings: Landing[] = [];

  mintId(): BlockId { return this.nextId++; }

  get inFlight(): readonly FlyingBlock[] { return this.flying; }

  /** Landings that happened on the most recent tick. */
  get recentLandings(): readonly Landing[] { return this.landings; }

  /**
   * Hand a block over to gravity. The caller must already have removed it from
   * wherever it was — the block is in exactly one population at a time, and
   * the window between "removed from there" and "launched here" must not span
   * a ledger check.
   *
   * The horizontal velocity is *solved* so the block arrives over its target
   * exactly as it falls to the target's height. Guessing a toss speed instead
   * makes blocks land at the right height in the wrong place and then snap
   * sideways into their cell, which reads as teleporting.
   */
  launch(id: BlockId, type: BlockType, from: Vec3, target: Vec3, tick: number): void {
    const rest = cellCentre(target);
    const ticks = ticksToFall(from.y - rest.y);
    this.flying.push({
      id,
      type,
      pos: from,
      velocity: vec((rest.x - from.x) / ticks, SIM.flight.lob, (rest.z - from.z) / ticks),
      target,
      launchedTick: tick,
    });
  }

  /** Blocks in flight, for the ledger. */
  count(type: BlockType): number {
    let n = 0;
    for (const f of this.flying) if (f.type === type) n++;
    return n;
  }

  /**
   * Advance every flying block one tick, landing those that have arrived.
   *
   * Landing writes the block into the grid in the same step that removes it
   * from the flight list, so no ledger check can ever observe it in neither
   * population or in both.
   */
  step(world: VoxelWorld, tick: number): void {
    this.landings = [];
    for (let i = this.flying.length - 1; i >= 0; i--) {
      const f = this.flying[i];
      if (f === undefined) continue;

      const vy = Math.max(f.velocity.y - SIM.flight.gravity, -SIM.flight.maxFallSpeed);
      f.velocity = vec(f.velocity.x, vy, f.velocity.z);
      f.pos = vec(f.pos.x + f.velocity.x, f.pos.y + f.velocity.y, f.pos.z + f.velocity.z);

      const restY = cellCentre(f.target).y;
      if (f.pos.y <= restY) {
        // Arrived. Snap to the target cell and become part of the world.
        this.flying.splice(i, 1);
        if (world.getAt(f.target) === BT.Air) {
          world.setAt(f.target, f.type);
        } else {
          // The target filled up while we were falling. Put the block on the
          // first free cell above it rather than dropping it on the floor —
          // silently discarding here would be a ledger violation.
          const rescued = firstFreeAbove(world, f.target);
          if (rescued === null) {
            throw new Error(
              `BlockRegistry: block ${f.id} landed at ${f.target.x},${f.target.y},${f.target.z} ` +
              `but the column is full to the world ceiling. Refusing to destroy it (SPEC §9).`,
            );
          }
          world.setAt(rescued, f.type);
        }
        this.landings.push({ id: f.id, cell: f.target, speed: Math.abs(f.velocity.y), tick });
      }
    }
  }
}


/**
 * How many ticks a block launched with an upward `lob` takes to fall `height`
 * cells, under the sim's discrete integration (velocity is applied *after*
 * gravity each step, so the closed form is over k(k+1)/2, not k²/2).
 */
const ticksToFall = (height: number): number => {
  const g = SIM.flight.gravity;
  const u = SIM.flight.lob;
  // (g/2)k² + (g/2 − u)k − height = 0
  const b = g / 2 - u;
  const discriminant = b * b + 2 * g * height;
  if (discriminant <= 0) return 1;
  const k = (-b + Math.sqrt(discriminant)) / g;
  return Math.max(1, k);
};

const firstFreeAbove = (world: VoxelWorld, from: Vec3): Vec3 | null => {
  for (let y = from.y; y < world.sizeY; y++) {
    if (world.get(from.x, y, from.z) === BT.Air) return vec(from.x, y, from.z);
  }
  return null;
};

