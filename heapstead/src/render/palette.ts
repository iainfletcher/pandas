import { Color } from 'three';
import { BlockType } from '../sim/blocks.ts';

/**
 * Warm muted palette (SPEC §10). Low saturation, warm midtones, nothing pure
 * black or pure white — cozy rather than vivid.
 *
 * Colours are per block type and per face direction: the top face of a block
 * is its "lit" colour and the sides step down, which is what stops a voxel
 * scene from reading as a flat mass of one hue before the lights touch it.
 */

export interface Swatch {
  readonly top: number;
  readonly side: number;
  readonly bottom: number;
}

export const BLOCK_SWATCHES: Readonly<Record<number, Swatch>> = {
  [BlockType.Soil]: { top: 0x9b7551, side: 0x8a6746, bottom: 0x74563a },
  [BlockType.Stone]: { top: 0x94908a, side: 0x847f78, bottom: 0x6e6a64 },
  [BlockType.Grass]: { top: 0x86975c, side: 0x76854f, bottom: 0x646f42 },
};

const FALLBACK: Swatch = { top: 0xb07a5a, side: 0x9c6b4d, bottom: 0x855a40 };

export const swatchFor = (type: BlockType): Swatch => BLOCK_SWATCHES[type] ?? FALLBACK;

/** Face colour for a normal's Y component: +1 top, 0 side, -1 bottom. */
export const faceColour = (type: BlockType, normalY: number): number => {
  const s = swatchFor(type);
  if (normalY > 0.5) return s.top;
  if (normalY < -0.5) return s.bottom;
  return s.side;
};

export const SCENE = {
  /** Warm pale sky. */
  background: 0xd9d0c0,
  fog: 0xd9d0c0,
  fogNear: 70,
  fogFar: 230,
  sunColour: 0xfff2dd,
  fillColour: 0xbccadb,
  ambientColour: 0xf2e8da,
} as const;

export const MACHINE = {
  /** Painted metal, warm and desaturated, so machines read against the terrain. */
  diggerBody: 0xb4763f,
  diggerTrim: 0x6f5540,
  diggerArm: 0xd8a86a,
  diggerBucket: 0xe0c089,
  barrowBody: 0xa8683c,
  barrowTray: 0x8d5730,
  chuteTrough: 0xa98a61,
  chuteLeg: 0x8a7150,
  craneMast: 0xa2704a,
  craneJib: 0xb9865a,
  cable: 0x4b4038,
  wheel: 0x50453a,
  puff: 0xcbb79c,
} as const;

export const colourOf = (hex: number): Color => new Color(hex);
