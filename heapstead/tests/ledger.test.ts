import { describe, it, expect } from 'vitest';
import { Sim } from '../src/sim/sim.ts';
import { Ledger, LedgerViolation } from '../src/sim/ledger.ts';
import { VoxelWorld } from '../src/sim/world.ts';
import { BlockRegistry } from '../src/sim/registry.ts';
import { BlockType } from '../src/sim/blocks.ts';
import { vec } from '../src/sim/vec.ts';
import type { Mover, CarriedBlock, MoverSnapshot } from '../src/sim/mover.ts';

/** A mover that exists only to hold blocks the ledger must find. */
class Hands implements Mover {
  readonly id = 99;
  readonly kind = 'barrow' as const;
  held: CarriedBlock[] = [];
  step(): void { /* inert */ }
  carried(): readonly CarriedBlock[] { return this.held; }
  snapshot(): MoverSnapshot {
    return {
      id: this.id, kind: this.kind, pos: vec(0, 0, 0), facing: 'north',
      state: 'toSource', stateProgress: 0, velocity: vec(0, 0, 0),
      carried: this.held, parts: {},
    };
  }
}

describe('Ledger (SPEC §9)', () => {
  it('counts a block in a mover’s hands, not just in the grid', () => {
    const world = new VoxelWorld(8, 8, 8);
    const registry = new BlockRegistry();
    const ledger = new Ledger();
    world.set(1, 1, 1, BlockType.Soil);
    ledger.seal(world);

    const hands = new Hands();
    // Move the block from the grid into hands: the total must not change.
    world.set(1, 1, 1, BlockType.Air);
    hands.held = [{ id: 1, type: BlockType.Soil, pos: vec(1.5, 2, 1.5) }];
    expect(() => ledger.assert(world, registry, [hands], 1)).not.toThrow();

    const counts = ledger.count(BlockType.Soil, world, registry, [hands]);
    expect(counts.grid).toBe(0);
    expect(counts.carried).toBe(1);
    expect(counts.total).toBe(1);
  });

  it('counts a block in flight', () => {
    const world = new VoxelWorld(8, 8, 8);
    const registry = new BlockRegistry();
    const ledger = new Ledger();
    world.set(1, 5, 1, BlockType.Soil);
    ledger.seal(world);

    world.set(1, 5, 1, BlockType.Air);
    registry.launch(1, BlockType.Soil, vec(1.5, 5.5, 1.5), vec(1, 0, 1), 0);
    expect(ledger.count(BlockType.Soil, world, registry, []).inFlight).toBe(1);
    expect(() => ledger.assert(world, registry, [], 1)).not.toThrow();
  });

  it('throws on the tick a block vanishes, naming the drift', () => {
    const world = new VoxelWorld(8, 8, 8);
    const ledger = new Ledger();
    world.set(1, 1, 1, BlockType.Soil);
    ledger.seal(world);
    world.set(1, 1, 1, BlockType.Air); // destroyed, held by nobody

    expect(() => ledger.assert(world, new BlockRegistry(), [], 7)).toThrow(LedgerViolation);
    try {
      ledger.assert(world, new BlockRegistry(), [], 7);
    } catch (e) {
      expect((e as Error).message).toContain('tick 7');
      expect((e as Error).message).toContain('Soil');
      expect((e as Error).message).toContain('-1');
      expect((e as Error).message).toContain('lost');
    }
  });

  it('throws when a block is duplicated', () => {
    const world = new VoxelWorld(8, 8, 8);
    const ledger = new Ledger();
    ledger.seal(world);
    world.set(1, 1, 1, BlockType.Stone); // conjured from nothing
    expect(() => ledger.assert(world, new BlockRegistry(), [], 3)).toThrow(/duplicated/);
  });

  it('catches a corrupted incremental counter under full audit', () => {
    const world = new VoxelWorld(8, 8, 8);
    const ledger = new Ledger();
    world.set(1, 1, 1, BlockType.Soil);
    ledger.seal(world);
    // Full scan re-derives the grid count from storage rather than trusting
    // the counter, which is the whole point of paying for it periodically.
    const counts = ledger.count(BlockType.Soil, world, new BlockRegistry(), [], true);
    expect(counts.grid).toBe(1);
  });

  it('extends to mints and burns without changing the invariant', () => {
    const world = new VoxelWorld(8, 8, 8);
    const ledger = new Ledger();
    ledger.seal(world);
    ledger.mint(BlockType.Stone);
    world.set(2, 2, 2, BlockType.Stone);
    expect(() => ledger.assert(world, new BlockRegistry(), [], 1)).not.toThrow();
    ledger.burn(BlockType.Stone);
    world.set(2, 2, 2, BlockType.Air);
    expect(() => ledger.assert(world, new BlockRegistry(), [], 2)).not.toThrow();
  });
});

describe('the whole diorama conserves blocks', () => {
  it('holds on every tick for 3000 ticks', () => {
    const sim = new Sim({ lanes: 1, assertLedger: true });
    // Sim.step() asserts internally; this fails loudly on the offending tick.
    expect(() => { for (let i = 0; i < 3000; i++) sim.step(); }).not.toThrow();
    expect(sim.tick).toBe(3000);
  });

  it('holds with twenty lanes running at once', () => {
    const sim = new Sim({ lanes: 20, assertLedger: true });
    expect(() => { for (let i = 0; i < 600; i++) sim.step(); }).not.toThrow();
    expect(sim.movers.length).toBe(80);
  });
});
