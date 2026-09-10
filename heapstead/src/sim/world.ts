import { BlockType, COUNTABLE_TYPES, isSolid } from './blocks.ts';
import type { Vec3 } from './vec.ts';
import { vec } from './vec.ts';
import { SIM } from './config.ts';

/**
 * The voxel grid (SPEC §3). Bounded, one block per cell, Air included.
 *
 * Storage is a flat Uint8Array indexed x-major within a z row within a y
 * layer, which keeps a horizontal slab contiguous — the access pattern the
 * mesher and the terrain builders both use.
 */
export class VoxelWorld {
  readonly sizeX: number;
  readonly sizeY: number;
  readonly sizeZ: number;
  readonly chunkSize: number;

  private readonly cells: Uint8Array;

  /**
   * Incremental per-type counts, maintained by `set`. The ledger reads these
   * every tick (O(1)); `recount` re-derives them from scratch for the periodic
   * full audit, which is what actually catches storage corruption rather than
   * merely catching bad transfers.
   */
  private readonly counts: Int32Array;

  /** Chunk indices whose mesh is stale. The renderer drains this. */
  private readonly dirty = new Set<number>();

  constructor(
    sizeX: number = SIM.world.sizeX,
    sizeY: number = SIM.world.sizeY,
    sizeZ: number = SIM.world.sizeZ,
    chunkSize: number = SIM.world.chunkSize,
  ) {
    this.sizeX = sizeX;
    this.sizeY = sizeY;
    this.sizeZ = sizeZ;
    this.chunkSize = chunkSize;
    this.cells = new Uint8Array(sizeX * sizeY * sizeZ);
    this.counts = new Int32Array(16);
    this.counts[BlockType.Air] = sizeX * sizeY * sizeZ;
    // Everything starts dirty so the first frame meshes the whole world.
    for (let i = 0; i < this.chunkCount; i++) this.dirty.add(i);
  }

  get chunksX(): number { return Math.ceil(this.sizeX / this.chunkSize); }
  get chunksY(): number { return Math.ceil(this.sizeY / this.chunkSize); }
  get chunksZ(): number { return Math.ceil(this.sizeZ / this.chunkSize); }
  get chunkCount(): number { return this.chunksX * this.chunksY * this.chunksZ; }

  inBounds(x: number, y: number, z: number): boolean {
    return x >= 0 && y >= 0 && z >= 0 && x < this.sizeX && y < this.sizeY && z < this.sizeZ;
  }

  private index(x: number, y: number, z: number): number {
    return x + this.sizeX * (z + this.sizeZ * y);
  }

  /** Out-of-bounds reads return Air (SPEC §3), which is what makes the mesher's edge case free. */
  get(x: number, y: number, z: number): BlockType {
    if (!this.inBounds(x, y, z)) return BlockType.Air;
    return (this.cells[this.index(x, y, z)] ?? BlockType.Air) as BlockType;
  }

  getAt(c: Vec3): BlockType { return this.get(c.x, c.y, c.z); }

  isSolidAt(x: number, y: number, z: number): boolean { return isSolid(this.get(x, y, z)); }

  /** Out-of-bounds writes are a programming error, not a silent no-op (SPEC §3). */
  set(x: number, y: number, z: number, type: BlockType): void {
    if (!this.inBounds(x, y, z)) {
      throw new RangeError(`VoxelWorld.set out of bounds: (${x}, ${y}, ${z})`);
    }
    const i = this.index(x, y, z);
    const previous = (this.cells[i] ?? BlockType.Air) as BlockType;
    if (previous === type) return;
    this.cells[i] = type;
    this.counts[previous] = (this.counts[previous] ?? 0) - 1;
    this.counts[type] = (this.counts[type] ?? 0) + 1;
    this.markDirtyAround(x, y, z);
  }

  setAt(c: Vec3, type: BlockType): void { this.set(c.x, c.y, c.z, type); }

  /** O(1) count of a countable type currently in the grid (SPEC §9.1). */
  count(type: BlockType): number { return this.counts[type] ?? 0; }

  /** Full rescan. Used by the periodic ledger audit and by tests. */
  recount(): Map<BlockType, number> {
    const out = new Map<BlockType, number>();
    for (const t of COUNTABLE_TYPES) out.set(t, 0);
    for (let i = 0; i < this.cells.length; i++) {
      const t = (this.cells[i] ?? BlockType.Air) as BlockType;
      if (t === BlockType.Air) continue;
      out.set(t, (out.get(t) ?? 0) + 1);
    }
    return out;
  }

  chunkIndexOf(x: number, y: number, z: number): number {
    const cx = Math.floor(x / this.chunkSize);
    const cy = Math.floor(y / this.chunkSize);
    const cz = Math.floor(z / this.chunkSize);
    return cx + this.chunksX * (cz + this.chunksZ * cy);
  }

  chunkOrigin(chunkIndex: number): Vec3 {
    const cx = chunkIndex % this.chunksX;
    const cz = Math.floor(chunkIndex / this.chunksX) % this.chunksZ;
    const cy = Math.floor(chunkIndex / (this.chunksX * this.chunksZ));
    return vec(cx * this.chunkSize, cy * this.chunkSize, cz * this.chunkSize);
  }

  /**
   * A changed cell invalidates its own chunk and any neighbouring chunk whose
   * faces it touches — a block on a chunk seam occludes a face in the chunk
   * next door, and forgetting this is the classic source of holes in the mesh.
   */
  private markDirtyAround(x: number, y: number, z: number): void {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const nx = x + dx, ny = y + dy, nz = z + dz;
          if (!this.inBounds(nx, ny, nz)) continue;
          this.dirty.add(this.chunkIndexOf(nx, ny, nz));
        }
      }
    }
  }

  /** Returns and clears the set of chunks needing a re-mesh. */
  drainDirty(): number[] {
    const out = [...this.dirty];
    this.dirty.clear();
    return out;
  }

  markAllDirty(): void {
    for (let i = 0; i < this.chunkCount; i++) this.dirty.add(i);
  }

  /** Highest solid cell in a column, or -1 if the column is empty. */
  surfaceY(x: number, z: number): number {
    for (let y = this.sizeY - 1; y >= 0; y--) {
      if (this.isSolidAt(x, y, z)) return y;
    }
    return -1;
  }
}
