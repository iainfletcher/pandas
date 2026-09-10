import type { Vec3, Facing } from '../vec.ts';
import { vec } from '../vec.ts';
import type { BlockId } from '../registry.ts';
import type { BlockType } from '../blocks.ts';

/**
 * Shared movement plumbing for movers that move themselves.
 *
 * Kept as free functions rather than a base class: movers differ more than
 * they resemble each other, and a shallow shared base tends to grow into the
 * place where mover-specific special cases go to hide.
 */

export interface StepResult {
  readonly pos: Vec3;
  readonly arrived: boolean;
}

/** Move `from` toward `to` by at most `speed`, stopping exactly on arrival. */
export const moveToward = (from: Vec3, to: Vec3, speed: number, epsilon: number): StepResult => {
  const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (dist <= Math.max(speed, epsilon)) return { pos: to, arrived: true };
  const k = speed / dist;
  return { pos: vec(from.x + dx * k, from.y + dy * k, from.z + dz * k), arrived: false };
};

/** Horizontal-only movement, for machines that walk on a surface. */
export const moveTowardXZ = (from: Vec3, to: Vec3, speed: number, epsilon: number): StepResult => {
  const dx = to.x - from.x, dz = to.z - from.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  if (dist <= Math.max(speed, epsilon)) return { pos: vec(to.x, from.y, to.z), arrived: true };
  const k = speed / dist;
  return { pos: vec(from.x + dx * k, from.y, from.z + dz * k), arrived: false };
};

/** The cardinal direction a velocity is mostly pointing. Keeps the old facing when still. */
export const facingOf = (velocity: Vec3, fallback: Facing): Facing => {
  const { x, z } = velocity;
  if (Math.abs(x) < 1e-6 && Math.abs(z) < 1e-6) return fallback;
  if (Math.abs(x) > Math.abs(z)) return x > 0 ? 'east' : 'west';
  return z > 0 ? 'south' : 'north';
};

/** Anything that will take a block off a mover's hands (the chute, later a building). */
export interface BlockSink {
  /** Where a mover should stand to deliver, in cell units. */
  readonly intake: Vec3;
  canAccept(): boolean;
  accept(id: BlockId, type: BlockType, at: Vec3): void;
}

/** Clamp a 0..1 progress value. */
export const progress = (ticks: number, total: number): number =>
  total <= 0 ? 1 : Math.min(1, Math.max(0, ticks / total));
