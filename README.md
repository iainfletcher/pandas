# levelup

A personal learning platform for one goal: Senior Data Engineer (£70–85k) to a
£100k+ remote AI/ML engineering role in the UK, within 12 months, on 5–8 hours a
week.

**Live:** https://iainfletcher.github.io/pandas/ *(after enabling Pages — see below)*

## What it is

A phone-first web app. Sign in once and it stays signed in; add it to your home
screen and it behaves like an app.

| Tab | What it does |
|---|---|
| **Today** | Runway countdown, hours logged this week, the next three actions, quick time logging |
| **Learn** | 63 concepts covering the vocabulary and theory of AI/ML engineering. Drill mode, browse by category, and a place to park questions |
| **Plan** | Four phases, 21 tasks, each with a stated reason it exists |
| **Jobs** | The weeks 1–4 evidence exercise: log 20 real £100k+ UK-remote adverts and score yourself honestly against them |
| **Evidence** | What you shipped, wrote, learned and interviewed for — raw material for CV bullets |
| **Brief** | The strategy, the calibration warning, direction, walk-away number, and the gap scores |

## The strategy in one paragraph

Recent interviews produced offers *below target*, not rejections. Median UK data
engineer pay is ~£70k and lead/principal tops out ~£85–91k, so £70–85k is already
near the ceiling of that job title — £100k sits above the top of the band, not in
the middle of it. Median advertised pay for a remote AI engineer is ~£91k with UK
seniors at £90–150k. The constraint is the band, not the skill, so the plan is a
repositioning rather than a retraining. Full reasoning in
[`docs/career-paths.md`](docs/career-paths.md); the baseline profile is in
[`docs/PROFILE.md`](docs/PROFILE.md).

## The Learn tab

The stated problem was gaps in terminology and theory that someone from a top
university or a big tech company would have absorbed by osmosis — knowing how to
do the thing but not the word for it. Each concept carries three parts:

- **one-liner** — the crisp definition, the sentence you would actually say
- **detail** — the intuition and the thing people get wrong
- **in the room** — how it shows up in an interview and what signals depth

Drill mode surfaces whatever you have rated lowest or seen least, prompts you to
say it out loud before revealing, then takes an honest self-rating. Categories:
evaluation, retrieval/RAG, LLM internals, ML theory, agents, production ML, stats.

Evaluation is deliberately first and largest. It is reported as the strongest
single signal of genuine LLM experience, and it currently appears on the CV as
one word.

## Architecture

- **Frontend** — [`index.html`](index.html): one self-contained file. React,
  Tailwind and the Supabase client come from pinned CDNs; the app itself is
  plain JS, compiled ahead of time from JSX by [`build.js`](build.js).
- **Hosting** — GitHub Pages, serving this branch.
- **Data** — Supabase Postgres. Row-level security on every table keyed on
  `auth.uid()`; Supabase Auth for sign-in.

### Enabling Pages

Settings → Pages → Source: *Deploy from a branch* → branch
`claude/new-project-setup-tqvcw7`, folder `/ (root)` → Save. The site appears at
the URL above within a minute or two.

### Why not Supabase Edge Functions

The page was originally served from an edge function
([`supabase/functions/app/index.ts`](supabase/functions/app/index.ts), kept as the
source of truth the HTML is generated from). Supabase's gateway overrides the
response `Content-Type` to `text/plain` regardless of what the function sets, so
browsers displayed the markup as source rather than rendering it. Confirmed with
a minimal twenty-line probe function, which failed the same way. Not fixable from
inside the function.

The publishable key is embedded in the page on purpose: it is designed to ship to
browsers, and RLS plus the sign-in screen are what actually protect the data.
`verify_jwt` is off on the function because it serves a public HTML shell
containing no secrets.

`app/` holds an earlier Vite build of the same UI, kept because it is the better
starting point if this ever moves to proper hosting.

## Known limitations

- **No live AI tutor.** That needs an LLM API key held server-side, which the
  authoring environment could not set. The Ask tab parks questions instead;
  answers get added to the concept bank out of band.
- **Deploys are manual.** Edit the JSX in `supabase/functions/app/index.ts`, run
  `NODE_PATH=<dir with @babel/standalone> node build.js` to regenerate
  `index.html`, then commit and push. Pages picks it up automatically.
- **Two hosts were tried and rejected.** Vercel reported successful deployments
  that never persisted; Supabase Edge Functions could not serve HTML as HTML.

## Repository note

This lives on a branch of an old `pandas` fork because the GitHub integration
lacked permission to create new repositories. The history is clean and unrelated
to `pandas`, so moving it to a fresh repository is a clone-and-push.
