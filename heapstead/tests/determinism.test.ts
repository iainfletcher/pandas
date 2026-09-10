import { describe, it, expect } from 'vitest';
import { Sim } from '../src/sim/sim.ts';
import { makeRng } from '../src/sim/rng.ts';
import { COUNTABLE_TYPES } from '../src/sim/blocks.ts';

const fingerprint = (sim: Sim): string => {
  const grid = COUNTABLE_TYPES.map((t) => sim.world.count(t)).join(',');
  const movers = sim.movers.map((m) => {
    const s = m.snapshot();
    return `${s.kind}:${s.state}:${s.pos.x.toFixed(6)},${s.pos.y.toFixed(6)},${s.pos.z.toFixed(6)}:${s.carried.length}`;
  }).join('|');
  const flying = sim.registry.inFlight.map((f) => `${f.id}@${f.pos.y.toFixed(6)}`).join(',');
  return `${grid}#${movers}#${flying}`;
};

describe('determinism (SPEC §8)', () => {
  it('produces identical state from the same seed', () => {
    const a = new Sim({ seed: 42 });
    const b = new Sim({ seed: 42 });
    for (let i = 0; i < 800; i++) { a.step(); b.step(); }
    expect(fingerprint(a)).toBe(fingerprint(b));
  });

  it('reaches the same state whether stepped in one run or two', () => {
    const a = new Sim({ seed: 7 });
    for (let i = 0; i < 500; i++) a.step();
    const b = new Sim({ seed: 7 });
    for (let i = 0; i < 200; i++) b.step();
    for (let i = 0; i < 300; i++) b.step();
    expect(fingerprint(a)).toBe(fingerprint(b));
  });

  it('has a seeded rng that is reproducible and stream-independent', () => {
    const a = makeRng(99);
    const b = makeRng(99);
    expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()]);
    // Forks must not disturb the parent stream, or one mover's draws would
    // shift another's and determinism would depend on iteration order.
    const parent = makeRng(5);
    const before = parent.next();
    const forked = makeRng(5);
    forked.fork(1).next();
    expect(forked.next()).toBe(before);
  });

  it('does not depend on wall-clock time', () => {
    const a = new Sim({ seed: 3 });
    for (let i = 0; i < 300; i++) a.step();
    const first = fingerprint(a);
    const b = new Sim({ seed: 3 });
    const busy = Array.from({ length: 50000 }, (_, i) => i).reduce((x, y) => x + y, 0);
    expect(busy).toBeGreaterThan(0);
    for (let i = 0; i < 300; i++) b.step();
    expect(fingerprint(b)).toBe(first);
  });
});
