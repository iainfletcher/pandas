# Heapstead — Specification

> **⚠️ RECONSTRUCTED DOCUMENT.**
> The original `docs/SPEC.md` was not present in the repository when work began.
> This spec was reconstructed by expanding the session brief, which paraphrased
> §9, §11, §12 and §14. Section numbering is chosen so those four references
> land where the brief expects them. **Every detail not explicitly present in the
> brief is an inference** and is logged in `docs/DECISIONS.md`. Where this
> document and the author's intent disagree, the author wins — correct this file
> and re-derive.

---

## 1. Pitch

Heapstead is a cozy Settlers-style village builder set in a voxel world. The
conceit that makes it Heapstead and not a hundred other builders: **the little
machines move literal blocks.** There is no abstract resource counter ticking
up. When a digger digs, a block leaves the ground. When a barrow wheels it
away, that same block is riding in the barrow. When it lands on a pile, the pile
is one block taller. Production is visible, physical and countable, all the way
down.

The tone is calm and warm. Nothing is threatened, nothing is on fire, nothing
is on a timer. The pleasure is watching a small machine economy tick over and
finding it legible.

## 2. Design pillars

1. **Every block is real.** Resources are voxels with positions. There is no
   moment where a block exists only as a number. See §9.
2. **Legibility over throughput.** A player should be able to point at any
   machine and say what it is doing and why. Motion carries meaning (§11).
3. **Calm.** Twenty machines running should read as a busy workshop, not a
   swarm. Density, speed and noise are tuned for calm, and calm is a testable
   property — the debug spawn (§14, M0) exists to judge it.
4. **Tunable feel.** Every number that affects how the game *feels* lives in a
   config file, never inline in logic (§12).

## 3. The world

- **Voxel grid.** Right-handed, Y-up. Integer cell coordinates `(x, y, z)`.
  Cell `(x,y,z)` occupies the unit cube from `(x,y,z)` to `(x+1,y+1,z+1)`.
- **Chunks.** The world is partitioned into fixed-size chunks for meshing
  (§10). Chunk size is a config constant, default 16×16×16. Chunking is a
  *rendering and storage* concern; simulation addresses cells globally.
- **Finite world.** The MVP world has hard bounds. Reads outside bounds return
  `Air`; writes outside bounds are a programming error and throw.
- **One block per cell.** A cell holds exactly one `BlockType`, and `Air` is a
  block type. There is no sub-cell occupancy.

### 3.1 Block types

The MVP needs few. Named for what they look like, not what they are for.

| Type | Role |
|---|---|
| `Air` | Empty. Not counted by the ledger. |
| `Soil` | The diggable surface layer. Warm brown. |
| `Stone` | Structural bulk; cliffs and plateau cores. Cool grey. |
| `Grass` | Soil with a lit top face. Muted green. |

Only **countable** types (everything but `Air`) participate in the ledger.

## 4. Movers

A **mover** is a machine that changes where blocks are. Movers are the entire
verb set of the game. All four MVP movers are defined by what they do to block
*position*, not by what they produce:

| Mover | Verb | Takes a block from | Puts it |
|---|---|---|---|
| **Digger** | excavate | a solid cell at its work face | into its own hands, then out to a neighbour |
| **Chute** | drop | its intake mouth | down a vertical/diagonal run to its outfall |
| **Barrow** | carry | a source cell or a mover's hands | somewhere else on a path, one load at a time |
| **Crane** | lift | a cell below its hook | a cell within its radius, usually upward |

The distinction that matters: **chute and crane move blocks without moving
themselves; digger and barrow move themselves.** This is the seed of the later
routing system and is why the `Mover` interface (§12.2) exposes both a mover
position and a set of carried blocks.

### 4.1 Mover lifecycle

Every mover is a **state machine** advanced one step per sim tick (§8). A mover
is at all times in exactly one named state, and that name is exposed for
debugging and for the renderer to choose an animation.

A mover holding a block between two cells is said to be **carrying** it. Carried
blocks are not in the world grid, so the ledger must ask movers what they hold
(§9). This is the single most important invariant boundary in the codebase.

## 5. Piles

Blocks delivered to a pile area do not vanish into a stockpile counter. They
stack. Piles grow as **stepped pyramids** (§11.6): a pile fills its base layer
before starting the next, and each successive layer is inset, so a large pile
looks like a ziggurat rather than a tower. Pile placement is deterministic —
given the same pile and the same block count, the same cells are occupied.

## 6. Jobs and routing *(post-MVP — M1 and later)*

