import { BoxGeometry, Mesh, MeshLambertMaterial, Group, Color, SRGBColorSpace, type Material } from 'three';
import { BlockType } from '../sim/blocks.ts';
import { swatchFor } from './palette.ts';
import { RENDER } from './renderConfig.ts';

/**
 * Loose blocks: the ones in a mover's hands, in flight, or mid-landing-squash.
 *
 * Slightly under a full cell so a loose block never z-fights with the world
 * mesh if a landing and a re-mesh ever race. Two percent is invisible; a
 * flickering block is not.
 */
const BLOCK_SIZE = 0.98;

const geometry = new BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);

const materials = new Map<BlockType, Material>();

export const blockMaterial = (type: BlockType): Material => {
  const existing = materials.get(type);
  if (existing !== undefined) return existing;
  const swatch = swatchFor(type);
  const material = new MeshLambertMaterial({ color: new Color().setHex(swatch.side, SRGBColorSpace) });
  materials.set(type, material);
  return material;
};

export const makeBlockMesh = (type: BlockType): Mesh => {
  const mesh = new Mesh(geometry, blockMaterial(type));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
};

/**
 * A pool of block meshes keyed by block id, so the same mesh follows the same
 * block across frames — which is what lets a block tumble continuously down a
 * chute (§11.2) rather than resetting its rotation every tick.
 */
export class BlockPool {
  readonly group = new Group();
  private readonly live = new Map<number, Mesh>();
  private readonly seen = new Set<number>();

  beginFrame(): void { this.seen.clear(); }

  /** Get (or create) the mesh for a block, marking it alive this frame. */
  acquire(id: number, type: BlockType): Mesh {
    this.seen.add(id);
    const existing = this.live.get(id);
    if (existing !== undefined) return existing;
    const mesh = makeBlockMesh(type);
    this.live.set(id, mesh);
    this.group.add(mesh);
    return mesh;
  }

  /** Drop meshes for blocks that no longer exist as loose blocks. */
  endFrame(): void {
    for (const [id, mesh] of this.live) {
      if (this.seen.has(id)) continue;
      this.group.remove(mesh);
      this.live.delete(id);
    }
  }

  get size(): number { return this.live.size; }
}

/**
 * The landing squash (SPEC §11.5): a block that lands squashes to 95% height
 * and springs back.
 *
 * A block belongs to the chunk mesh the instant it lands, and a chunk mesh
 * cannot squash one cell of itself — so the renderer holds that chunk's
 * re-mesh for the length of the squash and plays it on a loose mesh instead.
 * The hold is a quarter of a second and is why this class exists at all.
 */
export interface Squash {
  readonly id: number;
  readonly type: BlockType;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly chunk: number;
  /** Seconds elapsed. */
  age: number;
}

/** 1 at impact, decaying to 0, with a single overshoot so it springs rather than sags. */
export const squashCurve = (t: number): number => {
  if (t >= 1) return 0;
  return Math.cos(t * Math.PI * 1.5) * (1 - t) * (1 - t);
};

export const squashScale = (t: number): number => 1 - RENDER.motion.landing.squash * squashCurve(t);
