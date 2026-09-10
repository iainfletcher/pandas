import type { Mover, MoverContext, MoverSnapshot } from './mover.ts';
import type { Rng } from './rng.ts';
import { makeRng } from './rng.ts';
import { VoxelWorld } from './world.ts';
import { BlockRegistry, type FlyingBlock, type Landing } from './registry.ts';
import { Ledger } from './ledger.ts';
import { Director } from './director.ts';
import { buildScene, type Scene } from './diorama.ts';
import { Digger } from './movers/digger.ts';
import { Chute } from './movers/chute.ts';
import { Barrow } from './movers/barrow.ts';
import { Crane } from './movers/crane.ts';

export interface SimOptions {
  readonly seed?: number;
  /** Number of diorama lanes. 1 for M0; 20 for the debug spawn (SPEC §13). */
  readonly lanes?: number;
  /** Assert conservation every tick (SPEC §9.2). On in dev, off in production. */
  readonly assertLedger?: boolean;
}

/** Everything the renderer needs for one frame. Pure data; no sim internals. */
export interface SimSnapshot {
  readonly tick: number;
  readonly movers: readonly MoverSnapshot[];
  readonly flying: readonly FlyingBlock[];
  readonly landings: readonly Landing[];
}

/**
 * Owns the world, the movers and the clock (SPEC §8).
 *
 * Headless by construction: nothing in here or anything it imports touches the
 * DOM, three.js, `Math.random` or the wall clock, which is enforced by lint
 * (SPEC §12.1) rather than by good intentions. That is what lets the whole
 * simulation — including every mover's full cycle — be tested in Node.
 */
export class Sim {
  readonly world: VoxelWorld;
  readonly scene: Scene;
  readonly registry = new BlockRegistry();
  readonly ledger = new Ledger();
  readonly movers: Mover[] = [];

  private readonly director = new Director();
  private readonly rng: Rng;
  private readonly assertLedger: boolean;
  private tickCount = 0;

  constructor(options: SimOptions = {}) {
    const { seed = 1, lanes = 1, assertLedger = true } = options;
    this.rng = makeRng(seed);
    this.assertLedger = assertLedger;

    this.scene = buildScene(lanes);
    this.world = this.scene.world;

    let nextId = 1;
    for (const lane of this.scene.lanes) {
      // Order matters only for id stability, not for behaviour: the chute must
      // exist before the digger, because the digger delivers into it.
      const chute = new Chute(nextId++, lane.chutePath, lane.staging);
      const digger = new Digger(nextId++, lane.diggerStart, chute);
      const barrow = new Barrow(
        nextId++,
        lane.barrowStart,
        lane.staging,
        lane.barrowSourceStand,
        lane.main,
        lane.barrowDestStand,
      );
      const crane = new Crane(nextId++, lane.craneBase, lane.rim);

      this.movers.push(chute, digger, barrow, crane);
      this.director.registerDigger(digger, lane);
      this.director.registerCrane(crane, lane);
    }

    // Seal after the world is built and before anything moves, so the
    // baseline is the diorama's own block count (SPEC §9).
    this.ledger.seal(this.world);
  }

  get tick(): number { return this.tickCount; }

  private context(): MoverContext {
    return { world: this.world, blocks: this.registry, rng: this.rng, tick: this.tickCount };
  }

  /** Advance exactly one tick. */
  step(): void {
    const ctx = this.context();
    this.director.step(this.world);
    for (const mover of this.movers) mover.step(ctx);
    this.registry.step(this.world, this.tickCount);
    this.tickCount++;

    if (this.assertLedger) {
      this.ledger.assert(
        this.world,
        this.registry,
        this.movers,
        this.tickCount,
        this.ledger.shouldFullAudit(this.tickCount),
      );
    }
  }

  snapshot(): SimSnapshot {
    return {
      tick: this.tickCount,
      movers: this.movers.map((m) => m.snapshot()),
      flying: this.registry.inFlight.map((f) => ({ ...f })),
      landings: this.registry.recentLandings.map((l) => ({ ...l })),
    };
  }
}
