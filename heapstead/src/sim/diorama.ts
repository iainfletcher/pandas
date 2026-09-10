import { VoxelWorld } from './world.ts';
import { BlockType } from './blocks.ts';
import type { Vec3 } from './vec.ts';
import { vec } from './vec.ts';
import { Pile, pileCapacity, type PileShape } from './pile.ts';

/**
 * The hand-built M0 diorama (SPEC §14): a plateau, a cliff, a small pit and a
 * pile area. No procedural generation — this is a stage set, built by hand,
 * whose only job is to give the four movers somewhere to be legible.
 *
 * The scene is laid out in **lanes** running along Z. One lane is the diorama;
 * the 20× debug mode (SPEC §13) is the same scene with twenty lanes, which is
 * how "does it stay calm?" gets answered without inventing a second world.
 *
 * Layout along X, west to east:
 *
 *   0..3     world edge
 *   4..23    plateau, surface y=13   ← the digger works here
 *   23       cliff face              ← the chute runs down it
 *   25..29   staging pile            ← the chute's outfall feeds it
 *   30..37   barrow route
 *   38..46   main pile               ← the barrow's destination
 *   48..52   the pit                 ← the crane lifts from here
 *   53       crane base
 *   54..61   rim pile                ← and sets blocks down here
 *
 * Pile footprints are sized so the diorama runs for tens of sim-minutes before
 * anything fills up. When a pile *does* fill, the chain backs up rather than
 * breaking: the barrow holds its load, the chute stops releasing, the digger
 * waits at the chute mouth. That is correct behaviour, not a stall to fix.
 */

export const GROUND_TOP = 5;      // highest solid y on the low ground
export const PLATEAU_TOP = 13;    // highest solid y on the plateau
export const PLATEAU_X0 = 4;
export const PLATEAU_X1 = 23;
export const PIT_X0 = 48;
export const PIT_X1 = 52;
export const PIT_FLOOR = 1;       // lowest solid y left in the pit

export interface Lane {
  readonly index: number;
  readonly z0: number;
  readonly width: number;
  /** Cells the digger is allowed to excavate. */
  readonly digArea: { x0: number; x1: number; z0: number; z1: number; floorY: number };
  readonly chutePath: readonly Vec3[];
  readonly staging: Pile;
  readonly main: Pile;
  readonly rim: Pile;
  readonly barrowSourceStand: Vec3;
  readonly barrowDestStand: Vec3;
  readonly craneBase: Vec3;
  readonly pit: { x0: number; x1: number; z0: number; z1: number };
  readonly diggerStart: Vec3;
  readonly barrowStart: Vec3;
}

export interface Scene {
  readonly world: VoxelWorld;
  readonly lanes: readonly Lane[];
}

export const WORLD_X = 62;

const laneWidth = (lanes: number): number => (lanes === 1 ? 5 : 3);

/**
 * A single-lane diorama is kept shallow on purpose. An earlier version gave it
 * the same depth as the 20-lane world, and the result was one small chain of
 * machines marooned in an acre of empty grass — technically correct, and
 * completely unreadable as a scene.
 */
const worldDepth = (lanes: number): number => (lanes === 1 ? 14 : 8 + lanes * 3);

const laneZ0 = (lanes: number, i: number): number =>
  (lanes === 1 ? Math.floor((worldDepth(1) - laneWidth(1)) / 2) : 4 + i * 3);

const shape = (x: number, y: number, z: number, w: number, d: number): PileShape =>
  ({ origin: vec(x, y, z), width: w, depth: d });

/** Fill a solid box, inclusive of both corners. */
const fill = (world: VoxelWorld, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, type: BlockType): void => {
  for (let y = y0; y <= y1; y++) {
    for (let z = z0; z <= z1; z++) {
      for (let x = x0; x <= x1; x++) {
        if (world.inBounds(x, y, z)) world.set(x, y, z, type);
      }
    }
  }
};

/**
 * Put blocks into a pile as a fraction of what it can hold.
 *
 * Proportional rather than absolute: lane width changes the pile footprints,
 * and an absolute count that looks part-built in the one-lane diorama
 * overflowed every pile in 20x mode — which started every crane and barrow
 * already blocked, with nowhere to put their load.
 */
