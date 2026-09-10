# Decisions

Ambiguities resolved while building, one line of reasoning each (per the
working-style rule: make a sensible call, log it, keep going).

Format: `date — decision — why`.

---

## Session 1 — setup + M0

### Process / environment

- **2026-09-10 — `docs/SPEC.md` did not exist; reconstructed it from the session
  brief.** The brief paraphrased §9, §11, §12 and §14 in enough detail to
  expand into a coherent spec. Section numbers were chosen so those four
  references land where the brief expects them. Everything not in the brief is
  an inference and is flagged in the document header. *Risk: if the original
  spec resurfaces, section numbering and any detail not in the brief will
  disagree — treat the original as authoritative and re-derive.*

- **2026-09-10 — Built in `heapstead/` inside the pandas fork rather than a new
  repo.** A new `iainfletcher/heapstead` was requested, but this session's
  GitHub App has no repo-creation permission (403 on `POST /user/repos`) and
  no such repo exists to attach. A subdirectory on the designated branch keeps
  the work pushable and pandas untouched, and extracts cleanly later with
  `git subtree split -P heapstead -b heapstead-main`.

### Architecture

- **2026-09-10 — `Vec3` is a plain immutable record, not a class.** It crosses
  the sim/render boundary constantly; plain data is trivial to snapshot,
  compare and serialise, and it cannot accidentally carry methods that reach
  into the renderer.

- **2026-09-10 — Block types are a const object + union, not a TS `enum`.**
  `erasableSyntaxOnly` is enabled in tsconfig, which bans enums. The const
  object gives the same ergonomics with no runtime surprises.

- **2026-09-10 — Carried blocks have identities (`BlockId`), not just types.**
  The ledger only needs counts, but stable identities let the renderer keep
  animating the same block across ticks (needed for chute tumble, §11.2) and
  make ledger failures diagnosable — "block 41 is in no population" beats
  "Soil is one short".

- **2026-09-10 — The sim owns positions and timing; the renderer owns cosmetic
  deformation.** Squash (§11.5), tumble rotation (§11.2), dust puffs (§11.4)
  and pendulum hang (§11.1) do not affect where a block ends up, so they live
  render-side and are driven by `velocity` and `stateProgress` on the mover
  snapshot. Keeps the sim deterministic and headless-testable.

### Simulation

- **2026-09-10 — The ledger reads incremental grid counters every tick, and does
  a full rescan every 50.** A full O(world) recount every tick is affordable at
  this size but wasteful; incremental counters alone would verify transfers
  between populations but not the storage itself. Doing both, at different
  rates, catches both classes of bug. `SIM.ledger.fullAuditEveryTicks`.

- **2026-09-10 — Launch velocity is solved ballistically rather than guessed.**
  The first version gave a released block a fixed forward nudge; it landed at
  the right height in the wrong place and snapped sideways into its cell, which
  read as teleporting. `BlockRegistry.launch` now solves the horizontal speed
  from the fall time so the block arrives over its target as it lands.
  `SIM.flight.maxFallSpeed` is set high enough never to bind, since a clamp
  that engaged would break that solve.

- **2026-09-10 — A mover whose destination is full holds its load.** The
  alternative — dropping the block somewhere to get unstuck — is a conservation
  bug wearing a convenience costume. The crane gets an explicit `blocked` state
  that parks it at rest, because a machine frozen mid-swing reads as broken
  where a machine waiting at rest reads as waiting.

- **2026-09-10 — The director lives in `src/sim/`, not beside it.** It is
  scripting rather than simulation, which argues for its own place, but it must
  be deterministic and headless like everything else the sim owns, and it is
  deleted wholesale in M1. A fifth top-level concept for something with that
  lifespan is not worth the cost.

- **2026-09-10 — The diorama is laid out in *lanes*.** The 20x debug spawn
  (SPEC §13) needs twenty of each mover somewhere sensible. Rather than invent
  a second world, one lane is the diorama and twenty lanes is the same scene
  widened. Lane pre-fill and mover start positions are staggered by lane index,
  because twenty identical deterministic lanes move in perfect unison, and
  perfect unison is no way to judge whether something feels calm.

- **2026-09-10 — Piles start part-built.** A 7x5 base layer takes 35 blocks to
  close; at one delivery every twenty seconds, an empty pile reads as a flat
  slab for the whole length of any demo, and the stepped pyramid (§11.6) is
  never visible. The diorama is a hand-built set (§14), and a pile area with
  work already in it is what a working village looks like. Pre-seeded blocks
  exist before the ledger is sealed, so they are baseline, not mints.

- **2026-09-10 — Pile pre-fill is a fraction of capacity, not a count.** The
  absolute version overflowed every pile at lane-width 3, which started every
  crane and barrow already blocked with nowhere to put their load. Caught by
  looking at a 20x screenshot.

- **2026-09-10 — Movement speeds raised ~40% over the first pass.** The
  original values were cozy to the point of inert: one block delivered every
  twenty seconds, and nothing visibly happening between. Calm is a pillar
  (SPEC §2); torpor is not.

### Rendering

- **2026-09-10 — The landing squash holds its chunk's re-mesh for a quarter
  second.** A block belongs to the chunk mesh the instant it lands, and a chunk
  mesh cannot squash one cell of itself. The alternatives were to draw a proxy
  over the real block (z-fighting) or to delay the sim (desync). Holding the
  *render* of one chunk for `RENDER.motion.landing.duration` keeps sim and
  render agreed and is invisible at that length.

- **2026-09-10 — The crane's pendulum is driven by hook velocity, not
  acceleration.** A pendulum on a moving pivot is physically driven by pivot
  acceleration, but a second difference of position is badly behaved when frame
  times jitter. A damped spring pulled toward an angle proportional to velocity
  lags, overshoots and settles convincingly, and stays stable.

- **2026-09-10 — Articulation points are a generic `parts` record on the
  snapshot.** The crane needs a hook position, the digger a bucket, the barrow
  a tray. A discriminated union per mover kind would mean touching the
  interface every time a mover is added, against SPEC §12.2's "one file".

- **2026-09-10 — The camera is hand-written rather than three's OrbitControls.**
  Damping, clamps and the exact-pose setter the screenshot harness needs are
  all ours, in one short file, with no dependency's opinions to work around.

- **2026-09-10 — Loose blocks are drawn at 0.98 cells.** Full size would be
  correct, but 2% of inset costs nothing visually and removes any chance of
  z-fighting with the world mesh if a landing and a re-mesh ever race.

- **2026-09-10 — The chute trough is chunkier than a real chute would be.**
  The first version used 0.14-thick boards and vanished into the cliff face at
  any distance. A machine the player cannot pick out is not legible (SPEC §2).

### Verification

- **2026-09-10 — Playwright points at the image's own Chromium.** The pinned
  `@playwright/test` wants a build the container does not ship and would try to
  download one. Full Chromium rather than `headless_shell`, since the shell
  build has no working WebGL path under SwiftShader.

- **2026-09-10 — The mesher gets unit tests despite renderers being verified by
  eye (SPEC §12.4).** Two classes of bug are invisible in a still: faces that
  should have been culled, and triangles wound the wrong way (which vanish
  under backface culling exactly when the camera moves). Both are cheap to
  assert and expensive to notice later.
