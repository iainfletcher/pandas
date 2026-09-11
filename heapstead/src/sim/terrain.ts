import type { VoxelWorld } from './world.ts';
import { BlockType } from './blocks.ts';

/**
 * Deterministic terrain shaping helpers for the hand-built diorama.
 *
 * These live in `src/sim` because terrain is world state — it decides where
 * movers can walk (SPEC §12.1 forbids `Math.random` here, so everything is
 * hash-driven and reproducible). Nothing in this file is procedural *level
 * generation*: it is scenery dressing around a scene whose layout is fixed by
 * hand in `diorama.ts`.
 */

/** Stable pseudo-random value in [0, 1) for an integer pair. */
export const hash2 = (x: number, z: number, salt: number): number => {
  let h = Math.imul(x, 374761393) + Math.imul(z, 668265263) + Math.imul(salt, 1274126177);
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

const smooth = (t: number): number => t * t * (3 - 2 * t);

/** Smooth value noise in [0, 1), sampled on a grid of `scale` cells. */
export const noise2 = (x: number, z: number, scale: number, salt: number): number => {
  const fx = x / scale;
  const fz = z / scale;
  const x0 = Math.floor(fx);
  const z0 = Math.floor(fz);
  const u = smooth(fx - x0);
  const v = smooth(fz - z0);
  const a = hash2(x0, z0, salt);
  const b = hash2(x0 + 1, z0, salt);
  const c = hash2(x0, z0 + 1, salt);
  const d = hash2(x0 + 1, z0 + 1, salt);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
};

/** Two octaves, for hills that are not all the same size. */
export const hills = (x: number, z: number, salt: number): number =>
  noise2(x, z, 17, salt) * 0.78 + noise2(x, z, 7, salt + 31) * 0.22;

/**
 * Carve the underside into a keel, so the diorama reads as an island on a
 * plinth rather than a rectangle sawn out of a larger world.
 *
 * The flat cut faces of a bounded world are the least attractive thing about
 * any voxel scene shown from outside itself. Stepping the lower layers inward
 * costs a few hundred blocks and removes the problem entirely.
 */
export const carveIsland = (world: VoxelWorld, taperTop: number): void => {
  for (let y = 0; y <= taperTop; y++) {
    const inset = taperTop - y + 1;
    for (let z = 0; z < world.sizeZ; z++) {
      for (let x = 0; x < world.sizeX; x++) {
        const edge = Math.min(x, z, world.sizeX - 1 - x, world.sizeZ - 1 - z);
        if (edge < inset) world.set(x, y, z, BlockType.Air);
      }
    }
  }
};

/** Raise a column's surface by `amount`, carrying the grass cap up with it. */
export const raiseColumn = (world: VoxelWorld, x: number, z: number, amount: number, cap: BlockType): void => {
  if (amount <= 0) return;
  const top = world.surfaceY(x, z);
  if (top < 0) return;
  world.set(x, top, z, BlockType.Soil);
  for (let i = 1; i < amount; i++) {
    if (top + i < world.sizeY) world.set(x, top + i, z, BlockType.Soil);
  }
  if (top + amount < world.sizeY) world.set(x, top + amount, z, cap);
};

/**
 * A tree: a trunk and a rounded canopy, both voxels like everything else.
 * Returns false if there is not room, rather than building half a tree.
 */
export const plantTree = (world: VoxelWorld, x: number, z: number, salt: number): boolean => {
  const ground = world.surfaceY(x, z);
  if (ground < 0) return false;
  if (world.get(x, ground, z) !== BlockType.Grass) return false;

  const trunk = 2 + Math.floor(hash2(x, z, salt) * 3);
  const radius = hash2(x, z, salt + 7) < 0.45 ? 1 : 2;
  const crownTop = ground + trunk + radius + 1;
  if (crownTop >= world.sizeY) return false;

  for (let i = 1; i <= trunk; i++) world.set(x, ground + i, z, BlockType.Wood);

  const centre = ground + trunk + (radius === 1 ? 0 : 1);
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dz = -radius; dz <= radius; dz++) {
      for (let dx = -radius; dx <= radius; dx++) {
        // Rounded rather than cubic, and the corners are dropped so the
        // canopy does not read as a crate balanced on a stick.
        const d = dx * dx + dy * dy * 1.6 + dz * dz;
        if (d > radius * radius + radius * 0.9) continue;
        const cx = x + dx;
        const cy = centre + dy;
        const cz = z + dz;
        if (!world.inBounds(cx, cy, cz)) continue;
        if (world.get(cx, cy, cz) !== BlockType.Air) continue;
        // Thin the outer shell so the silhouette is ragged, not moulded.
        if (d > radius * radius && hash2(cx * 7 + cy, cz, salt + 19) < 0.42) continue;
        world.set(cx, cy, cz, BlockType.Leaf);
      }
    }
  }
  return true;
};

/** A low boulder cluster, for breaking up open ground. */
export const placeBoulder = (world: VoxelWorld, x: number, z: number, salt: number): void => {
  const ground = world.surfaceY(x, z);
  if (ground < 0) return;
  const height = 1 + Math.floor(hash2(x, z, salt) * 2);
  for (let dz = 0; dz <= 1; dz++) {
    for (let dx = 0; dx <= 1; dx++) {
      if (hash2(x + dx, z + dz, salt + 3) < 0.3) continue;
      const h = Math.max(1, height - Math.floor(hash2(x + dx, z + dz, salt + 5) * 2));
      for (let i = 1; i <= h; i++) {
        if (world.inBounds(x + dx, ground + i, z + dz)) {
          world.set(x + dx, ground + i, z + dz, BlockType.Stone);
        }
      }
    }
  }
};

/** A shrub: a squat leafy lump, for detail at ground level between the trees. */
export const plantShrub = (world: VoxelWorld, x: number, z: number, salt: number): void => {
  const ground = world.surfaceY(x, z);
  if (ground < 0) return;
  if (world.get(x, ground, z) !== BlockType.Grass) return;
  for (let dz = 0; dz <= 1; dz++) {
    for (let dx = 0; dx <= 1; dx++) {
      if (hash2(x + dx, z + dz, salt) < 0.38) continue;
      const h = hash2(x + dx, z + dz, salt + 11) < 0.35 ? 2 : 1;
      for (let i = 1; i <= h; i++) {
        if (world.inBounds(x + dx, ground + i, z + dz)) {
          world.set(x + dx, ground + i, z + dz, BlockType.Leaf);
        }
      }
    }
  }
};