In the full game, movers are not scripted. A job board holds outstanding work
("this cell wants excavating", "this block wants to be at that pile"), movers
claim jobs they are able to service, and routing decides which chain of movers
carries a block from A to B.

**None of this is in M0.** M0 scripts the movements directly (§14). But the
`Mover` interface and the state machines must be built as if the job system
already existed, so M1 replaces the director without rewriting the movers.

## 7. The village *(post-MVP)*

Buildings consume blocks and produce new block types, villagers occupy them.
Out of scope for this document beyond noting that buildings are block sinks and
sources, and so must go through the ledger like everything else.

## 8. Time

- **Fixed simulation tick of 10 Hz** (100 ms). The simulation is a pure
  function of `(state, tick)`; it never reads wall-clock time.
- **Render interpolation.** Rendering runs at display rate and interpolates
  between the previous and current sim states by an alpha in `[0,1]`. Nothing
  in the renderer may mutate sim state.
- **Accumulator loop.** Render frames accumulate elapsed time and run zero or
  more sim ticks. The number of ticks per frame is clamped so a background tab
  or a long stall cannot trigger a spiral of death; excess time is discarded.
- **Determinism.** Given the same seed and the same sequence of inputs, the
  simulation produces bit-identical state. This requires a seeded PRNG (§12.1)
  and forbids iteration over unordered collections where order affects results.

## 9. The ledger

**The central invariant: blocks are never created and never destroyed.**

At any instant, every countable block in the game is in exactly one of three
places:

1. **In the world grid** — a cell whose type is not `Air`.
2. **In a mover's hands** — carried between cells.
3. **In flight** — released by one mover and not yet accepted by another or by
   the grid (a block tumbling down a chute, a block falling to a pile).

The **ledger** is the sum of those three populations, per block type.

### 9.1 The check

```
ledgerTotal(type) = gridCount(type) + carriedCount(type) + inFlightCount(type)
```

For a closed system with no sources or sinks, `ledgerTotal(type)` is
**constant across every tick**. In M0 the system is closed: no block enters or
leaves the world.

### 9.2 Requirements

- The ledger check runs **every tick in development builds** and throws
  immediately on a mismatch, naming the type, the expected total, the actual
  total and the tick number. A silent drift that is noticed ten minutes later
  is worthless; the failure must point at the tick that broke it.
- The check is **compiled out or disabled in production builds**, since it is
  O(world) and cheap only relative to a small MVP world.
- Sources and sinks, when they eventually exist, must be explicit: a block
  entering the world registers with the ledger as a *mint*, one leaving as a
  *burn*, and the invariant becomes `total = initial + mints − burns`. The MVP
  must build the ledger so this extension does not require rewriting it.
- **Every mover has a ledger test.** Run the mover through its full cycle and
  assert the ledger holds at every tick, including the moments mid-transfer
  where a block belongs to neither the grid nor a destination.

### 9.3 Why this matters

Block conservation is the difference between the game's core promise being true
and being a lie the player will eventually catch. It is also, in practice, the
best bug detector available: nearly every mover state-machine error shows up
first as a ledger drift of exactly one block.

## 10. Rendering

- **Chunked meshes.** Each chunk is meshed into a single geometry. Changing one
  cell re-meshes only its chunk (and neighbours whose faces are affected).
- **Face culling.** A face between two solid cells is never emitted. Only faces
  adjacent to `Air` (or the world edge) reach the GPU. This is the single
  biggest win available and is not optional.
- **Per-vertex ambient occlusion.** Each face vertex is darkened by how many of
  the three cells diagonally touching it are solid, giving voxel scenes their
  characteristic soft contact shading. Standard 0–3 occlusion levels.
- **Warm muted palette.** Low saturation, warm midtones, nothing pure-black or
  pure-white. Cozy, not vivid.
- **Camera.** Orbit, pan and zoom around a focus point. Pitch clamped to avoid
  going under the world. No first-person camera.
- **Interpolation.** Mover transforms are interpolated between sim states
  (§8); the voxel grid is not interpolated — a block is in a cell or it isn't.

## 11. Feel and signature motions

Motion is how each machine states its identity. These are not decoration; a
player should recognise a mover from its silhouette in motion alone. **Every
constant named here lives in config (§12.3).**

1. **Crane pendulum.** The hook and its load swing. The swing is driven by the
   crane's own horizontal motion, and damps toward rest when the crane stops.
   The load hangs from the swing angle rather than being rigidly attached — the
   pendulum is the crane's whole personality.
