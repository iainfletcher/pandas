import { describe, it, expect } from 'vitest';
import { Rig, flatGround } from './harness.ts';
import { VoxelWorld } from '../../src/sim/world.ts';
import { BlockType } from '../../src/sim/blocks.ts';
import { vec } from '../../src/sim/vec.ts';
import { Barrow } from '../../src/sim/movers/barrow.ts';
import { Pile } from '../../src/sim/pile.ts';
import { SIM } from '../../src/sim/config.ts';

/** A source pile with `n` blocks actually present in the grid, as the real one is. */
const setup = (n = 3) => {
  const world = new VoxelWorld(30, 20, 14);
  flatGround(world, 5, BlockType.Stone);
  const source = new Pile({ origin: vec(4, 6, 5), width: 3, depth: 3 });
  const destination = new Pile({ origin: vec(20, 6, 5), width: 3, depth: 3 });
  for (let i = 0; i < n; i++) {
    const cell = source.add()!;
    world.setAt(cell, BlockType.Soil);
  }
  const rig = new Rig(world);
  const barrow = rig.add(new Barrow(1, vec(12.5, 6, 6.5), source, vec(8.5, 0, 6.5), destination, vec(17.5, 0, 6.5)));
  rig.seal();
  return { world, rig, barrow, source, destination };
};

describe('Barrow (SPEC §4, §9)', () => {
  it('conserves blocks across load, haul, tip and return', () => {
    const { rig, barrow, destination } = setup(2);
    rig.runUntil(() => barrow.deliveries === 2 && rig.registry.inFlight.length === 0, 6000);
    expect(destination.count).toBe(2);
  });

  it('takes the block off the source pile and out of the grid together', () => {
    const { world, rig, barrow, source } = setup(1);
    const top = source.topCell()!;
    rig.runUntil(() => barrow.carried().length === 1, 2000);
    expect(world.getAt(top)).toBe(BlockType.Air);
    expect(source.count).toBe(0);
  });

  it('releases the block partway through the tip, not at the end (§11.3)', () => {
    const { rig, barrow } = setup(1);
    rig.runUntil(() => barrow.snapshot().state === 'tipping', 3000);
    // Still holding at the start of the tip.
    expect(barrow.carried().length).toBe(1);
    const untilRelease = Math.ceil(SIM.barrow.tipTicks * SIM.barrow.tipReleaseAt);
    rig.run(untilRelease + 1);
    expect(barrow.carried().length).toBe(0);
    // ...and the tip is not over yet, so the dump reads as a dump.
    expect(barrow.snapshot().state).toBe('tipping');
    expect(barrow.snapshot().stateProgress).toBeLessThan(1);
  });

  it('waits at an empty source instead of setting off with nothing', () => {
    const { rig, barrow } = setup(0);
    rig.run(600);
    expect(barrow.carried().length).toBe(0);
    expect(barrow.deliveries).toBe(0);
    expect(['toSource', 'loading']).toContain(barrow.snapshot().state);
  });

  it('keeps its load when the destination is full, and never loads twice', () => {
    const { rig, barrow, destination } = setup(3);
    destination.setCount(10); // 3x3 pile is full at 10
    rig.runUntil(() => barrow.carried().length === 1, 3000);
    // Go round the whole loop again: it must not pick up a second block on
    // top of the one it is already holding, which would lose the first.
    rig.run(2000);
    expect(barrow.carried().length).toBe(1);
    expect(barrow.deliveries).toBe(0);
  });

  it('resyncs rather than inventing a block if the pile and grid disagree', () => {
    const { world, rig, barrow, source } = setup(2);
    // Something removed the top block behind the pile's back.
    world.setAt(source.topCell()!, BlockType.Air);
    rig.seal();
    rig.runUntil(() => barrow.deliveries === 1 && rig.registry.inFlight.length === 0, 6000);
    expect(source.count).toBe(0);
  });
});
