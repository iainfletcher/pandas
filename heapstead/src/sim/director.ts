import type { Vec3 } from './vec.ts';
import { vec } from './vec.ts';
import type { VoxelWorld } from './world.ts';
import { Digger, type DiggerJob } from './movers/digger.ts';
import { Crane } from './movers/crane.ts';
import type { Lane } from './diorama.ts';

/**
 * The M0 director (SPEC §14).
 *
 * M0's behaviour is scripted, but the movers are not scripts — they are state
 * machines behind the `Mover` interface. This file is the entirety of the
 * scripting, and it is deliberately thin: all it does is answer "what should
 * this idle mover dig next?". In M1 a job board answers that question instead
 * and this file is deleted. Nothing in `movers/` should need to change.
 *
 * The chute and the barrow get no direction at all — they are driven by the
 * piles they are attached to, which is why the chain backs up gracefully
 * instead of needing a scheduler.
 */

interface DiggerAssignment {
  readonly digger: Digger;
  readonly lane: Lane;
}

interface CraneAssignment {
  readonly crane: Crane;
  readonly lane: Lane;
}

export class Director {
  private readonly diggers: DiggerAssignment[] = [];
  private readonly cranes: CraneAssignment[] = [];
  /** Cells promised to a digger this cycle, so two diggers never claim one. */
  private readonly claimed = new Set<string>();

  registerDigger(digger: Digger, lane: Lane): void {
    this.diggers.push({ digger, lane });
  }

  registerCrane(crane: Crane, lane: Lane): void {
    this.cranes.push({ crane, lane });
  }

  step(world: VoxelWorld): void {
    this.claimed.clear();
    for (const { digger, lane } of this.diggers) {
      if (!digger.isIdle) continue;
      const job = this.nextDigJob(world, lane);
      if (job !== null) digger.assign(job);
    }
    for (const { crane, lane } of this.cranes) {
      if (!crane.isIdle) continue;
      const cell = this.topmostSolidIn(world, lane.pit.x0, lane.pit.x1, lane.pit.z0, lane.pit.z1);
      if (cell !== null) crane.assign({ from: cell });
    }
  }

  /**
   * Work the excavation top-down: take the highest remaining block in the dig
   * area, so the plateau erodes in layers rather than gaining a pothole.
   * Scanning order is fixed, which keeps the sim deterministic (SPEC §8).
   */
  private nextDigJob(world: VoxelWorld, lane: Lane): DiggerJob | null {
    const { x0, x1, z0, z1, floorY } = lane.digArea;
    for (let y = world.sizeY - 1; y >= floorY; y--) {
      for (let z = z0; z <= z1; z++) {
        for (let x = x0; x <= x1; x++) {
          if (!world.isSolidAt(x, y, z)) continue;
          if (world.isSolidAt(x, y + 1, z)) continue; // buried; not reachable
          const key = `${x},${y},${z}`;
          if (this.claimed.has(key)) continue;
          const stand = this.standNextTo(world, vec(x, y, z));
          if (stand === null) continue;
          this.claimed.add(key);
          return { cell: vec(x, y, z), stand };
        }
      }
    }
    return null;
  }

  /** A neighbouring column whose surface is level with the block being dug. */
  private standNextTo(world: VoxelWorld, cell: Vec3): Vec3 | null {
    const neighbours: readonly Vec3[] = [
      vec(cell.x + 1, cell.y, cell.z),
      vec(cell.x - 1, cell.y, cell.z),
      vec(cell.x, cell.y, cell.z + 1),
      vec(cell.x, cell.y, cell.z - 1),
    ];
    for (const n of neighbours) {
      if (!world.inBounds(n.x, 0, n.z)) continue;
      if (world.surfaceY(n.x, n.z) === cell.y) return n;
    }
    return null;
  }

  private topmostSolidIn(world: VoxelWorld, x0: number, x1: number, z0: number, z1: number): Vec3 | null {
    for (let y = world.sizeY - 1; y >= 0; y--) {
      for (let z = z0; z <= z1; z++) {
        for (let x = x0; x <= x1; x++) {
          if (world.isSolidAt(x, y, z) && !world.isSolidAt(x, y + 1, z)) return vec(x, y, z);
        }
      }
    }
    return null;
  }
}
