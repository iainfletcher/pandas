import { describe, it, expect } from 'vitest';
import { Rig, flatGround } from './harness.ts';
import { VoxelWorld } from '../../src/sim/world.ts';
import { BlockType } from '../../src/sim/blocks.ts';
import { vec } from '../../src/sim/vec.ts';
import { Digger } from '../../src/sim/movers/digger.ts';
import type { BlockSink } from '../../src/sim/movers/common.ts';
import type { BlockId } from '../../src/sim/registry.ts';
import type { Mover, MoverSnapshot, CarriedBlock } from '../../src/sim/mover.ts';
import type { Vec3 } from '../../src/sim/vec.ts';

/**
 * A sink that records what it is handed and can be told to refuse.
 *
 * It is also a `Mover`, and that is not incidental: a sink that swallowed
 * blocks without reporting them under `carried()` would make the ledger
 * report a loss on the tick the digger handed one over — which is exactly
 * what happened the first time this file was written. Anything that holds a
 * block must be visible to the ledger (SPEC §9).
 */
class Bucket implements BlockSink, Mover {
  readonly id = 900;
  readonly kind = 'chute' as const;
  readonly intake = vec(12.5, 6, 6.5);
  accepting = true;
  readonly received: CarriedBlock[] = [];
  canAccept(): boolean { return this.accepting; }
  accept(id: BlockId, type: BlockType, at: Vec3): void { this.received.push({ id, type, pos: at }); }
  step(): void { /* inert */ }
  carried(): readonly CarriedBlock[] { return this.received; }
  snapshot(): MoverSnapshot {
    return {
      id: this.id, kind: this.kind, pos: this.intake, facing: 'east',
      state: 'empty', stateProgress: 0, velocity: vec(0, 0, 0),
      carried: this.received, parts: {},
    };
  }
}

const setup = () => {
  const world = new VoxelWorld(20, 20, 14);
  flatGround(world, 5, BlockType.Stone);
  world.set(8, 6, 6, BlockType.Soil); // the block to dig, standing proud
  const rig = new Rig(world);
  const sink = rig.add(new Bucket());
  const digger = rig.add(new Digger(1, vec(6.5, 6, 6.5), sink));
  rig.seal();
  return { world, rig, sink, digger };
};

describe('Digger (SPEC §4, §9)', () => {
  it('conserves blocks across a full dig-and-deliver cycle', () => {
    const { rig, sink, digger } = setup();
    digger.assign({ cell: vec(8, 6, 6), stand: vec(7, 6, 6) });
    // Rig.run asserts the ledger, with a full rescan, after every tick.
    rig.runUntil(() => sink.received.length === 1);
    expect(sink.received[0]?.type).toBe(BlockType.Soil);
  });

  it('moves the block out of the grid and into its hands in one step', () => {
    const { world, rig, digger } = setup();
    digger.assign({ cell: vec(8, 6, 6), stand: vec(7, 6, 6) });
    rig.runUntil(() => digger.carried().length === 1);
    // The instant it is held, it is gone from the grid — never both, never neither.
    expect(world.get(8, 6, 6)).toBe(BlockType.Air);
    expect(digger.carried()[0]?.type).toBe(BlockType.Soil);
  });

  it('waits rather than dropping the block when the sink refuses', () => {
    const { rig, sink, digger } = setup();
    sink.accepting = false;
    digger.assign({ cell: vec(8, 6, 6), stand: vec(7, 6, 6) });
    rig.runUntil(() => digger.snapshot().state === 'unloading');
    rig.run(200);
    // Still holding it, still balanced. Backpressure, not block loss.
    expect(digger.carried().length).toBe(1);
    expect(sink.received.length).toBe(0);

    sink.accepting = true;
    rig.runUntil(() => sink.received.length === 1);
    expect(digger.carried().length).toBe(0);
  });

  it('shrugs off a job whose block has already gone', () => {
    const { world, rig, digger } = setup();
    digger.assign({ cell: vec(8, 6, 6), stand: vec(7, 6, 6) });
    rig.run(5);
    world.set(8, 6, 6, BlockType.Air); // someone else got it
    rig.seal();                        // re-baseline after the external change
    rig.runUntil(() => digger.isIdle, 500);
    expect(digger.carried().length).toBe(0);
  });

  it('reports dig progress for the rock-and-puff animation (§11.4)', () => {
    const { rig, digger } = setup();
    digger.assign({ cell: vec(8, 6, 6), stand: vec(7, 6, 6) });
    rig.runUntil(() => digger.snapshot().state === 'digging');
    const first = digger.snapshot().stateProgress;
    rig.run(5);
    expect(digger.snapshot().stateProgress).toBeGreaterThan(first);
    expect(digger.snapshot().stateProgress).toBeLessThanOrEqual(1);
  });
});
