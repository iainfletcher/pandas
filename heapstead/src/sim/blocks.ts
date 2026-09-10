/**
 * Block types (SPEC §3.1). `erasableSyntaxOnly` is on, so this is a const
 * object plus a union type rather than a TS enum.
 */
export const BlockType = {
  Air: 0,
  Soil: 1,
  Stone: 2,
  Grass: 3,
} as const;

export type BlockType = (typeof BlockType)[keyof typeof BlockType];

export const BLOCK_NAMES: Readonly<Record<BlockType, string>> = {
  [BlockType.Air]: 'Air',
  [BlockType.Soil]: 'Soil',
  [BlockType.Stone]: 'Stone',
  [BlockType.Grass]: 'Grass',
};

/** Air is not countable and does not participate in the ledger (SPEC §9). */
export const isCountable = (t: BlockType): boolean => t !== BlockType.Air;

/** Solid blocks occlude faces and support movers. In the MVP that is everything but Air. */
export const isSolid = (t: BlockType): boolean => t !== BlockType.Air;

/** Every countable type, in a fixed order — the ledger iterates this. */
export const COUNTABLE_TYPES: readonly BlockType[] = [BlockType.Soil, BlockType.Stone, BlockType.Grass];
