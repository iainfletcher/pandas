# Learner Profile — Iain Fletcher

*Compiled 30 July 2026 from CV plus structured intake. This is the baseline the
learning platform plans against. It is meant to be honest rather than
flattering — revise it as evidence changes.*

---

> **Correction, 31 July 2026.** Two figures in this document are superseded.
> Actual comp is **£88,250 base plus an 8–10% bonus (~£95–97k total)**, not the
> £70–85k recorded below. And the "offers below target" in section 2 was one
> process — Lumilinks, Lead Data Engineer — that ended when a **£90–95k ask
> could not be met**, which is a lateral ask against current pay rather than a
> lowball. Both corrections *strengthen* the core finding: the current package
> already sits above the lead/principal data engineering ceiling, so £100k was
> never a real target. The working target is now **£120k**. See
> `docs/career-paths.md` for the band comparison and the app's Brief tab for the
> current version.

## 1. Snapshot

| | |
|---|---|
| **Current role** | Senior Data Engineer, Dunelm (Dec 2022 – present) |
| **Location** | Coventry area, UK |
| **Current comp** | £88,250 base + 8–10% bonus (~£95–97k total) |
| **Target** | £120k+, remote, UK-based |
| **Timeline** | 6–12 months |
| **Study capacity** | 5–8 hours/week |
| **Target role** | AI/ML engineer (committed) |
| **Open to** | Permanent UK, US/EU remote, contract outside IR35 |

**Career arc:** Telecoms engineer (1997) → junior software engineer → secondary
school computing teacher and Head of Department (2007–2017) → MSc Computational
Intelligence, Distinction (2017) → Data Scientist → Lead Data Engineer → Data
Engineer, fintech → Senior Data Engineer, retail.

That 2017 pivot matters. Retraining into data science mid-career, funding an MSc
and finishing with a Distinction plus Engineering Faculty Student of the Year, is
evidence of exactly the trait this plan depends on: you have already done a hard
skills transition once, deliberately, and it worked.

---

## 2. The single most important finding

You are already receiving offers. They are coming in below target.

That distinction reframes the entire problem. A candidate who cannot get offers
has a **capability** problem, and the fix is skill acquisition. A candidate who
gets offers below target has a **market-segment and positioning** problem, and
the fix is different: change which companies you talk to, and change the story
you tell them.

Two market facts sharpen this:

- The median UK data engineer salary is around £70k, with lead and principal
  roles topping out around £85–91k. You are already at or near the ceiling of
  the band your current job title addresses.
- Median advertised salary for remote or hybrid AI engineer roles is roughly
  £91k, with UK senior AI engineers at £90–150k base.

So the offers below target are not a verdict on your ability. They are the
predictable result of applying for roles whose salary band tops out just above
where you already sit. **Grinding harder at data engineering skills cannot fix
this, because the constraint is the band, not the skill.** The plan therefore
has to move you into a differently-priced market, not just make you a better
version of what you already are.

This is good news. It means the 6–12 month runway is spent on repositioning,
which you can control, rather than on hoping to become dramatically more
skilled than the many competent data engineers you are competing with.

---

## 3. Assets

These are real and, in combination, uncommon.

**Formal ML grounding.** MSc Computational Intelligence with Distinction —
neural networks, probabilistic models, optimisation, a CNN dissertation. Most
people currently rebranding as AI engineers do not have this. It is a
credibility anchor when the conversation goes past API calls into why a model
behaves the way it does.

**Production LLM work, already shipped.** Integrating agentic coding assistants
and automated downstream impact analysis into GitLab CI is not a side project;
it is production AI tooling with a measurable engineering-velocity outcome. In a
market where roughly 12% of data science listings now mention LLM engineering
(up from 3% a year earlier) and employers are visibly failing to fill those
roles, this is the most valuable single line on your CV. It is currently buried.

**Genuine data platform depth.** Snowflake, dbt, AWS, Airflow, Terraform, a
Single Customer View built with point-in-time correctness for downstream churn
and propensity models. Point-in-time correctness in particular is feature-store
thinking — it is ML infrastructure, and you should name it as such.

**Communication, taught professionally.** Ten years teaching, including running
a department and developing non-specialist staff. Most engineers claim
communication skills; you were paid to do it, assessed on it, and managed others
doing it. At staff level and above this is the multiplier, not a soft extra.

**Breadth across contexts.** Enterprise retail, scaling fintech, consumer
startup where you owned everything and managed four people. You have seen what
does and does not survive contact with different constraints. This is what
"senior" is actually supposed to mean.

---

## 4. Gaps

You selected all four candidate weak areas: software engineering depth,
streaming and real-time systems, production ML and MLOps, and system design and
communication.

I do not think all four are real, and it is worth saying so plainly, because
believing they are is itself a problem.

