import type { BlockType } from './blocks.ts';
import type { Vec3, Facing } from './vec.ts';
import type { VoxelWorld } from './world.ts';
import type { Rng } from './rng.ts';
import type { BlockRegistry, BlockId } from './registry.ts';

/**
 * SPEC §12.2 — the one interface every machine implements.
 *
 * The director (M0) and the job board (M1) address movers only through this.
 * Adding a fifth mover should mean writing one file and registering it, not
 * touching the tick loop.
 */

export type MoverId = number;

export type MoverKind = 'digger' | 'chute' | 'barrow' | 'crane';

/**
 * A block that is not in the world grid: it is in a mover's hands, or in
 * flight between them (SPEC §9). It carries an identity so the renderer can
 * keep animating the same block across ticks, and so the ledger can count it
 * exactly once.
 */
export interface CarriedBlock {
  readonly id: BlockId;
  readonly type: BlockType;
  /** World position in cell units. Fractional — a carried block is between cells. */
  readonly pos: Vec3;
}

/**
 * Everything a mover is allowed to touch during a tick. Passed in rather than
 * reached for: this is what keeps the sim deterministic and testable, and it
 * is why `rng` exists instead of `Math.random` (SPEC §12.1).
 */
export interface MoverContext {
  readonly world: VoxelWorld;
  /** Mints and retires block identities; owns blocks in flight. */
  readonly blocks: BlockRegistry;
  /** Seeded. The only source of randomness in the sim. */
  readonly rng: Rng;
  /** The sim's only clock (SPEC §8). */
  readonly tick: number;
}

/**
 * Pure data handed to the renderer. Contains no three.js types and no
 * references into sim internals — the renderer may hold onto it across frames
 * and interpolate between two of them (SPEC §8).
 */
export interface MoverSnapshot {
  readonly id: MoverId;
  readonly kind: MoverKind;
  /** Position in cell units. */
  readonly pos: Vec3;
  readonly facing: Facing;
  /** Name of the current state-machine node, e.g. 'digging', 'returning'. */
  readonly state: string;
  /** How far through the current state, 0..1. Drives the signature motions (§11). */
  readonly stateProgress: number;
  /**
   * Velocity in cells per tick, as of this tick. The renderer uses it to drive
   * motion that responds to movement rather than to a timer — the crane's
   * pendulum (§11.1) and the barrow's bob (§11.3) both read this.
   */
  readonly velocity: Vec3;
  readonly carried: readonly CarriedBlock[];
  /**
   * Named articulation points, in cell units — a crane's `hook`, a digger's
   * `bucket`, a barrow's `tray`. Generic rather than a per-kind interface so
   * that adding a mover stays a one-file job (SPEC §12.2), and pure data so
   * the renderer can interpolate them like any other position.
   */
  readonly parts: Readonly<Record<string, Vec3>>;
  /**
   * A static structural polyline, for movers that are shaped like a run rather
   * than a point — the chute's descent. Absent for movers that are not.
   */
  readonly path?: readonly Vec3[] | undefined;
}

export interface Mover {
  readonly id: MoverId;
  readonly kind: MoverKind;

  /** Advance exactly one sim tick (SPEC §8). Must not read wall-clock time. */
  step(ctx: MoverContext): void;

  /**
   * Every countable block this mover is currently responsible for.
   *
   * The ledger (SPEC §9) calls this. It is the authoritative answer, and the
   * single most important method on this interface: a block that has left the
   * grid and is not reported here has, as far as the ledger is concerned,
   * ceased to exist — which is exactly the bug the ledger is there to catch.
   */
  carried(): readonly CarriedBlock[];

  /** Render-facing snapshot. Derived; must not mutate state. */
  snapshot(): MoverSnapshot;
}