const prefill = (world: VoxelWorld, pile: Pile, fraction: number, type: BlockType): void => {
  const count = Math.floor(pileCapacity(pile.shape) * fraction);
  for (let i = 0; i < count; i++) {
    const cell = pile.add();
    if (cell === null) return;
    world.setAt(cell, type);
  }
};

export const buildScene = (lanes = 1): Scene => {
  const width = laneWidth(lanes);
  const depth = worldDepth(lanes);
  const world = new VoxelWorld(WORLD_X, 24, depth);

  // Low ground: stone bulk, a soil layer, grass on top.
  fill(world, 0, 0, 0, WORLD_X - 1, GROUND_TOP - 2, depth - 1, BlockType.Stone);
  fill(world, 0, GROUND_TOP - 1, 0, WORLD_X - 1, GROUND_TOP - 1, depth - 1, BlockType.Soil);
  fill(world, 0, GROUND_TOP, 0, WORLD_X - 1, GROUND_TOP, depth - 1, BlockType.Grass);

  // The plateau, with its cliff face at x = PLATEAU_X1.
  fill(world, PLATEAU_X0, GROUND_TOP + 1, 0, PLATEAU_X1, PLATEAU_TOP - 3, depth - 1, BlockType.Stone);
  fill(world, PLATEAU_X0, PLATEAU_TOP - 2, 0, PLATEAU_X1, PLATEAU_TOP - 1, depth - 1, BlockType.Soil);
  fill(world, PLATEAU_X0, PLATEAU_TOP, 0, PLATEAU_X1, PLATEAU_TOP, depth - 1, BlockType.Grass);

  const built: Lane[] = [];
  for (let i = 0; i < lanes; i++) {
    const z0 = laneZ0(lanes, i);
    const z1 = z0 + width - 1;
    const zMid = z0 + (width - 1) / 2;

    // The pit: carve it out, leaving a floor for the crane to work down into.
    fill(world, PIT_X0, PIT_FLOOR + 1, z0, PIT_X1, GROUND_TOP, z1, BlockType.Air);

    const staging = new Pile(shape(25, GROUND_TOP + 1, z0, 5, width));
    const main = new Pile(shape(38, GROUND_TOP + 1, z0, 9, width));
    const rim = new Pile(shape(54, GROUND_TOP + 1, z0, 8, width));

    /*
     * The piles start part-built.
     *
     * This is a set, not a fresh save: a pile area with work already in it is
     * what a working village looks like. It is also the only way the stepped
     * pyramid (§11.6) is visible at all — a 7x5 base layer takes 35 blocks to
     * close, and at one delivery every twenty seconds an empty pile reads as a
     * flat slab for the entire length of any demo. Pre-seeded blocks are part
     * of the world before the ledger is sealed, so they are baseline, not mints.
     */
    // Stagger the fill a little per lane, so twenty lanes do not run in
    // lockstep — identical lanes are deterministic, and reading twenty
    // machines moving as one is no way to judge whether the thing feels calm.
    const stagger = (i % 3) * 0.04;
    prefill(world, staging, 0.18 + stagger, BlockType.Soil);
    prefill(world, main, 0.58 + stagger, BlockType.Soil);
    prefill(world, rim, 0.55 + stagger, BlockType.Stone);

    built.push({
      index: i,
      z0,
      width,
      digArea: { x0: 12, x1: 21, z0, z1, floorY: PLATEAU_TOP - 4 },
      chutePath: [
        vec(PLATEAU_X1 - 1.2, PLATEAU_TOP + 1.7, zMid + 0.5),
        vec(PLATEAU_X1 + 1.0, PLATEAU_TOP + 0.2, zMid + 0.5),
        vec(PLATEAU_X1 + 2.6, GROUND_TOP + 4.2, zMid + 0.5),
        vec(28.6, GROUND_TOP + 2.4, zMid + 0.5),
      ],
      staging,
      main,
      rim,
      barrowSourceStand: vec(30.5, 0, zMid + 0.5),
      barrowDestStand: vec(37.0, 0, zMid + 0.5),
      craneBase: vec(53.5, GROUND_TOP + 1, zMid + 0.5),
      pit: { x0: PIT_X0, x1: PIT_X1, z0, z1 },
      diggerStart: vec(20.5 - (i % 5) * 1.4, PLATEAU_TOP + 1, zMid + 0.5),
      barrowStart: vec(33.5 - (i % 4) * 1.2, GROUND_TOP + 1, zMid + 0.5),
    });
  }

  return { world, lanes: built };
};
