# Career Path Comparison

*You selected "undecided — help me compare". This is that comparison. Deciding
is milestone one; with 5–8 hours a week you cannot hedge across three paths.*

---

## The number that drives everything

Median UK data engineer salary is about **£70k**. Lead and principal data
engineering roles top out around **£85–91k**.

You are on £70–85k.

Read that again, because it explains the offers-below-target problem completely.
Within the data engineering title, £100k is not the middle of the range you are
climbing towards — it is above the top of it, reachable only at the tail, mostly
in London fintech, US-headquartered companies and a thin band of scale-ups. You
are not underperforming. You are near the ceiling of your current market.

Meanwhile, the median advertised salary for a **remote or hybrid AI engineer**
is around **£91k**, and UK senior AI engineers sit at **£90–150k base**.

The gap between those two distributions is the entire strategy question.

---

## Path A — AI/ML Engineer (data-centric)

**What it is:** Building LLM-backed systems in production. RAG pipelines,
retrieval quality, agent orchestration, evaluation harnesses, guardrails, cost
and latency engineering, observability. Not research; applied engineering.

**Why you are unusually well placed**

- The retrieval, embedding and pipeline work in AI engineering is data
  engineering. Chunking strategies, incremental indexing, freshness, lineage,
  cost per query — that is your existing job in a new context.
- You already ship production LLM tooling at Dunelm. This is the qualification
  most applicants are missing, and you have it while thinking of yourself as a
  data engineer who dabbles.
- The MSc means you can go a level deeper than the bootcamp-adjacent competition
  when someone asks why an embedding model behaves as it does.

**Market:** Mentions of LLM engineering in data science listings went from ~3%
to ~12% year on year, and employers posting these roles most aggressively are
also the ones failing to fill them — a hiring shortage, which is what actually
moves salaries. RAG appears in ~65% of applied LLM listings. Over 75% of AI
engineering postings want domain specialisation, and you have deep retail and
fintech domain knowledge.

**Real gaps to close:** evaluation methodology (the highest-signal one), agent
architecture and MCP, vector database and retrieval tuning at production scale,
model serving and monitoring.

**Honest risks:** the title is inconsistently defined, so job specs vary wildly
and some "AI engineer" roles are glorified prompt work. There is froth, and
froth corrects. Mitigate by anchoring on the durable parts — evaluation,
retrieval quality, systems thinking — which survive any correction.

**Assessment:** highest ceiling, best fit to your existing evidence, and the
only path where the target salary sits comfortably inside the band rather than
at its extreme edge. Also the path where the least of your existing experience
is wasted.

---

## Path B — Staff/Principal Data Engineer

**What it is:** Senior individual contributor. Cross-team architecture,
streaming and lakehouse platforms, infrastructure as code, cost engineering,
technical design authority without direct reports.

**Why it appeals:** shortest ramp. You are already doing a decent fraction of
this — leading the warehouse redesign, driving the dbt Cloud transition,
rationalising models to cut Snowflake spend. Very little retraining needed.

**The problem:** the ceiling. Lead and principal data engineering roles cluster
at £85–91k. £100k+ exists but you are fishing in the tail of the distribution,
competing against a deep pool of experienced data engineers, in a discipline
that has become one of the most heavily recruited in the UK — which means supply
has risen to meet demand. This is the path you are effectively already on, and
it is the one producing offers below target.

**Real gaps to close:** streaming and event-driven architecture (Kafka, Flink,
CDC), lakehouse and open table formats, distributed systems fundamentals,
whiteboard system design as a performance.

**Assessment:** lowest risk, lowest ceiling. Viable only if narrowed hard to
high-paying niches — fintech, US-remote, or contract. As a general strategy it
repeats the experiment that has already returned offers below target.

---

## Path C — Head of Data / Engineering Manager

**What it is:** Owning a function. Hiring, performance, roadmap, budget,
stakeholder and board-level communication.

**Why it appeals:** you have done it. Head of Computing, managing a department;
Lead Data Engineer at Nimbus managing four across engineering, analysis and
technical roles. Ten years of professional experience developing other people is
a genuinely differentiated background, and salaries at this level clear £100k
readily.

**The problem:** fully remote leadership roles are comparatively scarce — the
job is disproportionately about presence, informal contact and trust-building,
and organisations know it. It also moves you away from hands-on work
permanently, which is a hard door to reopen after a couple of years. And it is
the path where your recent evidence is weakest: your last people-management role
ended in January 2022.

