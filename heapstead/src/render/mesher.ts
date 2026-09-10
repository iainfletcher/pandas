import { BufferGeometry, BufferAttribute } from 'three';
import type { VoxelWorld } from '../sim/world.ts';
import { BlockType } from '../sim/blocks.ts';
import { faceColour } from './palette.ts';
import { RENDER } from './renderConfig.ts';

/**
 * Chunked voxel meshing with face culling and per-vertex ambient occlusion
 * (SPEC §10).
 *
 * Face culling: a face between two solid cells is never emitted. On this
 * diorama that is the difference between ~2.5 million faces and ~30 thousand.
 *
 * Ambient occlusion: each face vertex is darkened by how many of the three
 * cells diagonally touching it are solid. This is what gives voxel scenes
 * their soft contact shading, and it costs nothing at runtime because it is
 * baked into vertex colours at mesh time.
 */

interface Face {
  /** Face normal. */
  readonly n: readonly [number, number, number];
  /** In-plane axes with u × v = n, so the quad winds counter-clockwise from outside. */
  readonly u: readonly [number, number, number];
  readonly v: readonly [number, number, number];
  /** Corner of the face where the u and v offsets are both zero. */
  readonly base: readonly [number, number, number];
}

const FACES: readonly Face[] = [
  { n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0], base: [1, 0, 1] },  // +X
  { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0], base: [0, 0, 0] },  // -X
  { n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1], base: [0, 1, 1] },  // +Y
  { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1], base: [0, 0, 0] },  // -Y
  { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0], base: [0, 0, 1] },   // +Z
  { n: [0, 0, -1], u: [0, 1, 0], v: [1, 0, 0], base: [0, 0, 0] },  // -Z
];

/** The four quad corners as (a, b) multiples of u and v, in winding order. */
const CORNERS: readonly (readonly [number, number])[] = [[0, 0], [1, 0], [1, 1], [0, 1]];

/**
 * Occlusion level 0..3 for one face vertex: 3 is fully open, 0 fully enclosed.
 * The `side1 && side2` case is the classic one — two edge neighbours meeting
 * fully occlude the corner regardless of what is diagonally beyond it.
 */
const vertexAo = (side1: boolean, side2: boolean, corner: boolean): number => {
  if (side1 && side2) return 0;
  return 3 - (Number(side1) + Number(side2) + Number(corner));
};

export interface ChunkMesh {
  readonly geometry: BufferGeometry;
  readonly faceCount: number;
}

/** Build the geometry for one chunk. Returns null if the chunk has no faces. */
export const meshChunk = (world: VoxelWorld, chunkIndex: number): ChunkMesh | null => {
  const origin = world.chunkOrigin(chunkIndex);
  const size = world.chunkSize;

  const positions: number[] = [];
  const normals: number[] = [];
  const colours: number[] = [];
  const indices: number[] = [];
  let vertexCount = 0;
  let faceCount = 0;

  const maxX = Math.min(origin.x + size, world.sizeX);
  const maxY = Math.min(origin.y + size, world.sizeY);
  const maxZ = Math.min(origin.z + size, world.sizeZ);

  for (let y = origin.y; y < maxY; y++) {
    for (let z = origin.z; z < maxZ; z++) {
      for (let x = origin.x; x < maxX; x++) {
        const type = world.get(x, y, z);
        if (type === BlockType.Air) continue;

        for (const face of FACES) {
          const [nx, ny, nz] = face.n;
          // Face culling: skip anything a neighbouring block already hides.
          if (world.isSolidAt(x + nx, y + ny, z + nz)) continue;

          const hex = faceColour(type, ny);
          const r = ((hex >> 16) & 0xff) / 255;
          const g = ((hex >> 8) & 0xff) / 255;
          const b = (hex & 0xff) / 255;

          const [ux, uy, uz] = face.u;
          const [vx, vy, vz] = face.v;
          const [bx, by, bz] = face.base;

          const ao: number[] = [];
          for (const [a, c] of CORNERS) {
            // Step out along the normal, then along each in-plane axis toward
            // this corner; the three cells that meet there decide the shading.
            const su = a === 0 ? -1 : 1;
            const sv = c === 0 ? -1 : 1;
            const side1 = world.isSolidAt(x + nx + ux * su, y + ny + uy * su, z + nz + uz * su);
            const side2 = world.isSolidAt(x + nx + vx * sv, y + ny + vy * sv, z + nz + vz * sv);
            const cornerSolid = world.isSolidAt(
              x + nx + ux * su + vx * sv,
              y + ny + uy * su + vy * sv,
              z + nz + uz * su + vz * sv,
            );
            ao.push(vertexAo(side1, side2, cornerSolid));
          }

          for (let i = 0; i < 4; i++) {
            const [a, c] = CORNERS[i] as readonly [number, number];
            positions.push(x + bx + ux * a + vx * c, y + by + uy * a + vy * c, z + bz + uz * a + vz * c);
            normals.push(nx, ny, nz);
            const shade = RENDER.ao.levels[ao[i] ?? 3] ?? 1;
            colours.push(r * shade, g * shade, b * shade);
          }

          // Split the quad along whichever diagonal keeps the AO gradient
          // symmetric. Without this, evenly-lit corners produce a visible
          // seam running one way across every shaded face.
          const flip = (ao[0] ?? 3) + (ao[2] ?? 3) < (ao[1] ?? 3) + (ao[3] ?? 3);
          const o = vertexCount;
          if (flip) {
            indices.push(o, o + 1, o + 3, o + 1, o + 2, o + 3);
          } else {
            indices.push(o, o + 1, o + 2, o, o + 2, o + 3);
          }
          vertexCount += 4;
          faceCount++;
        }
      }
    }
  }

  if (faceCount === 0) return null;

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3));
  geometry.setAttribute('color', new BufferAttribute(new Float32Array(colours), 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return { geometry, faceCount };
};
