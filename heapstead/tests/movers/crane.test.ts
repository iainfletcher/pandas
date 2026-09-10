import { describe, it, expect } from 'vitest';
import { Rig, flatGround } from './harness.ts';
import { VoxelWorld } from '../../src/sim/world.ts';
import { BlockType } from '../../src/sim/blocks.ts';
import { vec } from '../../src/sim/vec.ts';
import { Crane } from '../../src/sim/movers/crane.ts';
import { Pile } from '../../src/sim/pile.ts';

const setup = () => {
  const world = new VoxelWorld(24, 20, 14);
  flatGround(world, 5, BlockType.Stone);
  // A pit: a hole in the ground with blocks left in the floor to lift.
  for (let y = 2; y <= 5; y++) {
    for (let x = 8; x <= 12; x++) {
      for (let z = 5; z <= 8; z++) world.set(x, y, z, BlockType.Air);
    }
  }
  const rim = new Pile({ origin: vec(16, 6, 5), width: 3, depth: 3 });
  const rig = new Rig(world);
  const crane = rig.add(new Crane(1, vec(14.5, 6, 6.5), rim));
  rig.seal();
  return { world, rig, crane, rim };
};

describe('Crane (SPEC §4, §9)', () => {
  it('conserves a block from pit floor to rim pile', () => {
    const { world, rig, crane, rim } = setup();
    crane.assign({ from: vec(10, 1, 6) });
    rig.runUntil(() => crane.liftCount === 1 && rig.registry.inFlight.length === 0, 4000);
    expect(world.get(10, 1, 6)).toBe(BlockType.Air);
    expect(rim.count).toBe(1);
    expect(world.getAt(rim.topCell()!)).toBe(BlockType.Stone);
  });

  it('moves the block out of the grid and onto the hook in one step', () => {
    const { world, rig, crane } = setup();
    crane.assign({ from: vec(10, 1, 6) });
    rig.runUntil(() => crane.carried().length === 1, 3000);
    expect(world.get(10, 1, 6)).toBe(BlockType.Air);
  });

  it('hangs the load on the hook, not on the base', () => {
    const { rig, crane } = setup();
    crane.assign({ from: vec(10, 1, 6) });
    rig.runUntil(() => crane.carried().length === 1, 3000);
    const snap = crane.snapshot();
    const hook = snap.parts['hook']!;
    const block = snap.carried[0]!.pos;
    expect(block).toEqual(hook);
    // The pendulum is driven by hook velocity, so it must be the hook's.
    expect(snap.pos).toEqual(vec(14.5, 6, 6.5));
  });

  it('parks holding the load when the rim pile is full, instead of freezing mid-swing', () => {
    const { rig, crane, rim } = setup();
    rim.setCount(10); // 3x3 pile is full
    crane.assign({ from: vec(10, 1, 6) });
    rig.runUntil(() => crane.snapshot().state === 'blocked', 3000);
    rig.run(300);
    expect(crane.carried().length).toBe(1);
    expect(crane.liftCount).toBe(0);
  });

  it('resumes the moment space appears on the pile', () => {
    const { rig, crane, rim } = setup();
    rim.setCount(10);
    crane.assign({ from: vec(10, 1, 6) });
    rig.runUntil(() => crane.snapshot().state === 'blocked', 3000);
    rim.setCount(0);
    rig.runUntil(() => crane.liftCount === 1 && rig.registry.inFlight.length === 0, 4000);
    expect(crane.carried().length).toBe(0);
  });

  it('shrugs off a job whose block has already gone', () => {
    const { world, rig, crane } = setup();
    world.set(10, 1, 6, BlockType.Air);
    rig.seal();
    crane.assign({ from: vec(10, 1, 6) });
    rig.runUntil(() => crane.isIdle, 3000);
    expect(crane.carried().length).toBe(0);
    expect(crane.liftCount).toBe(0);
  });
});
