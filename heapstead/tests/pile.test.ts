import { describe, it, expect } from 'vitest';
import { Pile, pileCell, pileCapacity, layerCapacity } from '../src/sim/pile.ts';
import { vec } from '../src/sim/vec.ts';

const shape = { origin: vec(10, 6, 10), width: 5, depth: 5 };

describe('stepped pyramid piles (SPEC §5, §11.6)', () => {
  it('fills a layer completely before starting the next', () => {
    for (let i = 0; i < 25; i++) expect(pileCell(shape, i)?.y).toBe(6);
    expect(pileCell(shape, 25)?.y).toBe(7);
  });

  it('insets each successive layer', () => {
    expect(layerCapacity(shape, 0)).toBe(25); // 5x5
    expect(layerCapacity(shape, 1)).toBe(9);  // 3x3
    expect(layerCapacity(shape, 2)).toBe(1);  // 1x1
    expect(layerCapacity(shape, 3)).toBe(0);  // closed
    expect(pileCapacity(shape)).toBe(35);
  });

  it('keeps every layer inside the one below it', () => {
    for (let i = 0; i < pileCapacity(shape); i++) {
      const c = pileCell(shape, i);
      expect(c).not.toBeNull();
      const layer = (c as { y: number }).y - shape.origin.y;
      const inset = layer;
      expect((c as { x: number }).x).toBeGreaterThanOrEqual(shape.origin.x + inset);
      expect((c as { x: number }).x).toBeLessThan(shape.origin.x + shape.width - inset);
    }
  });

  it('returns null once full rather than stacking a tower', () => {
    expect(pileCell(shape, 35)).toBeNull();
  });

  it('is a pure function of index — same pile, same block count, same cells', () => {
    const a = Array.from({ length: 30 }, (_, i) => pileCell(shape, i));
    const b = Array.from({ length: 30 }, (_, i) => pileCell(shape, i));
    expect(a).toEqual(b);
  });

  it('take() reverses add()', () => {
    const pile = new Pile(shape);
    const placed = [pile.add(), pile.add(), pile.add()];
    expect(pile.count).toBe(3);
    expect(pile.take()).toEqual(placed[2]);
    expect(pile.take()).toEqual(placed[1]);
    expect(pile.count).toBe(1);
  });

  it('refuses to overfill', () => {
    const pile = new Pile(shape);
    for (let i = 0; i < 35; i++) expect(pile.add()).not.toBeNull();
    expect(pile.isFull).toBe(true);
    expect(pile.add()).toBeNull();
    expect(pile.count).toBe(35);
  });
});
