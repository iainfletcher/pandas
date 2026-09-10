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
