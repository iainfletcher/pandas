import type { Sim } from './sim/sim.ts';
import type { Renderer } from './render/renderer.ts';
import { COUNTABLE_TYPES, BLOCK_NAMES } from './sim/blocks.ts';

/**
 * Debug overlay and the 20x spawn toggle (SPEC §13).
 *
 * The 20x toggle is not a stress test for its own sake — it is how the
 * "calm" pillar (SPEC §2, §11.1) gets judged. If twenty of a mover on screen
 * reads as frantic, the feel parameters are wrong.
 */
export class DebugOverlay {
  readonly element: HTMLDivElement;
  private visible = true;
  private frames = 0;
  private fps = 0;
  private lastSampled = 0;

  constructor() {
    this.element = document.createElement('div');
    this.element.id = 'debug-overlay';
    document.body.appendChild(this.element);
  }

  toggle(): void { this.setVisible(!this.visible); }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.element.style.display = visible ? 'block' : 'none';
  }

  update(sim: Sim, renderer: Renderer, now: number): void {
    this.frames++;
    if (now - this.lastSampled >= 500) {
      this.fps = Math.round((this.frames * 1000) / (now - this.lastSampled));
      this.frames = 0;
      this.lastSampled = now;
    }
    if (!this.visible) return;

    const report = sim.ledger.report(sim.world, sim.registry, sim.movers);
    const ledgerRows = COUNTABLE_TYPES.map((type) => {
      const c = report.get(type);
      if (c === undefined) return '';
      const expected = sim.ledger.expected(type);
      const ok = c.total === expected ? 'ok' : 'DRIFT';
      return `  ${BLOCK_NAMES[type].padEnd(6)} ${String(c.total).padStart(6)}  `
        + `grid ${String(c.grid).padStart(6)}  hands ${String(c.carried).padStart(3)}  `
        + `air ${String(c.inFlight).padStart(3)}  [${ok}]`;
    }).join('\n');

    const byKind = new Map<string, Map<string, number>>();
    for (const mover of sim.movers) {
      const snap = mover.snapshot();
      const states = byKind.get(snap.kind) ?? new Map<string, number>();
      states.set(snap.state, (states.get(snap.state) ?? 0) + 1);
      byKind.set(snap.kind, states);
    }
    const moverRows = [...byKind.entries()]
      .map(([kind, states]) => {
        const detail = [...states.entries()].map(([s, n]) => (n > 1 ? `${s}x${n}` : s)).join(' ');
        return `  ${kind.padEnd(7)} ${detail}`;
      })
      .join('\n');

    const lanes = sim.scene.lanes;
    const piled = lanes.reduce((a, l) => a + l.staging.count + l.main.count + l.rim.count, 0);

    this.element.textContent =
      `HEAPSTEAD  M0 diorama\n`
      + `tick ${sim.tick}   ${this.fps} fps   ${sim.movers.length} movers   ${lanes.length} lane(s)\n`
      + `chunks ${renderer.chunkMeshCount}   loose blocks ${renderer.looseBlockCount}   tris ${renderer.triangleCount}\n`
      + `\nLEDGER (SPEC §9)\n${ledgerRows}\n`
      + `\nMOVERS\n${moverRows}\n`
      + `\npiled ${piled}\n`
      + `\n[D] overlay   [X] 20x spawn   drag orbit   shift-drag pan   scroll zoom`;
  }
}
