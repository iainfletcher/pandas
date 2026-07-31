import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const PATHS = [
  { key: 'ai_ml_engineer', label: 'AI/ML engineer', note: 'Recommended' },
  { key: 'staff_data_engineer', label: 'Staff/principal DE', note: 'The floor' },
  { key: 'head_of_data', label: 'Head of data', note: 'Opportunistic' },
  { key: 'contract', label: 'Contract, outside IR35', note: 'Later' },
]

export default function Brief() {
  const [profile, setProfile] = useState<any>(null)
  const [walkAway, setWalkAway] = useState('')

  async function load() {
    const { data } = await supabase.from('profile').select('*').maybeSingle()
    setProfile(data)
    setWalkAway(data?.walk_away_number ? String(data.walk_away_number) : '')
  }

  useEffect(() => {
    load()
  }, [])

  async function choose(key: string) {
    setProfile((p: any) => ({ ...p, chosen_path: key }))
    await supabase
      .from('profile')
      .update({ chosen_path: key, updated_at: new Date().toISOString() })
      .eq('user_id', profile.user_id)
  }

  async function saveWalkAway() {
    const n = parseInt(walkAway, 10)
    if (!n) return
    await supabase
      .from('profile')
      .update({ walk_away_number: n, updated_at: new Date().toISOString() })
      .eq('user_id', profile.user_id)
    load()
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-white">The brief</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          Why this plan looks the way it does.
        </p>
      </header>

      <section className="card p-4">
        <div className="chip inline-block bg-rose-400/10 text-rose-300 mb-2.5">
          The core finding
        </div>
        <p className="text-slate-300 text-sm leading-relaxed">
          You are already getting offers. They come in below target. That is not a
          capability problem — a candidate who can't get offers has one of those.
          It is a <span className="text-white font-medium">pricing problem</span>.
        </p>
        <p className="text-slate-300 text-sm leading-relaxed mt-3">
          Median UK data engineer pay is about £70k. Lead and principal roles top
          out around £85–91k. You are on £70–85k, which means you are already near
          the ceiling of the band your job title addresses. £100k isn't the middle
          of the range you're climbing — it's above the top of it.
        </p>
        <p className="text-slate-300 text-sm leading-relaxed mt-3">
          Median advertised pay for a remote AI engineer is about £91k, with UK
          seniors at £90–150k base.{' '}
          <span className="text-white font-medium">
            The gap between those two distributions is the whole strategy.
          </span>{' '}
          Getting better at data engineering cannot fix a band ceiling.
        </p>
      </section>

      <section className="card p-4">
        <h2 className="font-semibold text-white mb-2.5">What you already have</h2>
        <ul className="text-sm text-slate-400 space-y-2 leading-relaxed">
          <li>
            <span className="text-slate-200">MSc Computational Intelligence, Distinction.</span>{' '}
            Most people rebranding into AI engineering have no formal ML grounding.
          </li>
          <li>
            <span className="text-slate-200">Production LLM tooling, already shipped.</span>{' '}
            Agentic assistants and automated impact analysis in GitLab CI. This is
            the most valuable line on your CV and it is currently one bullet.
          </li>
          <li>
            <span className="text-slate-200">Feature engineering, misnamed.</span>{' '}
            Point-in-time correctness on the Single Customer View is ML
            infrastructure. Call it that.
          </li>
          <li>
            <span className="text-slate-200">Ten years teaching.</span> Communication
            is the staff-level multiplier and you were professionally assessed on it.
          </li>
        </ul>
      </section>

      <section className="card p-4">
        <h2 className="font-semibold text-white mb-2.5">A calibration warning</h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          When asked, you selected every weakness on offer. Your CV contradicts at
          least two of them — you lead architecture initiatives and taught complex
          material for a decade, so "system design and communication" is not
          plausibly a weakness. What may be weak is the artificial 45-minute
          whiteboard format, which is a different and learnable thing.
        </p>
        <p className="text-sm text-slate-400 leading-relaxed mt-3">
          Strong CV, every weakness selected, offers below market accepted. If that
          pattern is what it looks like, it is costing you more than any technical
          gap on the list. Treat it as a hypothesis to test.
        </p>
      </section>

      <section className="card p-4">
        <h2 className="font-semibold text-white mb-3">Direction</h2>
        <div className="space-y-2">
          {PATHS.map((p) => (
            <button
              key={p.key}
              onClick={() => choose(p.key)}
              className={`w-full text-left px-3.5 py-3 rounded-xl border transition ${
                profile?.chosen_path === p.key
                  ? 'bg-accent/10 border-accent/40'
                  : 'bg-ink-700 border-transparent'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className={`font-medium ${
                    profile?.chosen_path === p.key ? 'text-accent' : 'text-slate-200'
                  }`}
                >
                  {p.label}
                </span>
                <span className="text-[11px] text-slate-500 shrink-0">{p.note}</span>
              </div>
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-3 leading-relaxed">
          Don't pick from this screen alone — work the Decide tasks first, then
          commit and stop reconsidering. Hedging costs more than a slightly wrong
          choice pursued consistently.
        </p>
      </section>

      <section className="card p-4">
        <h2 className="font-semibold text-white mb-1.5">Walk-away number</h2>
        <p className="text-sm text-slate-400 leading-relaxed mb-3">
          Not the target — the number below which you say no. Decided in advance
          and written down, it is the best defence against taking another offer
          below target.
        </p>
        <div className="flex gap-2.5">
          <input
            className="field flex-1"
            type="number"
            inputMode="numeric"
            placeholder="£"
            value={walkAway}
            onChange={(e) => setWalkAway(e.target.value)}
          />
          <button onClick={saveWalkAway} className="btn-primary px-5">
            Save
          </button>
        </div>
        {profile?.walk_away_number && (
          <p className="text-sm text-accent mt-2.5">
            Committed: £{profile.walk_away_number.toLocaleString()}
          </p>
        )}
      </section>
    </div>
  )
}
