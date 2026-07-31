import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const TRACKS = [
  { key: 'ai_engineer', label: 'AI engineer' },
  { key: 'staff_data_engineer', label: 'Staff DE' },
  { key: 'other', label: 'Other' },
]

const blank = {
  track: 'ai_engineer',
  title: '',
  company: '',
  url: '',
  salary_text: '',
  salary_max: '',
  requirements: '',
  match_score: 3,
  could_apply_today: false,
  notes: '',
}

export default function Jobs() {
  const [ads, setAds] = useState<any[]>([])
  const [form, setForm] = useState<any>(blank)
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)

  async function load() {
    const { data } = await supabase
      .from('job_ads')
      .select('*')
      .order('created_at', { ascending: false })
    setAds(data || [])
  }

  useEffect(() => {
    load()
  }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setBusy(true)
    await supabase.from('job_ads').insert({
      ...form,
      salary_max: form.salary_max ? parseInt(form.salary_max, 10) : null,
      company: form.company || null,
      url: form.url || null,
      salary_text: form.salary_text || null,
      requirements: form.requirements || null,
      notes: form.notes || null,
    })
    setForm(blank)
    setAdding(false)
    setBusy(false)
    load()
  }

  async function remove(id: string) {
    await supabase.from('job_ads').delete().eq('id', id)
    load()
  }

  const counts = TRACKS.map((t) => ({
    ...t,
    n: ads.filter((a) => a.track === t.key).length,
  }))
  const applicable = ads.filter((a) => a.could_apply_today).length

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Job ads</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          Ten of each, £100k+ and UK-remote. Take them as they come — don't filter
          for the ones you like the look of.
        </p>
      </header>

      <div className="card p-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          {counts.map((c) => (
            <div key={c.key}>
              <div className="text-xl font-semibold text-white tabular-nums">
                {c.n}
                {c.key !== 'other' && (
                  <span className="text-slate-600 text-sm font-normal">/10</span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">{c.label}</div>
            </div>
          ))}
        </div>
        {ads.length > 0 && (
          <p className="text-sm text-slate-400 mt-4 pt-4 border-t border-white/5 leading-relaxed">
            You could apply for{' '}
            <span className="text-white font-medium">
              {applicable} of {ads.length}
            </span>{' '}
            today with an honest CV.
            {ads.length >= 10 &&
              ' That number is the answer to the direction question.'}
          </p>
        )}
      </div>

      {!adding && (
        <button onClick={() => setAdding(true)} className="btn-primary w-full">
          Add an advert
        </button>
      )}

      {adding && (
        <form onSubmit={save} className="card p-4 space-y-3">
          <div className="flex gap-2">
            {TRACKS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setForm({ ...form, track: t.key })}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition ${
                  form.track === t.key
                    ? 'bg-accent text-ink-900'
                    : 'bg-ink-600 text-slate-400'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <input
            className="field"
            placeholder="Job title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <input
            className="field"
            placeholder="Company"
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
          />
          <div className="flex gap-2.5">
            <input
              className="field flex-1"
              placeholder="Salary as stated"
              value={form.salary_text}
              onChange={(e) => setForm({ ...form, salary_text: e.target.value })}
            />
            <input
              className="field w-28"
              type="number"
              inputMode="numeric"
              placeholder="Max £"
              value={form.salary_max}
              onChange={(e) => setForm({ ...form, salary_max: e.target.value })}
            />
          </div>
          <input
            className="field"
            placeholder="Link"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
          />
          <textarea
            className="field min-h-24"
            placeholder="What it actually asks for"
            value={form.requirements}
            onChange={(e) => setForm({ ...form, requirements: e.target.value })}
          />

          <div>
            <div className="text-xs text-slate-400 mb-1.5">
              How well do you match? Be strict.
            </div>
            <div className="flex gap-1.5">
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setForm({ ...form, match_score: n })}
                  className={`flex-1 h-9 rounded-lg text-sm font-medium ${
                    form.match_score === n
                      ? 'bg-sky-500 text-white'
                      : 'bg-ink-600 text-slate-500'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2.5 py-1">
            <input
              type="checkbox"
              className="w-5 h-5 accent-teal-400"
              checked={form.could_apply_today}
              onChange={(e) =>
                setForm({ ...form, could_apply_today: e.target.checked })
              }
            />
            <span className="text-sm text-slate-300">
              I could apply for this today, honestly
            </span>
          </label>

          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => {
                setAdding(false)
                setForm(blank)
              }}
              className="btn-ghost flex-1"
            >
              Cancel
            </button>
            <button className="btn-primary flex-1" disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2.5">
        {ads.map((a) => (
          <div key={a.id} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-white leading-snug">{a.title}</div>
                <div className="text-sm text-slate-400 mt-0.5">
                  {a.company || 'Unknown'}
                  {a.salary_text && ` · ${a.salary_text}`}
                </div>
              </div>
              <button
                onClick={() => remove(a.id)}
                className="text-slate-600 text-lg leading-none shrink-0 px-1"
              >
                ×
              </button>
            </div>

            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
              <span className="chip bg-ink-600 text-slate-400">
                {TRACKS.find((t) => t.key === a.track)?.label}
              </span>
              <span className="chip bg-sky-400/10 text-sky-300">
                match {a.match_score}/5
              </span>
              {a.could_apply_today && (
                <span className="chip bg-accent/10 text-accent">could apply now</span>
              )}
            </div>

            {a.requirements && (
              <p className="text-sm text-slate-400 mt-2.5 leading-relaxed">
                {a.requirements}
              </p>
            )}
            {a.url && (
              <a
                href={a.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-accent mt-2 inline-block"
              >
                Open advert →
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
