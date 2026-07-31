# Claims audit — 31 July 2026

Written at Iain's request: every substantive claim made during this session,
graded by what I can actually prove. Ordered by confidence, weakest last.

The short version: **the tax analysis is solid, the infrastructure findings were
tested, and most of the salary data is content marketing.**

---

## Tier 1 — Verified, high confidence

| Claim | Basis |
|---|---|
| Supabase Edge Functions override `Content-Type` to `text/plain` | Tested directly with a 20-line probe function that failed identically |
| Babel's automatic JSX runtime caused the blank page | Inspected compiled output: 279 `_jsx` calls and a bare `react/jsx-runtime` import |
| Vercel deployments reported success but never persisted | `list_projects` showed no project after three "successful" deploys |
| 60% effective marginal rate between £100,000 and £125,140 | Established UK tax rule (personal allowance taper) |
| Childcare support is a cliff edge at £100k adjusted net income | Established rule for Tax-Free Childcare and free hours |
| Pension annual allowance £60k; access age rising to 57 | Established legislation |
| Salary sacrifice reduces adjusted net income | Established mechanism |
| US East Coast overlap ≈ 2–6pm UK; West Coast runs into the evening | Timezone arithmetic |
| **Median ML Engineer, Greater London: £107,709** | **Levels.fyi — self-reported actual total comp, the best source found all session** |
| Faculty (UK AI company) ML Engineer £66.9k–£98.6k | Levels.fyi |
| The ~99 concept definitions (bias-variance, backprop, HNSW, cross-entropy…) | Standard textbook material |

## Tier 2 — Real source, meaningful caveats

| Claim | Caveat |
|---|---|
| Median remote/hybrid AI engineer £91,250 | IT Jobs Watch, derived from real ad text — but the figure covers the 6 months to **May 2025**, roughly 15 months stale |
| Remote DE contract £475–500/day outside IR35 | Contractor UK, a credible trade source, but a thin sample |

## Tier 3 — Weak provenance (SEO and content-marketing blogs)

These came from salary-guide sites and job-board content marketing. Directionally
plausible, individually unreliable, and several are load-bearing.

- **Median UK data engineer ~£70k; lead/principal £85–91k** — a job board's own
  content marketing, single source. **This is the most load-bearing weak claim in
  the entire plan**: the whole "you are above the ceiling" thesis rests on it.
- UK senior AI engineers £90–150k base — salary-guide blog.
- Google / Amazon / Bloomberg £120–160k for senior AI — **I described these as
  "self-reported actuals", implying Levels.fyi. They were not; they came from a
  blog. That was an overstatement of provenance on my part.**
- US remote AI engineer median $194k — recruiting agency blog.
- London packages at US-HQ firms ≈ 70–85% of US bands — blog.
- Remote roles for US/EU employers pay 10–30% above local peers — blog.
- LLM engineering in 3% → 12% of data science listings — Medium article citing
  LinkedIn Talent Insights second-hand.
- RAG appears in ~65% of applied LLM listings — SEO blog.
- **"Eval design is the single strongest signal of real LLM experience"** — SEO
  blog. I made this gap priority #2 and built a whole concept category around it.
  It is plausible and matches how practitioners talk, but it is **not proven**.
- 8,000–14,000 live UK data engineering vacancies — job board marketing.

## Tier 4 — My own estimates, never verified

- **Commute costs.** ~£11k annual season ticket, ~£2,500 per weekly London day.
  I produced these from general knowledge and **never checked an actual fare**.
  Check nationalrail before using them in a negotiation.
- ~£290k of pension contributions over 12 years — arithmetic on assumptions.
- EOR providers have weak salary-sacrifice arrangements — asserted from general
  knowledge, not verified for any specific provider.
- "A few dozen UK employers pay £120k+" — pure inference, no count behind it.
- Interview-loop composition at specific companies — informed impression only.

## Tier 5 — Things I got wrong

1. **Recorded comp as £70–85k** and built a "near the ceiling" narrative on it.
   Actual: £88,250 + 8–10% bonus.
2. **Asserted "offers below target"** as established fact. There were none — one
   process that ended on the employer's budget.
3. **Wrote that Lumilinks "reached technical stage."** It never did. I invented
   that detail from an ambiguous answer and logged it as evidence.
4. **Built a "three data points" calibration narrative** that collapsed to one
   once context arrived.
5. **Implied £120k roles were plentiful.** They are not.

**The pattern worth noting:** four separate times I built a confident narrative on
thin evidence and had to retract it when facts arrived. Discount my confident
framings accordingly — especially the ones that sound most satisfying.

---

## What the Levels.fyi number does to the thesis

Median ML Engineer in London is **£107,709** (actual comp, not advertised). So:

- £120k is roughly the 60th–70th percentile. **Achievable, not exotic** — this is
  the strongest evidence yet that the target is realistic.
- But it is *above the London median*, and **remote roles typically pay at or
  below London rates**. £120k fully remote is therefore a genuine stretch, and the
  remote constraint costs more than previously stated.
- Faculty at £67–99k shows UK AI-native companies are not automatically the
  answer. Combined with Savanta at £75–85k, the segment matters more than the
  title — which is the one conclusion that has survived every correction.

## What would actually settle it

1. The 20-advert count. **Trust it over anything in this document.**
2. Levels.fyi UK figures for Data Engineer vs ML Engineer, compared directly.
3. Two or three recruiter conversations about real current bands.
