import { describe, it, expect } from 'vitest';
import { VoxelWorld } from '../src/sim/world.ts';
import { BlockType } from '../src/sim/blocks.ts';

describe('VoxelWorld', () => {
  it('starts empty and reads Air out of bounds', () => {
    const w = new VoxelWorld(8, 8, 8);
    expect(w.get(0, 0, 0)).toBe(BlockType.Air);
    expect(w.get(-1, 0, 0)).toBe(BlockType.Air);
    expect(w.get(99, 99, 99)).toBe(BlockType.Air);
  });

  it('throws rather than silently dropping an out-of-bounds write', () => {
    const w = new VoxelWorld(8, 8, 8);
    expect(() => w.set(8, 0, 0, BlockType.Stone)).toThrow(RangeError);
  });

  it('keeps incremental counts in step with a full rescan', () => {
    const w = new VoxelWorld(16, 16, 16);
    for (let i = 0; i < 40; i++) w.set(i % 16, Math.floor(i / 16), (i * 7) % 16, BlockType.Soil);
    w.set(0, 0, 0, BlockType.Stone);
    w.set(1, 0, 7, BlockType.Air);
    expect(w.count(BlockType.Soil)).toBe(w.recount().get(BlockType.Soil));
    expect(w.count(BlockType.Stone)).toBe(w.recount().get(BlockType.Stone));
  });

  it('marks neighbouring chunks dirty, so seams do not develop holes', () => {
    const w = new VoxelWorld(32, 32, 32, 16);
    w.drainDirty();
    w.set(15, 5, 5, BlockType.Stone); // last cell of chunk 0 along x
    const dirty = w.drainDirty();
    expect(dirty).toContain(w.chunkIndexOf(15, 5, 5));
    expect(dirty).toContain(w.chunkIndexOf(16, 5, 5));
  });

  it('reports the surface of a column', () => {
    const w = new VoxelWorld(8, 8, 8);
    expect(w.surfaceY(2, 2)).toBe(-1);
    w.set(2, 0, 2, BlockType.Stone);
    w.set(2, 3, 2, BlockType.Grass);
    expect(w.surfaceY(2, 2)).toBe(3);
  });
});