**Probably not actually gaps:**

- *System design and communication.* Your CV says you lead architectural
  initiatives, drove a data warehouse redesign, mentor, and "demystify technical
  architecture" — and before that you ran a department and taught complex
  concepts to non-technical audiences for a decade. The evidence points the
  other way. What may genuinely be weak is the **interview performance** of
  system design: the artificial 45-minute whiteboard format, which is a
  learnable performance skill and not the same thing as being good at
  architecture.
- *Software engineering depth.* You maintain and optimise a production Python
  risk engine, work in GitLab CI, and build CI tooling. This is likely
  calibration against an idealised standard rather than a real deficit, though
  testing discipline and API design are worth auditing honestly.

**Probably real:**

- *Production ML and MLOps.* You build the data foundations that models consume,
  which is adjacent to but distinct from owning a model in production —
  serving, monitoring, drift, retraining, experiment tracking. This is a real
  boundary you have not crossed.
- *Streaming and real-time.* Partially covered by the Previse real-time banking
  ingestion work, but Kafka, CDC patterns, exactly-once semantics and
  event-driven architecture are not demonstrated at depth.

**The gap you did not list, and the one that matters most:**

- *Evaluation.* Eval design is reported as the single strongest signal of real
  LLM experience in hiring, and RAG architecture now appears in around 65% of
  applied LLM job listings. "Evaluation" appears on your CV as one word in a
  skills list. If you can talk fluently about how you measure whether an LLM
  system is actually working — offline eval sets, LLM-as-judge and its failure
  modes, regression testing prompts, cost and latency trade-offs — you are
  immediately in a much smaller candidate pool.
- *Visibility.* No public writing, no open-source presence, minimal public
  GitHub activity. For remote roles, and especially for US companies hiring into
  the UK, discoverability and public evidence do a large amount of the work that
  an in-person network does otherwise.

**Calibration note.** The pattern here — strong CV, selects every weakness
offered, takes offers below market — is consistent with systematically
underrating yourself. Treat that as a working hypothesis to test, not a fact.
But if it holds, it is worth more than any technical module in this plan,
because it is directly costing you money at the negotiation stage.

---

## 5. Constraints and risks

- **5–8 hours/week is the real budget.** Roughly 150–400 hours over the runway.
  That is enough for one substantial project plus focused study, and not enough
  for three parallel tracks. Ruthless prioritisation is required.
- **Long current tenure.** Three and a half years at Dunelm is healthy, but the
  narrative needs to show progression *within* the role, not just duration.
- **Career length.** A career starting in 1997 invites age bias in some parts of
  the market, particularly startups. The counter is not competing with
  twenty-somethings on algorithm puzzles; it is positioning on judgement,
  breadth and the ability to lead technical decisions — which is also where the
  money is.
- **Undecided direction.** With a 6–12 month runway this is fine now but
  expensive if unresolved past roughly month two. Deciding is the first
  milestone.

---

## 6. What follows from this

1. **Decide the direction first** (weeks 1–4). See `docs/career-paths.md`.
2. **Fix positioning early, not last.** Your CV currently reads as a data
   engineer who has touched AI. The evidence supports something stronger.
   Positioning is cheap, fast and, given the finding in section 2, the
   highest-leverage single change available.
3. **Close depth gaps through one substantial project rather than courses.**
   Given 5–8 hours/week, a single portfolio system beats scattered study.
4. **Build visibility as a by-product**, not as a separate task — write up what
   the project teaches you as you go.
5. **Treat interviewing and negotiation as a trained skill.** You are already
   getting to offer stage; the marginal return on improving that final stage is
   very high.

---

## 7. Open questions

To be filled in as we go — the platform should prompt for these.

- Where exactly did the recent offers land, and what reason was given?
- Which parts of the Dunelm agentic CI work were yours end to end?
- Is there appetite to move internally into an ML platform role as a stepping
  stone?
- Any hard constraints on travel for occasional on-site work?
- What is the actual walk-away number, as opposed to the target?

---

### Sources

Market figures cited above are drawn from:

- [Data Engineering Jobs — UK market data 2026](https://dataengineeringjobs.co.uk/career-advice/data-engineering-jobs-uk-market-data-2026)
- [IT Jobs Watch — AI engineer, remote/WFH](https://www.itjobswatch.co.uk/jobs/work%20from%20home/artificial%20intelligence%20engineer.do)
- [Digital Waffle — 2026 UK AI salary guide](https://www.digitalwaffle.co/salary-guides/artificial-intelligence-salaries)
- [How to break into AI engineering in 2026](https://medium.com/data-science-collective/how-to-break-into-ai-engineering-in-2026-without-starting-over-246ccdfab5c9)
- [AI engineer skills 2026](https://www.ayautomate.com/blog/ai-engineer-skills-2026)
