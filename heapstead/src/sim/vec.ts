/**
 * The sim's own vector type. SPEC §12.1: src/sim must not import three.js, so
 * it does not borrow THREE.Vector3. This is deliberately a plain immutable
 * record rather than a class with methods — it is data that crosses the
 * sim/render boundary, and plain data is easier to snapshot and compare.
 */
export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export const vec = (x: number, y: number, z: number): Vec3 => ({ x, y, z });

export const ZERO: Vec3 = vec(0, 0, 0);

export const add = (a: Vec3, b: Vec3): Vec3 => vec(a.x + b.x, a.y + b.y, a.z + b.z);
export const sub = (a: Vec3, b: Vec3): Vec3 => vec(a.x - b.x, a.y - b.y, a.z - b.z);
export const scale = (a: Vec3, s: number): Vec3 => vec(a.x * s, a.y * s, a.z * s);

export const lerp = (a: Vec3, b: Vec3, t: number): Vec3 =>
  vec(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t);

export const equals = (a: Vec3, b: Vec3): boolean => a.x === b.x && a.y === b.y && a.z === b.z;

export const length = (a: Vec3): number => Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
export const distance = (a: Vec3, b: Vec3): number => length(sub(a, b));

/** Centre of the cell at integer coordinates `c`. Cells span c..c+1 (SPEC §3). */
export const cellCentre = (c: Vec3): Vec3 => vec(c.x + 0.5, c.y + 0.5, c.z + 0.5);

/** Integer cell containing the (possibly fractional) point `p`. */
export const cellOf = (p: Vec3): Vec3 => vec(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z));

export const key = (c: Vec3): string => `${c.x},${c.y},${c.z}`;

/** The four cardinal directions a mover can face. */
export type Facing = 'north' | 'east' | 'south' | 'west';

export const FACING_VECTORS: Readonly<Record<Facing, Vec3>> = {
  north: vec(0, 0, -1),
  east: vec(1, 0, 0),
  south: vec(0, 0, 1),
  west: vec(-1, 0, 0),
};

/** Yaw in radians for a facing, for the renderer to orient a model. */
export const FACING_YAW: Readonly<Record<Facing, number>> = {
  north: 0,
  east: -Math.PI / 2,
  south: Math.PI,
  west: Math.PI / 2,
};
