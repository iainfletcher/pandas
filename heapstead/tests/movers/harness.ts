import { expect } from 'vitest';
import { VoxelWorld } from '../../src/sim/world.ts';
import { BlockRegistry } from '../../src/sim/registry.ts';
import { Ledger } from '../../src/sim/ledger.ts';
import { makeRng } from '../../src/sim/rng.ts';
import type { Mover, MoverContext } from '../../src/sim/mover.ts';

/**
 * A single-mover rig. Each mover gets its own ledger test (SPEC §9.2), and the
 * point of testing them in isolation is that the failure names one machine:
 * "the barrow loses a block during the tip" rather than "something, somewhere,
 * over ten minutes".
 */
export class Rig {
  readonly world: VoxelWorld;
  readonly registry = new BlockRegistry();
  readonly ledger = new Ledger();
  readonly movers: Mover[] = [];
  tick = 0;

  constructor(world: VoxelWorld) { this.world = world; }

  add<T extends Mover>(mover: T): T {
    this.movers.push(mover);
    return mover;
  }

  /** Call once, after the world is dressed and before anything moves. */
  seal(): void { this.ledger.seal(this.world); }

  private context(): MoverContext {
    return { world: this.world, blocks: this.registry, rng: makeRng(7), tick: this.tick };
  }

  /** Run n ticks, asserting conservation after every single one. */
  run(n: number): void {
    for (let i = 0; i < n; i++) {
      const ctx = this.context();
      for (const m of this.movers) m.step(ctx);
      this.registry.step(this.world, this.tick);
      this.tick++;
      this.ledger.assert(this.world, this.registry, this.movers, this.tick, true);
    }
  }

  /** Run until `done()` or the budget runs out, asserting every tick. */
  runUntil(done: () => boolean, budget = 3000): number {
    for (let i = 0; i < budget; i++) {
      if (done()) return i;
      this.run(1);
    }
    expect.fail(`condition not met within ${budget} ticks`);
  }
}

/** Flat ground filling y = 0..topY across the whole world. */
export const flatGround = (world: VoxelWorld, topY: number, type: number): void => {
  for (let y = 0; y <= topY; y++) {
    for (let z = 0; z < world.sizeZ; z++) {
      for (let x = 0; x < world.sizeX; x++) world.set(x, y, z, type as never);
    }
  }
};
