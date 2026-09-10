import { Sim } from '../src/sim/sim.ts';
const t0 = process.hrtime.bigint();
const sim = new Sim({ lanes: 20, assertLedger: true });
for (let i = 0; i < 1200; i++) sim.step();
const ms = Number(process.hrtime.bigint() - t0) / 1e6;
const piles = sim.scene.lanes.reduce((a, l) => a + l.main.count + l.rim.count + l.staging.count, 0);
console.log(`20 lanes: ${sim.movers.length} movers, 1200 ticks in ${ms.toFixed(0)}ms (${(ms/1200).toFixed(2)}ms/tick), ${piles} blocks piled, world ${sim.world.sizeX}x${sim.world.sizeY}x${sim.world.sizeZ}`);
