import { test, expect, type Page } from '@playwright/test';

/**
 * Captures the diorama at several moments, in normal and 20x mode, for review.
 *
 * These are review artefacts first and assertions second: the assertions catch
 * a scene that failed to render at all (no WebGL, no geometry), but "does it
 * look right" is answered by opening screenshots/ and looking.
 */

const SHOTS = 'screenshots';

const boot = async (page: Page, lanes: number): Promise<void> => {
  await page.goto('/');
  await page.waitForFunction(() => window.heapstead !== undefined);
  if (lanes !== 1) await page.evaluate((n) => window.heapstead.setLanes(n), lanes);
  // One frame so the scene builds before anything is asked of it.
  await page.evaluate(() => new Promise(requestAnimationFrame));
};

const advance = async (page: Page, ticks: number): Promise<void> => {
  await page.evaluate((n) => window.heapstead.runTicks(n), ticks);
  // Let a few frames run so interpolation, squashes and re-meshes settle.
  await page.evaluate(() => new Promise(requestAnimationFrame));
  await page.evaluate(() => new Promise(requestAnimationFrame));
  await page.evaluate(() => new Promise(requestAnimationFrame));
};

/** Hide the debug overlay: at close range it sits on top of the subject. */
const hideOverlay = async (page: Page): Promise<void> => {
  await page.evaluate(() => window.heapstead.overlay(false));
  await page.evaluate(() => new Promise(requestAnimationFrame));
};

const camera = async (page: Page, d: number, az: number, el: number, t?: [number, number, number]): Promise<void> => {
  await page.evaluate(([dd, a, e, tx, ty, tz]) => {
    window.heapstead.camera(dd!, a!, e!, tx, ty, tz);
  }, [d, az, el, t?.[0], t?.[1], t?.[2]] as const);
  await page.evaluate(() => new Promise(requestAnimationFrame));
};

/** A rendered scene has geometry; an unrendered one has none. */
const expectRendered = async (page: Page): Promise<void> => {
  const state = await page.evaluate(() => window.heapstead.state());
  expect(state.triangles, 'scene rendered no triangles — WebGL probably failed').toBeGreaterThan(1000);
};

test('diorama, establishing shot', async ({ page }) => {
  await boot(page, 1);
  await advance(page, 40);
  await camera(page, 58, -0.75, 0.85, [31, 8, 7]);
  await expectRendered(page);
  await page.screenshot({ path: `${SHOTS}/01-establishing.png` });
});

test('diorama, chain running', async ({ page }) => {
  await boot(page, 1);
  await advance(page, 900);
  await camera(page, 44, -0.70, 0.70, [32, 8, 7]);
  await expectRendered(page);
  await page.screenshot({ path: `${SHOTS}/02-running.png` });
});

test('diorama, piles grown', async ({ page }) => {
  await boot(page, 1);
  await advance(page, 2200);
  await camera(page, 38, -0.60, 0.62, [40, 8, 7]);
  await expectRendered(page);
  await page.screenshot({ path: `${SHOTS}/03-piles-grown.png` });
});

test('close on the cliff and chute', async ({ page }) => {
  await boot(page, 1);
  await advance(page, 1400);
  await hideOverlay(page);
  await camera(page, 19, 0.72, 0.33, [25.0, 10.8, 6.5]);
  await expectRendered(page);
  await page.screenshot({ path: `${SHOTS}/04-cliff-chute.png` });
});

test('close on the pit and crane', async ({ page }) => {
  await boot(page, 1);
  await advance(page, 1100);
  await hideOverlay(page);
  await camera(page, 19, -0.45, 0.5, [52, 7.5, 7]);
  await expectRendered(page);
  await page.screenshot({ path: `${SHOTS}/05-pit-crane.png` });
});

test('close on the digger at work', async ({ page }) => {
  await boot(page, 1);
  await advance(page, 700);
  await hideOverlay(page);
  await camera(page, 13, -1.35, 0.45, [18, 14, 7]);
  await expectRendered(page);
  await page.screenshot({ path: `${SHOTS}/06-digger.png` });
});

test('twenty of each mover', async ({ page }) => {
  await boot(page, 20);
  await advance(page, 900);
  await camera(page, 95, -0.75, 0.80, [31, 8, 34]);
  const state = await page.evaluate(() => window.heapstead.state());
  expect(state.movers).toBe(80);
  await expectRendered(page);
  await page.screenshot({ path: `${SHOTS}/07-twentyx.png` });
});

test('twenty of each mover, close in', async ({ page }) => {
  await boot(page, 20);
  await advance(page, 1500);
  await hideOverlay(page);
  await camera(page, 42, -0.80, 0.50, [33, 8, 34]);
  await expectRendered(page);
  await page.screenshot({ path: `${SHOTS}/08-twentyx-close.png` });
});
