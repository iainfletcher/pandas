# levelup

A personal learning platform for a specific goal: moving from Senior Data
Engineer (£70–85k) to a £100k+ remote role in the UK, within 6–12 months, on a
budget of 5–8 hours a week.

Not a generic study app. It plans against one profile, tracks one set of gaps,
and is opinionated about what to do next.

## Status

Profile and strategy complete. Application build is next.

| Piece | State |
|---|---|
| [`docs/PROFILE.md`](docs/PROFILE.md) | Done — baseline profile, assets, gaps, diagnosis |
| [`docs/career-paths.md`](docs/career-paths.md) | Done — path comparison and recommendation |
| [`data/profile.json`](data/profile.json) | Done — machine-readable profile the app reads |
| Curriculum | Not started — blocked on path decision |
| Web app | Not started |

## Start here

Read [`docs/PROFILE.md`](docs/PROFILE.md) first, then
[`docs/career-paths.md`](docs/career-paths.md). The second one asks you to make
a decision; the rest of the project is blocked on it.

## What the app will be

A dashboard, self-hosted, that answers "what should I do with this week's five
hours?" and shows whether the plan is working.

Planned surfaces:

- **Dashboard** — runway remaining, hours logged, gap-closure progress, next action.
- **Skill graph** — gaps from `profile.json` scored over time against evidence, not vibes.
- **Curriculum** — the learning path for the chosen direction, broken into sessions that fit the real weekly budget.
- **Project tracker** — milestones for the portfolio build.
- **Interview drills** — spaced repetition over system design prompts and role-specific questions, given that offers are already landing and the final stage is the high-leverage one.
- **Evidence log** — what you shipped, wrote and learned, feeding CV and interview material directly.

## Intended architecture

FastAPI plus Postgres on the backend, React on the front. Python because it is
the working language of the target roles, and because the application is meant
to double as the portfolio project — the tutor and drill-generation features are
a genuine RAG-and-evaluation system, which is precisely the gap the profile
identifies as highest priority.

That is the design bet worth stating plainly: **building this tool is itself the
most efficient way to close the top-priority gap.** It is not overhead taken
away from studying.

## Repository note

This currently lives on a branch of an old `pandas` fork because the GitHub
integration in the authoring session lacked permission to create new
repositories. The history is clean and unrelated to `pandas`, so moving it to a
fresh repository is a copy-and-push. See the session notes for the commands.
