import type { Vec3 } from './vec.ts';
import { vec } from './vec.ts';
import { SIM } from './config.ts';

/**
 * Stepped pyramid piles (SPEC §5, §11.6).
 *
 * A pile fills its base layer before starting the next, and each layer is
 * inset, so a growing pile reads as a shape changing rather than a number
 * rising. Placement is a pure function of (origin, footprint, index), which is
 * what makes it deterministic and testable — and lets the barrow ask "where
 * does block N go?" without the pile keeping any state the ledger could
 * disagree with.
 */

export interface PileShape {
  /** Minimum corner of the base layer. */
  readonly origin: Vec3;
  readonly width: number;
  readonly depth: number;
}

const layerFootprint = (shape: PileShape, layer: number): { w: number; d: number; ox: number; oz: number } => {
  const inset = SIM.pile.inset * layer;
  return {
    w: shape.width - inset * 2,
    d: shape.depth - inset * 2,
    ox: shape.origin.x + inset,
    oz: shape.origin.z + inset,
  };
};

/** How many blocks a given layer holds. Zero once the pyramid has closed. */
export const layerCapacity = (shape: PileShape, layer: number): number => {
  const { w, d } = layerFootprint(shape, layer);
  if (w < SIM.pile.minFootprint || d < SIM.pile.minFootprint) return 0;
  return w * d;
};

/** Total blocks the pile can hold before it tops out. */
export const pileCapacity = (shape: PileShape): number => {
  let total = 0;
  for (let layer = 0; ; layer++) {
    const c = layerCapacity(shape, layer);
    if (c === 0) return total;
    total += c;
  }
};

/**
 * The cell the `index`-th block occupies (0-based), or null if the pile is
 * full. Row-major within a layer, layers bottom-up.
 */
export const pileCell = (shape: PileShape, index: number): Vec3 | null => {
  if (index < 0) return null;
  let remaining = index;
  for (let layer = 0; ; layer++) {
    const capacity = layerCapacity(shape, layer);
    if (capacity === 0) return null;
    if (remaining < capacity) {
      const { w, ox, oz } = layerFootprint(shape, layer);
      const dz = Math.floor(remaining / w);
      const dx = remaining % w;
      return vec(ox + dx, shape.origin.y + layer, oz + dz);
    }
    remaining -= capacity;
  }
};

/**
 * A pile that tracks how many blocks it holds. Deliberately thin: it owns a
 * count, not blocks. The blocks themselves are in the grid, where the ledger
 * can see them.
 */
export class Pile {
  readonly shape: PileShape;
  private held = 0;

  constructor(shape: PileShape) { this.shape = shape; }

  get count(): number { return this.held; }
  get isFull(): boolean { return pileCell(this.shape, this.held) === null; }
  get isEmpty(): boolean { return this.held === 0; }

  /** Where the next block will go, without committing to putting one there. */
  nextCell(): Vec3 | null { return pileCell(this.shape, this.held); }

  /** The most recently placed block — what a barrow collecting from here takes. */
  topCell(): Vec3 | null { return this.held === 0 ? null : pileCell(this.shape, this.held - 1); }

  /** Record that a block has arrived. The caller writes the grid. */
  add(): Vec3 | null {
    const cell = this.nextCell();
    if (cell === null) return null;
    this.held++;
    return cell;
  }

  /** Record that the top block has been taken. The caller clears the grid. */
  take(): Vec3 | null {
    const cell = this.topCell();
    if (cell === null) return null;
    this.held--;
    return cell;
  }

  /** Seed the count when the diorama pre-fills a pile. */
  setCount(n: number): void { this.held = n; }
}
