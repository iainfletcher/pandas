import { describe, it, expect } from 'vitest';
import { Rig, flatGround } from './harness.ts';
import { VoxelWorld } from '../../src/sim/world.ts';
import { BlockType } from '../../src/sim/blocks.ts';
import { vec } from '../../src/sim/vec.ts';
import { Chute } from '../../src/sim/movers/chute.ts';
import { Pile } from '../../src/sim/pile.ts';
import { SIM } from '../../src/sim/config.ts';

const setup = () => {
  const world = new VoxelWorld(20, 20, 14);
  flatGround(world, 5, BlockType.Stone);
  const rig = new Rig(world);
  const outlet = new Pile({ origin: vec(10, 6, 5), width: 3, depth: 3 });
  const chute = rig.add(new Chute(1, [
    vec(4.5, 14.5, 6.5),
    vec(7.0, 10.0, 6.5),
    vec(11.0, 7.5, 6.5),
  ], outlet));
  rig.seal();
  return { world, rig, chute, outlet };
};

describe('Chute (SPEC §4, §9)', () => {
  it('conserves a block from mouth to pile', () => {
    const { rig, chute, outlet } = setup();
    chute.accept(1, BlockType.Soil, chute.intake);
    // A block accepted from nowhere is a mint, as far as the ledger is concerned.
    rig.ledger.mint(BlockType.Soil);
    // `count` rises when the cell is *reserved*; the block is still in flight
    // for a few ticks after that. Wait for it to actually be in the grid.
    rig.runUntil(() => outlet.count === 1 && rig.registry.inFlight.length === 0);
    expect(chute.carried().length).toBe(0);
    expect(rig.world.getAt(outlet.topCell()!)).toBe(BlockType.Soil);
  });

  it('travels the run at a constant, deterministic rate', () => {
    const { chute } = setup();
    expect(chute.pointAt(0)).toEqual(chute.intake);
    expect(chute.pointAt(1)).toEqual(chute.outfall);

    // Parameterised by arc length, so a block does not surge or stall at a
    // bend. Sampled within a single straight segment, because a chord that
    // spans a corner is legitimately shorter than the arc it cuts across.
    const uniformWithin = (from: number, to: number): void => {
      const steps = 20;
      const dt = (to - from) / steps;
      const lengths: number[] = [];
      for (let i = 0; i < steps; i++) {
        const p = chute.pointAt(from + i * dt);
        const q = chute.pointAt(from + (i + 1) * dt);
        lengths.push(Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z));
      }
      const first = lengths[0]!;
      for (const l of lengths) expect(Math.abs(l - first)).toBeLessThan(1e-6);
    };
    uniformWithin(0.0, 0.45); // inside the first segment
    uniformWithin(0.6, 1.0);  // inside the second
  });

  it('refuses blocks when full, which is what makes the digger wait', () => {
    const { rig, chute, outlet } = setup();
    // Block the outfall, so the run fills instead of draining. This is the
    // real path to a full chute: the pile below it stopped taking blocks.
    outlet.setCount(10);

    const clearMouth = Math.ceil(SIM.chute.minSpacing / SIM.chute.speed) + 1;
    for (let i = 0; i < SIM.chute.capacity; i++) {
      expect(chute.canAccept()).toBe(true);
      chute.accept(i + 1, BlockType.Soil, chute.intake);
      rig.ledger.mint(BlockType.Soil);
      rig.run(clearMouth);
    }
    expect(chute.occupancy).toBe(SIM.chute.capacity);
    expect(chute.canAccept()).toBe(false);
    expect(() => chute.accept(99, BlockType.Soil, chute.intake)).toThrow();
  });

  it('keeps blocks separated along the run', () => {
    const { rig, chute } = setup();
    for (let i = 0; i < 3; i++) {
      if (!chute.canAccept()) break;
      chute.accept(i + 1, BlockType.Soil, chute.intake);
      rig.ledger.mint(BlockType.Soil);
      rig.run(4);
    }
    const held = chute.carried();
    for (let i = 1; i < held.length; i++) {
      const a = held[i - 1]!.pos, b = held[i]!.pos;
      expect(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)).toBeGreaterThan(0.1);
    }
  });

  it('holds its load rather than destroying it when the outlet is full', () => {
    const { rig, chute, outlet } = setup();
    outlet.setCount(10); // 3x3 pile: 9 + 1 = full
    expect(outlet.nextCell()).toBeNull();
    chute.accept(1, BlockType.Soil, chute.intake);
    rig.ledger.mint(BlockType.Soil);
    rig.run(300);
    expect(chute.carried().length).toBe(1); // still ours, still balanced
    expect(chute.releasedCount).toBe(0);
  });
});
