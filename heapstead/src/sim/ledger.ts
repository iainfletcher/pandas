import type { BlockType } from './blocks.ts';
import { BLOCK_NAMES, COUNTABLE_TYPES } from './blocks.ts';
import type { VoxelWorld } from './world.ts';
import type { BlockRegistry } from './registry.ts';
import type { Mover } from './mover.ts';
import { SIM } from './config.ts';

/**
 * SPEC §9 — blocks are never created and never destroyed.
 *
 * At any instant every countable block is in exactly one of three populations:
 * the grid, a mover's hands, or in flight. Their sum is constant. This class
 * is the check, and it is the best bug detector in the codebase: nearly every
 * mover state-machine error shows up first as a drift of exactly one block.
 */

export interface LedgerCounts {
  readonly grid: number;
  readonly carried: number;
  readonly inFlight: number;
  readonly total: number;
}

export class LedgerViolation extends Error {
  readonly type: BlockType;
  readonly expected: number;
  readonly actual: LedgerCounts;
  readonly tick: number;

  constructor(type: BlockType, expected: number, actual: LedgerCounts, tick: number) {
    const name = BLOCK_NAMES[type];
    const drift = actual.total - expected;
    super(
      `Ledger violation at tick ${tick}: ${name} expected ${expected}, found ${actual.total} ` +
      `(${drift > 0 ? '+' : ''}${drift}). ` +
      `grid=${actual.grid} carried=${actual.carried} inFlight=${actual.inFlight}. ` +
      `A block was ${drift > 0 ? 'duplicated' : 'lost'} — see SPEC §9.`,
    );
    this.name = 'LedgerViolation';
    this.type = type;
    this.expected = expected;
    this.actual = actual;
    this.tick = tick;
  }
}

export class Ledger {
  /**
   * The expected total per type. `total = baseline + mints − burns`; in M0 the
   * system is closed so mints and burns are both zero, but the shape is here
   * so buildings (SPEC §7) can extend it without a rewrite.
   */
  private readonly baseline = new Map<BlockType, number>();
  private readonly mints = new Map<BlockType, number>();
  private readonly burns = new Map<BlockType, number>();

  /** Snapshot the starting population. Call once, after the world is built. */
  seal(world: VoxelWorld): void {
    const counts = world.recount();
    this.baseline.clear();
    this.mints.clear();
    this.burns.clear();
    for (const t of COUNTABLE_TYPES) this.baseline.set(t, counts.get(t) ?? 0);
  }

  /** A block entering the world from outside the system (post-MVP). */
  mint(type: BlockType, n = 1): void {
    this.mints.set(type, (this.mints.get(type) ?? 0) + n);
  }

  /** A block leaving the system entirely (post-MVP). */
  burn(type: BlockType, n = 1): void {
    this.burns.set(type, (this.burns.get(type) ?? 0) + n);
  }

  expected(type: BlockType): number {
    return (this.baseline.get(type) ?? 0) + (this.mints.get(type) ?? 0) - (this.burns.get(type) ?? 0);
  }

  count(type: BlockType, world: VoxelWorld, registry: BlockRegistry, movers: readonly Mover[], useFullScan = false): LedgerCounts {
    const grid = useFullScan ? (world.recount().get(type) ?? 0) : world.count(type);
    let carried = 0;
    for (const m of movers) {
      for (const b of m.carried()) if (b.type === type) carried++;
    }
    const inFlight = registry.count(type);
    return { grid, carried, inFlight, total: grid + carried + inFlight };
  }

  /**
   * Throws on the tick that breaks conservation, not ten minutes later
   * (SPEC §9.2). `fullScan` additionally re-derives the grid counts from
   * storage, which verifies the incremental counters themselves.
   */
  assert(world: VoxelWorld, registry: BlockRegistry, movers: readonly Mover[], tick: number, fullScan = false): void {
    for (const type of COUNTABLE_TYPES) {
      const counts = this.count(type, world, registry, movers, fullScan);
      const expected = this.expected(type);
      if (counts.total !== expected) throw new LedgerViolation(type, expected, counts, tick);
    }
  }

  /** Whether this tick should pay for the full O(world) audit. */
  shouldFullAudit(tick: number): boolean {
    return SIM.ledger.fullAuditEveryTicks > 0 && tick % SIM.ledger.fullAuditEveryTicks === 0;
  }

  report(world: VoxelWorld, registry: BlockRegistry, movers: readonly Mover[]): Map<BlockType, LedgerCounts> {
    const out = new Map<BlockType, LedgerCounts>();
    for (const t of COUNTABLE_TYPES) out.set(t, this.count(t, world, registry, movers));
    return out;
  }
}
