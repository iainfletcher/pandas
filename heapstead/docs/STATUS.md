# Status

**As of:** 2026-09-11, end of session 2 (art pass)
**Milestone:** M0 (the diorama) — complete
**Next:** M1 (jobs) — **not started, and deliberately so.** M0 was the agreed
scope for this session.

---

## What works

Run `npm run dev` and you get a hand-built diorama with one of each mover
running a scripted loop that moves real blocks:

- the **digger** excavates the plateau top, layer by layer, and hands blocks to
  the chute;
- the **chute** carries them down the cliff face and drops them on a staging
  pile;
- the **barrow** collects from the staging pile, wheels them across the low
  ground, and tips them onto the main pile;
- the **crane** lifts blocks off the pit floor and sets them on the rim pile.

Blocks are never duplicated or destroyed. The ledger (SPEC §9) is asserted on
**every tick** in dev, with a full O(world) rescan every 50 ticks to verify the
incremental grid counters themselves. 6000 ticks (10 sim-minutes) of the
diorama and 1200 ticks of the 20-lane world both run clean.

### Verified

| | |
|---|---|
| `npm test` | **52 passing**, ~1.3 s |
| `npm run lint` | clean; §12 bans verified to actually fire |
| `npm run build` | clean typecheck + build |
| `npm run screenshot` | 8 shots captured under SwiftShader, reviewed |
| 20x debug spawn | 80 movers, 0.15 ms/tick with ledger asserts on |

Tests include a **ledger test per mover** (`tests/movers/`) that asserts
conservation after every tick of a full cycle, plus the moments that break it:
mid-transfer, destination full, source already emptied. Determinism is tested
against SPEC §8 (same seed → identical state; stepping order irrelevant; no
wall-clock dependence).

### Looks

Session 2 was an art pass over the same simulation — no sim behaviour changed
beyond the terrain the diorama builds:

- linear-light vertex colours (the old ones were sRGB bytes, hence muddy),
  per-block mottling, and a warm muted palette with real value separation;
- a shadow-casting key light, hemisphere ambience, ACES tone mapping and a
  three-stop gradient sky dome;
- the island's underside carved into a keel, so it reads as a diorama on a
  plinth rather than a rectangle sawn out of a larger world;
- rolling ground, trees, shrubs, boulders, dry patches and worn earth paths
  where the machines work — all deterministic, all kept clear of the corridor
  the movers actually walk;
- spoil piles mixed from several materials, banded by noise;
- proper machine models: a tracked excavator with a two-part arm, a
  wheelbarrow with a tub and handles, a lattice tower crane with cab and
  counterweight, and a timber chute with braces.

### What screenshot review caught

Three real bugs in session 1, all invisible to the tests:

1. **The chute rendered as disconnected slivers.** Its trough was built from a
   left-handed basis, so `Matrix4.makeBasis` produced a reflection, and the
   quaternion read out of a reflection is meaningless. Fixed by building a
   right-handed basis from world-up projected perpendicular to the run.
2. **Every crane and barrow started blocked in 20x mode.** Pile pre-seeding
   used absolute counts that exceeded pile capacity at lane-width 3, so the
   destinations began full. Now a fraction of capacity.
3. **The one-lane diorama was marooned in empty grass**, being as deep as the
   20-lane world. Compacted, then widened again to 62×30×26 once there was
   scenery to fill the margins.

And three more in session 2:

4. **`lane.z1` did not exist**, so the "keep the corridor flat" test compared
   against `undefined`, silently returned false, and grew hills straight
   through the strip the movers walk.
5. **Pile pre-seeding ran before planting**, converting the grass trees need to
   root in — twenty trees became one.
6. **Vertex colours were sRGB bytes in a linear buffer**, which reads as bad
   colour choices rather than as the colour-space bug it was.

## What I cannot tell you

**Motion feel is unjudged.** Stills cannot show it, and I will not claim
otherwise. Specifically, these are implemented to spec and tunable, but
untested by a human eye:

- whether the crane's pendulum settles pleasantly or looks floppy/stiff
  (`RENDER.motion.crane.swingStiffness`, `swingDamping`, `swingDrive`);
- whether the barrow's bob reads as effort or as a boat
  (`bobAmplitude`, `bobPerCell`);
- whether the digger's rock and puff land on the right beat;
- whether the 5% landing squash is visible enough, or too much;
- **whether 20x actually stays calm.** The stills look orderly, but calm is a
  property of movement. Press `X` and watch it.

Every one of those is a number in `src/sim/config.ts` or
`src/render/renderConfig.ts`. Nothing in a state machine needs touching to
retune them.

## Known issues and limitations

- **The chain fills up and stops, by design.** M0 is a closed system: blocks
  are conserved, and the destination piles are finite. The main pile tops out
  around tick 2400 (~4 min) and the rim pile around 4500 (~7.5 min), after
  which the chain backs up — barrow holds its load, chute fills, digger waits
  at the chute mouth, crane parks in its `blocked` state. That is correct
  backpressure, not a hang, and the ledger stays balanced throughout. It stops
  being the end state in M3, when buildings consume blocks.
- **Partially-built pile layers read as a ridge, not a step.** Layers fill
  row-major, so a half-finished layer is a line of blocks along one edge. Fine
  once a layer completes; a centre-out or spiral fill order would look better
  mid-layer.
- **The world's edges are visible as flat cut walls.** It is a diorama with no
  plinth. Framing avoids the worst of it.
- **Machines are simple box assemblies.** Legible, not lovely.
- **The debug overlay's fps reading is meaningless under Playwright**, which
  drives frames on demand.
- **Playwright pins a Chromium the image doesn't ship**, so
  `playwright.config.ts` points `executablePath` at
  `/opt/pw-browsers/chromium-1194/...`. If the image changes, that path needs
  updating — the symptom is "Executable doesn't exist".
- **This lives in a subdirectory of a pandas fork**, because this session's
  GitHub App could not create `iainfletcher/heapstead` (403). See DECISIONS.
  To lift it out once that repo exists:
  ```bash
  git subtree split -P heapstead -b heapstead-main
  git push git@github.com:iainfletcher/heapstead.git heapstead-main:main
  ```

## How to verify from scratch

```bash
cd heapstead && npm install
npm run lint && npm test && npm run build   # all clean
npm run smoke                               # 6000 ticks, ledger holds
npm run screenshot                          # then look at screenshots/
npm run dev                                 # and judge the motion yourself
```

To prove the architecture rules are real rather than documented, add
`Math.random()` to any file in `src/sim/` and run `npm run lint`.

## Next: M1 (jobs)

The groundwork is deliberate. `src/sim/director.ts` is the *entire* M0
scripting — roughly a hundred lines whose only job is answering "what should
this idle mover dig next?". M1 replaces it with a job board that movers claim
work from. Nothing in `src/sim/movers/` should need to change:

- movers already expose `isIdle` and take work through an `assign()`;
- the chute and barrow already take no direction at all — they are driven by
  the piles they are attached to, which is why the chain backs up gracefully
  without a scheduler;
- `BlockSink` (in `movers/common.ts`) is already the handover interface a job
  system would route through;
- the ledger already extends to mints and burns, for when buildings arrive.
