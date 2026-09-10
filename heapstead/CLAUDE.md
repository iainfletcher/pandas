# Heapstead — working notes

A cozy Settlers-style village builder in a voxel world where little machines
move literal blocks. **`docs/SPEC.md` is the source of truth.** Read it before
changing anything; this file only says how to work in the repo.

> Note: the spec in this repo is a *reconstruction* (see its header and
> `docs/DECISIONS.md`). If the original turns up, it wins.

## Running it

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # typecheck + production build
npm test             # Vitest, headless, ~1s
npm run lint         # ESLint, including the §12 architecture rules
npm run screenshot   # Playwright: builds, serves, writes screenshots/
```

Handy while working on the sim, all headless:

```bash
npm run smoke        # run the diorama 6000 ticks, print ledger + mover states
npm run smoke:20     # 20 lanes, 80 movers, timing per tick
npm run section      # ASCII cross-section of the diorama terrain
```

In the browser: drag to orbit, shift-drag to pan, scroll to zoom, `D` toggles
the debug overlay, `X` toggles the 20x spawn.

## The one rule that matters

**`src/sim/` is a pure, headless, deterministic simulation.** It runs in Node
with no browser and no GPU. Inside it, these are lint errors, not conventions
(SPEC §12.1, enforced in `eslint.config.js`):

- no DOM (`window`, `document`, `navigator`, …)
- no three.js, and no importing anything from `src/render/`
- no `Math.random` — take the seeded `Rng` from `MoverContext`
- no wall-clock time (`Date.now`, `performance.now`) — the tick counter is the
  only clock

The dependency arrow points one way: **render may import sim; sim may never
import render.** If a change wants to break one of these, the design is wrong,
not the rule. To see the rules fire, put `Math.random()` in a sim file and run
`npm run lint`.

## Layout

```
src/sim/            pure simulation — no DOM, no three, no randomness
  vec.ts            Vec3 as plain data, facings
  blocks.ts         BlockType, isSolid, isCountable
  rng.ts            seeded PRNG (the only randomness in the sim)
  world.ts          VoxelWorld: grid, per-type counts, dirty chunks
  registry.ts       block identities, and blocks in flight
  ledger.ts         SPEC §9 conservation check
  pile.ts           stepped pyramid placement
  mover.ts          the Mover interface
  movers/           digger, chute, barrow, crane + shared helpers
  config.ts         EVERY simulation feel parameter
  diorama.ts        the hand-built M0 scene, in lanes
  director.ts       M0 scripting — deleted wholesale in M1
  sim.ts            owns world + movers + clock, asserts the ledger
src/render/         may import sim; sim may never import render
  renderConfig.ts   EVERY visual feel parameter
  palette.ts        warm muted colours
  mesher.ts         chunked, face-culled, per-vertex AO
  camera.ts         orbit / pan / zoom
  moverViews.ts     the machines and their signature motions (§11)
  blockViews.ts     loose blocks, the landing squash
  renderer.ts       scene, chunk meshes, interpolation
src/main.ts         fixed-step accumulator, key bindings, test hooks
tests/              Vitest — sim, ledger, mesher, per-mover
tests-e2e/          Playwright screenshots
```

## Conventions

- **TypeScript strict**, plus `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `verbatimModuleSyntax` and
  `erasableSyntaxOnly`. That last one bans `enum` and constructor parameter
  properties — use a const object plus a union type, and assign fields in the
  constructor body.
- Import with explicit `.ts` extensions; `import type` for type-only imports.
- Comments explain *why*, especially where something non-obvious was learned
  the hard way. Don't narrate what the code already says.
- No magic numbers in logic. If it changes how the game feels, it belongs in
  `src/sim/config.ts` (outcomes, timing) or `src/render/renderConfig.ts`
  (appearance only). The test: could you retune the whole game without opening
  a state machine?

## Adding a mover

1. **Write `src/sim/movers/<name>.ts`** implementing `Mover`. Model it as a
   state machine with a named state per node. Take everything you need from
   `MoverContext` — never reach for a global.

2. **Get the block handover right.** This is the only part that is genuinely
   easy to get wrong. A block must be in exactly one place at a time:

   ```ts
   // Leaving the grid and entering your hands, in one step.
   ctx.world.setAt(cell, BlockType.Air);
   this.held = { id: ctx.blocks.mintId(), type, pos: this.bucket() };
   ```

   Never clear the grid on one tick and pick the block up on the next — the
   ledger will (correctly) call that a loss.

3. **Report what you hold.** `carried()` must return every block you are
   responsible for, every tick, including mid-transfer. A block you hold but
   do not report has, as far as the ledger is concerned, ceased to exist.

4. **Stall, never drop.** If the destination is full, keep holding the block
   and wait. Backpressure is how the whole chain behaves; dropping a block to
   get unstuck is a conservation bug. Give the mover a visible waiting state
   (see the crane's `blocked`) so a stall reads as waiting, not as a freeze.

5. **Put feel parameters in `config.ts`**, under a key named for the mover.

6. **Add a view** in `moverViews.ts` and register it in `makeView`. Views are
   cosmetic: they may lag, swing and squash, but must never change where a
   block ends up. Expose articulation points through `snapshot().parts` rather
   than widening the interface per kind.

7. **Write `tests/movers/<name>.test.ts`** using `tests/movers/harness.ts`.
   The `Rig` asserts the ledger with a full rescan after every tick, so a
   conservation bug fails on the tick that caused it. Cover: a full cycle, the
   instant of pickup, what happens when the destination refuses, and what
   happens when the block it was sent for has already gone.

   Anything in a test that *holds* a block must also be a `Mover` and report it
   under `carried()` — a fake sink that swallows blocks will fail the ledger,
   and the bug will be in your test.

8. **Register it** in `Sim`'s constructor, and give the director a way to feed
   it work if it needs one.

## Verifying renderer changes

Unit tests cover what a still cannot show — face culling, triangle winding, AO
gradients. Everything else is screenshot review: run `npm run screenshot` and
**look at `screenshots/`**. Both real bugs found so far (a reflected basis
matrix collapsing the chute, pre-seeding that started every crane blocked) were
invisible to tests and obvious in an image.

Motion — whether the swing settles nicely, whether twenty movers feel calm —
cannot be judged from stills at all. That needs `npm run dev` and a human.
