import { Sim } from '../src/sim/sim.ts';
import { COUNTABLE_TYPES, BLOCK_NAMES } from '../src/sim/blocks.ts';

const sim = new Sim({ lanes: 1, assertLedger: true });
const lane = sim.scene.lanes[0]!;
const report = () => {
  const counts = COUNTABLE_TYPES.map((t) => `${BLOCK_NAMES[t]}=${sim.ledger.count(t, sim.world, sim.registry, sim.movers).total}`).join(' ');
  const states = sim.movers.map((m) => `${m.kind}:${m.snapshot().state}`).join(' ');
  console.log(`t=${String(sim.tick).padStart(5)} ${counts} | staging=${lane.staging.count} main=${lane.main.count} rim=${lane.rim.count} | flying=${sim.registry.inFlight.length} | ${states}`);
};

report();
for (let i = 0; i < 6000; i++) {
  sim.step();
  if (sim.tick % 500 === 0) report();
}
report();
console.log('done, no ledger violation in 6000 ticks (10 sim-minutes)');