**Real gaps to close:** recent, demonstrable people leadership; commercial and
budget ownership; hiring at scale.

**Assessment:** credible and well-supported by your history, but poorly matched
to the *remote* constraint. Worth keeping as an opportunistic option rather than
a plan. If a remote Head of Data role appears, you should apply — but do not
spend the 6–12 months preparing for one.

---

## Path D — Contract, outside IR35

Not a career direction so much as an employment shape that can be layered on A
or B.

Remote data engineering contracts outside IR35 currently run roughly
**£475–500/day**, which annualises past £100k gross — though note the take-home
reality: £100k gross as an outside-IR35 contractor nets around £66.6k, so
compare like with like against a permanent package with pension and benefits.
AI-specialist contract rates run higher than general data engineering.

**Trade-offs:** fastest route past the headline £100k, no notice-period friction,
and you would be hired for what you already know. Against that: no employer
learning budget, no progression narrative, income gaps between contracts, and
the market rewards immediate delivery rather than the skill-building this plan
is about.

**Assessment:** a strong *tactical* option, particularly in 12+ months once
AI-specialist skills are established, because AI contract rates exceed data
engineering ones. Poor as a route to skill development. Best used after the
repositioning, not instead of it.

---

## Recommendation

**Path A, with Path B as the floor and Path D as an opportunistic accelerator
later.**

The reasoning, in one line: within data engineering, your target sits above the
top of the band; within AI engineering, it sits comfortably inside it — and you
already hold most of the qualifying evidence without having positioned it that
way.

Three supporting points:

1. **It is a repositioning, not a retraining.** You are not starting over. The
   MSc, the Dunelm agentic CI work, the point-in-time feature engineering and
   the domain depth are already the substance of the case. That is what makes
   this feasible in 5–8 hours a week; a genuine career change would not be.
2. **Path B is the control experiment and it has already run.** It returned
   offers below target. Repeating it with better Kafka knowledge is unlikely to
   change the result, because the constraint is the salary band, not your
   ability.
3. **It preserves the other options.** Getting strong at evaluation, retrieval
   and production ML makes you a *better* staff data engineer too. Path B stays
   fully open. Path C stays open, and is strengthened — "the person who led our
   AI capability" is a far better platform for a future Head of Data role than
   "the person who ran the warehouse". The reverse is not true; two more years
   of pure warehouse work narrows your options rather than widening them.

**The asymmetry is the argument.** Path A's downside is that you become a data
engineer with unusually strong AI skills, which is still a better position than
today. Its upside is a market where your target salary is the median rather than
the ceiling.

---

## How to decide rather than drift

Do not decide from this document alone. Spend weeks 1–4 gathering evidence:

1. **Read 20 real job adverts** — 10 AI engineer, 10 staff data engineer, all
   UK-remote at £100k+. Record actual requirements and stated salary. This
   replaces speculation with data, which is a mode you already trust.
2. **Audit yourself against them.** How many could you apply for today with an
   honest CV? This alone often resolves the question.
3. **Talk to three people** doing the Path A job. Ask what they actually do all
   day and what got them hired.
4. **Build one small thing** — a RAG system with a real evaluation harness, a
   weekend's work — and notice whether you enjoy it. Aptitude without interest
   does not survive 12 months of evening study.

Then commit, and stop reconsidering. The cost of a slightly suboptimal direction
pursued consistently is far lower than the cost of hedging between two.

---

### Sources

- [Data Engineering Jobs — UK market data 2026](https://dataengineeringjobs.co.uk/career-advice/data-engineering-jobs-uk-market-data-2026)
- [IT Jobs Watch — AI engineer, remote/WFH](https://www.itjobswatch.co.uk/jobs/work%20from%20home/artificial%20intelligence%20engineer.do)
- [Digital Waffle — 2026 UK AI salary guide](https://www.digitalwaffle.co/salary-guides/artificial-intelligence-salaries)
- [How to break into AI engineering in 2026](https://medium.com/data-science-collective/how-to-break-into-ai-engineering-in-2026-without-starting-over-246ccdfab5c9)
- [AI engineer skills 2026](https://www.ayautomate.com/blog/ai-engineer-skills-2026)
- [Contractor UK — remote data engineer contracts](https://www.contractoruk.com/data-engineer-contract-jobs/in-remote)
- [AI jobs UK 2026 — contractor day rates and IR35](https://artificialintelligencejobs.co.uk/career-advice/artificial-intelligence-jobs-uk-2026-contractor-day-rates-ir35)
