/**
 * SPEC §12.3 — every parameter that affects how the simulation *feels*.
 *
 * The test of whether this file is doing its job: you should be able to retune
 * the entire game's pacing without opening a single state-machine file. If you
 * find yourself typing a number into a mover, it belongs here instead.
 *
 * Units throughout: distances in cells, time in ticks. The sim runs at
 * `tickHz` (SPEC §8) and never reads wall-clock time.
 */
export const SIM = {
  /** Fixed simulation rate (SPEC §8). */
  tickHz: 10,

  world: {
    sizeX: 56,
    sizeY: 24,
    sizeZ: 40,
    /** Meshing granularity only; the sim addresses cells globally (SPEC §3). */
    chunkSize: 16,
  },

  ledger: {
    /** Assert conservation every tick in dev (SPEC §9.2). */
    everyTick: true,
    /**
     * Every N ticks, also do a full O(world) recount to verify the incremental
     * grid counters themselves, not just the transfers between populations.
     */
    fullAuditEveryTicks: 50,
  },

  /** Blocks in flight: released by one mover, not yet accepted (SPEC §9). */
  flight: {
    /** Cells per tick². Low: blocks should drift down, not plummet. */
    gravity: 0.055,
    /**
     * Set high enough never to bind on the short drops in the diorama: the
     * ballistic solve in BlockRegistry.launch assumes free fall, and a clamp
     * that actually engaged would make blocks undershoot their target.
     */
    maxFallSpeed: 2.0,
    /** Upward velocity given to a released block, so deliveries arc rather than drop. */
    lob: 0.09,
  },

  digger: {
    moveSpeed: 0.11,
    /** Ticks spent rocking against the work face before the block comes out (§11.4). */
    digTicks: 14,
    /** Ticks spent handing the block over. */
    dropTicks: 7,
    /** How close to a waypoint counts as arrived. */
    arriveEpsilon: 0.08,
  },

  chute: {
    /** Fraction of the chute's run travelled per tick. */
    speed: 0.055,
    /** Maximum blocks in the run at once; a full chute makes the digger wait. */
    capacity: 5,
    /** Minimum separation along the run, as a fraction, so blocks don't merge. */
    minSpacing: 0.16,
  },

  barrow: {
    moveSpeed: 0.13,
    /** Loaded barrows are slower — the bob reads better and it looks like effort. */
    loadedSpeedFactor: 0.82,
    loadTicks: 9,
    /** The tip is the delivery animation; the block leaves at tipReleaseAt (§11.3). */
    tipTicks: 12,
    /** Fraction through the tip at which the block actually leaves the barrow. */
    tipReleaseAt: 0.55,
    arriveEpsilon: 0.08,
  },

  crane: {
    /** Horizontal hook travel, cells per tick. Slow — the pendulum needs time (§11.1). */
    swingSpeed: 0.11,
    /** Vertical hook travel, cells per tick. */
    hoistSpeed: 0.13,
    grabTicks: 8,
    releaseTicks: 6,
    /** Height the hook returns to between jobs. */
    restHeight: 3.0,
    arriveEpsilon: 0.06,
  },

  /** Stepped pyramid piles (SPEC §5, §11.6). */
  pile: {
    /** Each successive layer is inset by this many cells on every side. */
    inset: 1,
    /** Layers stop when the footprint would go below this. */
    minFootprint: 1,
  },
} as const;