2. **Chute tumble and bounce.** Blocks travelling a chute tumble (rotate about a
   sensible axis) and bounce off the chute walls rather than sliding in a
   straight line. Arrival timing stays deterministic; the tumble is a visual
   offset around a deterministic path.
3. **Barrow bob and tip.** A loaded barrow bobs gently as it travels, and
   **tips** forward to dump its load — the tip is the delivery animation, and
   the block must leave the barrow at the moment the tip reads as complete.
4. **Digger rock and puff.** A digging digger rocks back and forth against the
   work face, and emits a small dust puff on the stroke that removes the block.
5. **Landing squash.** A block that lands squashes to **95% height** (5%
   squash) and springs back. Small, quick, applied to every landing.
6. **Stepped pyramid piles.** Piles grow as inset stepped pyramids (§5), so
   growth reads as a shape changing rather than a number rising.

### 11.1 Calm

Feel parameters are tuned so that a screen of machines is pleasant. When in
doubt: slower, smaller amplitude, more damping. If twenty of a mover on screen
reads as frantic, the parameters are wrong, not the count.

## 12. Architecture rules

These are **enforced mechanically by lint**, not by convention. A rule that is
only in a document is a rule that will be broken.

### 12.1 The sim/render split

`src/sim/` is a **pure, headless simulation**. It must be runnable in Node with
no browser and no GPU, and it must be deterministic.

Inside `src/sim/` the following are **banned and lint-enforced**:

- **No DOM.** No `window`, `document`, `navigator`, `localStorage`, no browser
  globals of any kind.
- **No three.js.** No importing `three` or anything that imports it. The sim
  has its own tiny vector type; it does not borrow the renderer's.
- **No `Math.random`.** All randomness comes from a seeded PRNG passed in
  explicitly. Non-determinism is a bug, and an unseeded random number is
  non-determinism that hides for weeks.
- **No wall-clock time.** No `Date.now`, no `performance.now`. The sim's only
  clock is the tick counter.

The dependency arrow points one way: **render may import sim; sim may never
import render.**

### 12.2 The `Mover` interface

All movers implement one interface. The director (§14) and, later, the job
system, address movers only through it. Adding a fifth mover must mean writing
one file and registering it, not touching the tick loop.

A mover exposes, at minimum: its identity and kind, its position, its current
state name, a `step()` that advances exactly one tick, the blocks it is
currently carrying (for the ledger, §9), and a pure-data snapshot for the
renderer that contains no three.js types.

### 12.3 Config

Every parameter that affects **feel** — speeds, durations, easing, swing
damping, squash amount, bob amplitude, pile shape — lives in `src/sim/config.ts`
(simulation timing and rates) or the render config (purely visual amplitudes).
No magic numbers in logic. The test of whether this rule is being followed: can
the whole game's feel be retuned without opening a single state machine file?

### 12.4 Testing

- The sim is tested headlessly with Vitest; it needs no browser.
- Every mover has a ledger test (§9.2).
- The renderer is verified by screenshot review, not by unit test.

## 13. Controls

- Orbit: left-drag. Pan: right-drag or middle-drag. Zoom: scroll.
- A debug overlay toggle showing tick count, block totals per type and mover
  states.
- A debug toggle that spawns ~20 of each mover, for judging calm (§11.1).

## 14. Milestones

### M0 — The diorama *(this milestone)*

A **hand-built, scripted** scene that proves the engine and the feel. No
player agency, no job system, no procedural generation.

- A hand-built diorama: **a plateau, a cliff, a small pit, and a pile area.**
- **One of each mover** running a scripted loop that moves **real blocks**:
  - the **digger** digs on the plateau,
  - the **chute** drops those blocks down the cliff,
  - the **barrow** wheels them to a pile,
  - the **crane** lifts from the pit.
- Behaviour is scripted, but the **mover state machines and voxel world live in
  `src/sim` behind the `Mover` interface** so M1 builds on them rather than
  replacing them. A thin **director** does the scripting.
- The **ledger check (§9) is implemented now** and asserted every tick in dev.
- Rendering per §10; signature motions per §11.
- The 20×-of-each debug toggle (§13).

**M0 is done when:** tests pass including per-mover ledger tests, and
screenshots in normal and 20× mode show no z-fighting, no missing faces, no
wrong colours and no floating blocks.

### M1 — Jobs

Replace the director with a job board. Movers claim work rather than being
told. Same movers, same ledger, no rewrite.

### M2 — Player agency

Designating areas to dig, placing movers, the beginnings of routing.

### M3 — The village

Buildings as block sinks and sources; villagers.
