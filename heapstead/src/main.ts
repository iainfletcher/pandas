import { Sim, type SimSnapshot } from './sim/sim.ts';
import { Renderer } from './render/renderer.ts';
import { RENDER } from './render/renderConfig.ts';
import { SIM } from './sim/config.ts';
import { DebugOverlay } from './debug.ts';
import { Vector3 } from 'three';

/**
 * Wiring: a fixed 10 Hz simulation with render interpolation (SPEC §8).
 *
 * The accumulator is the whole trick. Frames deliver whatever elapsed time
 * they like; the sim only ever advances in whole 100 ms ticks, and the
 * renderer draws between the last two states. Excess time is discarded rather
 * than queued, so a backgrounded tab cannot come back and run four thousand
 * ticks in one frame.
 */

const STEP_MS = 1000 / SIM.tickHz;

interface Session {
  sim: Sim;
  renderer: Renderer;
  previous: SimSnapshot;
  current: SimSnapshot;
}

const canvas = document.getElementById('view') as HTMLCanvasElement;
const overlay = new DebugOverlay();

const start = (lanes: number): Session => {
  const sim = new Sim({ seed: 1, lanes, assertLedger: import.meta.env.DEV });
  const renderer = new Renderer(sim, canvas);
  const snapshot = sim.snapshot();
  return { sim, renderer, previous: snapshot, current: snapshot };
};

let session = start(1);
let accumulator = 0;
let lastFrame = performance.now();

const frame = (now: number): void => {
  requestAnimationFrame(frame);
  const dt = Math.min((now - lastFrame) / 1000, 0.25);
  lastFrame = now;

  accumulator += dt * 1000;
  let ticks = 0;
  while (accumulator >= STEP_MS && ticks < RENDER.loop.maxTicksPerFrame) {
    session.previous = session.current;
    session.sim.step();
    session.current = session.sim.snapshot();
    accumulator -= STEP_MS;
    ticks++;
  }
  // Anything left over after the cap is dropped, not banked.
  if (accumulator >= STEP_MS) accumulator = 0;

  const alpha = Math.min(accumulator / STEP_MS, 1);
  session.renderer.render(session.previous, session.current, alpha, dt);
  overlay.update(session.sim, session.renderer, now);
};

window.addEventListener('resize', () => session.renderer.resize());
window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (key === 'd') overlay.toggle();
  if (key === 'x') {
    // Rebuild the whole scene at 20 lanes (SPEC §13): twenty of each mover,
    // to judge whether the thing stays calm.
    const lanes = session.sim.scene.lanes.length === 1 ? 20 : 1;
    session = start(lanes);
    accumulator = 0;
  }
});

/** Test hook: Playwright drives the scene from here rather than through the UI. */
declare global {
  interface Window {
    heapstead: {
      setLanes(lanes: number): void;
      runTicks(n: number): void;
      camera(distance: number, azimuth: number, elevation: number, tx?: number, ty?: number, tz?: number): void;
      overlay(visible: boolean): void;
      state(): { tick: number; movers: number; lanes: number; triangles: number };
    };
  }
}

window.heapstead = {
  setLanes: (lanes) => { session = start(lanes); accumulator = 0; },
  runTicks: (n) => {
    for (let i = 0; i < n; i++) {
      session.previous = session.current;
      session.sim.step();
      session.current = session.sim.snapshot();
    }
  },
  camera: (distance, azimuth, elevation, tx, ty, tz) => {
    const target = tx === undefined || ty === undefined || tz === undefined
      ? undefined
      : new Vector3(tx, ty, tz);
    session.renderer.orbit.set(distance, azimuth, elevation, target);
  },
  overlay: (visible) => overlay.setVisible(visible),
  state: () => ({
    tick: session.sim.tick,
    movers: session.sim.movers.length,
    lanes: session.sim.scene.lanes.length,
    triangles: session.renderer.triangleCount,
  }),
};

requestAnimationFrame(frame);
