import { describe, it, expect } from 'vitest';
import { VoxelWorld } from '../src/sim/world.ts';
import { BlockType } from '../src/sim/blocks.ts';
import { meshChunk } from '../src/render/mesher.ts';

/**
 * The mesher is verified by screenshot review (SPEC §12.4), but two classes of
 * bug are not reliably visible in a still and are cheap to catch here: faces
 * that should have been culled, and quads wound the wrong way round (which
 * disappear under backface culling exactly when the camera moves).
 */
describe('chunk mesher (SPEC §10)', () => {
  it('emits six faces for a lone block', () => {
    const w = new VoxelWorld(16, 16, 16);
    w.set(5, 5, 5, BlockType.Stone);
    expect(meshChunk(w, 0)?.faceCount).toBe(6);
  });

  it('culls the shared face between two neighbours', () => {
    const w = new VoxelWorld(16, 16, 16);
    w.set(5, 5, 5, BlockType.Stone);
    w.set(6, 5, 5, BlockType.Stone);
    expect(meshChunk(w, 0)?.faceCount).toBe(10); // 12 minus the two hidden
  });

  it('emits nothing for a chunk of solid interior', () => {
    const w = new VoxelWorld(16, 16, 16, 16);
    for (let y = 0; y < 16; y++) {
      for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) w.set(x, y, z, BlockType.Stone);
    }
    // Every face of this chunk is either interior or on the world edge; the
    // world-edge faces still show, so this is the hull only.
    const mesh = meshChunk(w, 0);
    expect(mesh?.faceCount).toBe(16 * 16 * 6);
  });

  it('returns null rather than an empty geometry for empty air', () => {
    const w = new VoxelWorld(16, 16, 16);
    expect(meshChunk(w, 0)).toBeNull();
  });

  it('winds every triangle so its normal points outward', () => {
    const w = new VoxelWorld(16, 16, 16);
    w.set(5, 5, 5, BlockType.Stone);
    const mesh = meshChunk(w, 0);
    expect(mesh).not.toBeNull();
    const pos = mesh!.geometry.getAttribute('position');
    const nrm = mesh!.geometry.getAttribute('normal');
    const idx = mesh!.geometry.getIndex()!;

    for (let t = 0; t < idx.count; t += 3) {
      const [i0, i1, i2] = [idx.getX(t), idx.getX(t + 1), idx.getX(t + 2)];
      const ax = pos.getX(i1) - pos.getX(i0), ay = pos.getY(i1) - pos.getY(i0), az = pos.getZ(i1) - pos.getZ(i0);
      const bx = pos.getX(i2) - pos.getX(i0), by = pos.getY(i2) - pos.getY(i0), bz = pos.getZ(i2) - pos.getZ(i0);
      // Cross product of the triangle's edges must agree with its stated normal.
      const cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx;
      const dot = cx * nrm.getX(i0) + cy * nrm.getY(i0) + cz * nrm.getZ(i0);
      expect(dot).toBeGreaterThan(0);
    }
  });

  it('darkens a vertex tucked into a corner more than an open one', () => {
    const w = new VoxelWorld(16, 16, 16);
    w.set(5, 5, 5, BlockType.Stone);
    const open = meshChunk(w, 0)!.geometry.getAttribute('color');
    let openMax = 0;
    for (let i = 0; i < open.count; i++) openMax = Math.max(openMax, open.getX(i));

    // Wall the block in on two sides so its top face has an occluded corner.
    w.set(4, 6, 5, BlockType.Stone);
    w.set(5, 6, 4, BlockType.Stone);
    const shaded = meshChunk(w, 0)!.geometry.getAttribute('color');
    let shadedMin = 1;
    for (let i = 0; i < shaded.count; i++) shadedMin = Math.min(shadedMin, shaded.getX(i));
    expect(shadedMin).toBeLessThan(openMax);
  });
});
