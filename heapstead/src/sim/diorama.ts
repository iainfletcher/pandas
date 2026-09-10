import { VoxelWorld } from './world.ts';
import { BlockType } from './blocks.ts';
import type { Vec3 } from './vec.ts';
import { vec } from './vec.ts';
import { Pile, type PileShape } from './pile.ts';

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
 *   4..27    plateau, surface y=13   ← the digger works here
 *   27       cliff face              ← the chute runs down it
 *   28       cliff base
 *   29..33   staging pile            ← the chute's outfall feeds it
 *   34..43   barrow route
 *   44..50   main pile               ← the barrow's destination
 *   51..55   the pit                 ← the crane lifts from here
 *   56       crane base
 *   57..63   rim pile                ← and sets blocks down here
 *
 * Pile footprints are sized so the diorama runs for tens of sim-minutes before
 * anything fills up. When a pile *does* fill, the chain backs up rather than
 * breaking: the barrow holds its load, the chute stops releasing, the digger
 * waits at the chute mouth. That is correct behaviour, not a stall to fix.
 */

export const GROUND_TOP = 5;      // highest solid y on the low ground
export const PLATEAU_TOP = 13;    // highest solid y on the plateau
export const PLATEAU_X0 = 4;
export const PLATEAU_X1 = 27;
export const PIT_X0 = 51;
export const PIT_X1 = 55;
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

const laneWidth = (lanes: number): number => (lanes === 1 ? 5 : 3);

const worldDepth = (lanes: number): number => (lanes === 1 ? 40 : 8 + lanes * 3);

const laneZ0 = (lanes: number, i: number): number => (lanes === 1 ? 17 : 4 + i * 3);

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

export const buildScene = (lanes = 1): Scene => {
  const width = laneWidth(lanes);
  const depth = worldDepth(lanes);
  const world = new VoxelWorld(68, 24, depth);

  // Low ground: stone bulk, a soil layer, grass on top.
  fill(world, 0, 0, 0, 67, GROUND_TOP - 2, depth - 1, BlockType.Stone);
  fill(world, 0, GROUND_TOP - 1, 0, 67, GROUND_TOP - 1, depth - 1, BlockType.Soil);
  fill(world, 0, GROUND_TOP, 0, 67, GROUND_TOP, depth - 1, BlockType.Grass);

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

    const staging = new Pile(shape(29, GROUND_TOP + 1, z0, 5, width));
    const main = new Pile(shape(44, GROUND_TOP + 1, z0, 7, width));
    const rim = new Pile(shape(57, GROUND_TOP + 1, z0, 7, width));

    built.push({
      index: i,
      z0,
      width,
      digArea: { x0: 14, x1: 24, z0, z1, floorY: PLATEAU_TOP - 4 },
      chutePath: [
        vec(PLATEAU_X1 + 0.5, PLATEAU_TOP + 1.6, zMid + 0.5),
        vec(PLATEAU_X1 + 1.6, PLATEAU_TOP - 1.0, zMid + 0.5),
        vec(PLATEAU_X1 + 2.8, GROUND_TOP + 4.5, zMid + 0.5),
        vec(31.5, GROUND_TOP + 2.6, zMid + 0.5),
      ],
      staging,
      main,
      rim,
      barrowSourceStand: vec(34.5, 0, zMid + 0.5),
      barrowDestStand: vec(43.0, 0, zMid + 0.5),
      craneBase: vec(56.5, GROUND_TOP + 1, zMid + 0.5),
      pit: { x0: PIT_X0, x1: PIT_X1, z0, z1 },
      diggerStart: vec(22.5, PLATEAU_TOP + 1, zMid + 0.5),
      barrowStart: vec(38.5, GROUND_TOP + 1, zMid + 0.5),
    });
  }

  return { world, lanes: built };
};
