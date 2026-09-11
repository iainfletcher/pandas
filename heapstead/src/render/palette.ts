import { Color, SRGBColorSpace } from 'three';
import { BlockType } from '../sim/blocks.ts';

/**
 * Warm muted palette (SPEC §10). Low saturation, warm midtones, nothing pure
 * black or pure white — cozy rather than vivid.
 *
 * Colours are per block type and per face direction: the top face of a block
 * is its "lit" colour and the sides step down, which is what stops a voxel
 * scene from reading as a flat mass of one hue before the lights touch it.
 *
 * Every hex here is authored in **sRGB**, the space you would pick it in. The
 * renderer works in linear light, so `linearOf` converts on the way through
 * and the mesher writes linear vertex colours. Writing sRGB bytes straight
 * into a vertex colour buffer — which this file used to do — leaves everything
 * muddy and over-dark, and the error is easy to mistake for bad colour choices.
 */

export interface Swatch {
  readonly top: number;
  readonly side: number;
  readonly bottom: number;
  /**
   * How much this material mottles block-to-block, 0..1. Organic surfaces get
   * more; cut stone and timber get less.
   */
  readonly grain: number;
}

export const BLOCK_SWATCHES: Readonly<Record<number, Swatch>> = {
  [BlockType.Soil]: { top: 0x9c7a5a, side: 0x86694c, bottom: 0x6b543c, grain: 0.05 },
  [BlockType.Stone]: { top: 0x9d9890, side: 0x87827a, bottom: 0x6c6760, grain: 0.055 },
  [BlockType.Grass]: { top: 0x8a9a68, side: 0x6f7d52, bottom: 0x56603f, grain: 0.036 },
  [BlockType.Path]: { top: 0xa89b7e, side: 0x91866b, bottom: 0x746b55, grain: 0.028 },
  [BlockType.Wood]: { top: 0x97795a, side: 0x82684c, bottom: 0x6a543c, grain: 0.022 },
  [BlockType.Leaf]: { top: 0x839460, side: 0x6f8050, bottom: 0x5b6942, grain: 0.055 },
};

const FALLBACK: Swatch = { top: 0xb07a5a, side: 0x9c6b4d, bottom: 0x855a40, grain: 0.05 };

export const swatchFor = (type: BlockType): Swatch => BLOCK_SWATCHES[type] ?? FALLBACK;

/** Face colour for a normal's Y component: +1 top, 0 side, -1 bottom. */
export const faceColour = (type: BlockType, normalY: number): number => {
  const s = swatchFor(type);
  if (normalY > 0.5) return s.top;
  if (normalY < -0.5) return s.bottom;
  return s.side;
};

const linearCache = new Map<number, Color>();

/** An sRGB hex as a linear-light Color, cached — the mesher asks constantly. */
export const linearOf = (hex: number): Color => {
  const existing = linearCache.get(hex);
  if (existing !== undefined) return existing;
  const colour = new Color().setHex(hex, SRGBColorSpace);
  linearCache.set(hex, colour);
  return colour;
};

export const SCENE = {
  /** Sky gradient, horizon to zenith. Warm low, cool high. */
  skyHorizon: 0xe9e1d3,
  skyMid: 0xd3d5d1,
  skyZenith: 0x9ab4c6,
  /** Fog sits on the horizon colour so distance dissolves into sky, not into a wall. */
  fog: 0xe2dcd0,
  fogNear: 55,
  fogFar: 210,
  sunColour: 0xfdf2e0,
  /** Hemisphere: warm light from the sky, bounced earth from below. */
  hemiSky: 0xcdd9e2,
  hemiGround: 0x7d6b54,
  fillColour: 0xb0bfcc,
  groundShadow: 0x4a4034,
} as const;

export const MACHINE = {
  diggerBody: 0xc07c3f,
  diggerTrim: 0x6b503a,
  diggerArm: 0xdcac6c,
  diggerBucket: 0xe6c78d,
  diggerCab: 0x4f6b74,
  barrowBody: 0xb26c38,
  barrowTray: 0x8f552c,
  chuteTrough: 0xb08a5c,
  chuteLeg: 0x8a7150,
  craneMast: 0xb2764a,
  craneJib: 0xc79361,
  craneCab: 0x4f6b74,
  cable: 0x40382f,
  wheel: 0x4a3f35,
  metal: 0x8d9298,
  puff: 0xd8c7ab,
} as const;
