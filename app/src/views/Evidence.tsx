import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { fmtHours, relativeDay, today } from '../lib/util'

const KINDS = [
  { key: 'shipped', label: 'Shipped', tone: 'text-accent bg-accent/10' },
  { key: 'wrote', label: 'Wrote', tone: 'text-sky-300 bg-sky-300/10' },
  { key: 'learned', label: 'Learned', tone: 'text-amber-300 bg-amber-300/10' },
  { key: 'talked', label: 'Talked to', tone: 'text-violet-300 bg-violet-300/10' },
  { key: 'applied', label: 'Applied', tone: 'text-orange-300 bg-orange-300/10' },
  { key: 'interviewed', label: 'Interviewed', tone: 'text-rose-300 bg-rose-300/10' },
]

export default function Evidence() {
  const [items, setItems] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [form, setForm] = useState({ kind: 'shipped', title: '', detail: '', link: '' })
  const [adding, setAdding] = useState(false)

  async function load() {
    const [{ data: e }, { data: l }] = await Promise.all([
      supabase.from('evidence').select('*').order('happened_on', { ascending: false }),
      supabase
        .from('work_log')
        .select('*')
        .order('logged_on', { ascending: false })
        .limit(20),
    ])
    setItems(e || [])
    setLogs(l || [])
  }

  useEffect(() => {
    load()
  }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    await supabase.from('evidence').insert({
      ...form,
      detail: form.detail || null,
      link: form.link || null,
      happened_on: today(),
    })
    setForm({ kind: 'shipped', title: '', detail: '', link: '' })
    setAdding(false)
    load()
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Evidence</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          Everything here becomes CV bullets and interview answers. Log it while
          you remember the detail.
        </p>
      </header>

      {!adding && (
        <button onClick={() => setAdding(true)} className="btn-primary w-full">
          Add evidence
        </button>
      )}

      {adding && (
        <form onSubmit={save} className="card p-4 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {KINDS.map((k) => (
              <button
                key={k.key}
                type="button"
                onClick={() => setForm({ ...form, kind: k.key })}
                className={`py-2 rounded-lg text-xs font-medium transition ${
                  form.kind === k.key
                    ? 'bg-accent text-ink-900'
                    : 'bg-ink-600 text-slate-400'
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>
          <input
            className="field"
            placeholder="What happened"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <textarea
            className="field min-h-24"
            placeholder="Detail — what you did, what changed, what you would say about it in an interview"
            value={form.detail}
            onChange={(e) => setForm({ ...form, detail: e.target.value })}
          />
          <input
            className="field"
            placeholder="Link (optional)"
            value={form.link}
            onChange={(e) => setForm({ ...form, link: e.target.value })}
          />
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="btn-ghost flex-1"
            >
              Cancel
            </button>
            <button className="btn-primary flex-1">Save</button>
          </div>
        </form>
      )}

      <div className="space-y-2.5">
        {items.map((it) => {
          const k = KINDS.find((x) => x.key === it.kind)
          return (
            <div key={it.id} className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`chip ${k?.tone}`}>{k?.label}</span>
                <span className="text-xs text-slate-600">
                  {relativeDay(it.happened_on)}
                </span>
              </div>
              <div className="font-medium text-white leading-snug">{it.title}</div>
              {it.detail && (
                <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">
                  {it.detail}
                </p>
              )}
              {it.link && (
                <a
                  href={it.link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-accent mt-2 inline-block"
                >
                  Open →
                </a>
              )}
            </div>
          )
        })}
      </div>

      {logs.length > 0 && (
        <section>
          <h2 className="font-semibold text-white mb-2.5">Recent sessions</h2>
          <div className="card divide-y divide-white/5">
            {logs.map((l) => (
              <div key={l.id} className="px-4 py-3 flex items-baseline gap-3">
                <span className="text-sm text-white tabular-nums w-12 shrink-0">
                  {fmtHours(l.minutes)}
                </span>
                <span className="text-sm text-slate-400 flex-1 min-w-0">
                  {l.note || <span className="text-slate-600">No note</span>}
                </span>
                <span className="text-xs text-slate-600 shrink-0">
                  {relativeDay(l.logged_on)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
