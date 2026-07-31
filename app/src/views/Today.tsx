import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { PHASE_TONE, fmtHours, today, weekStart, weeksBetween } from '../lib/util'

export default function Today({ onNavigate }: { onNavigate: (t: any) => void }) {
  const [profile, setProfile] = useState<any>(null)
  const [next, setNext] = useState<any[]>([])
  const [weekMinutes, setWeekMinutes] = useState(0)
  const [totals, setTotals] = useState({ done: 0, all: 0 })
  const [minutes, setMinutes] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    const [{ data: p }, { data: tasks }, { data: logs }, { data: counts }] =
      await Promise.all([
        supabase.from('profile').select('*').maybeSingle(),
        supabase
          .from('tasks')
          .select('*, phases(name)')
          .neq('status', 'done')
          .neq('status', 'skipped')
          .order('phase_key', { ascending: true })
          .order('position', { ascending: true })
          .limit(50),
        supabase.from('work_log').select('minutes').gte('logged_on', weekStart()),
        supabase.from('tasks').select('status'),
      ])

    setProfile(p)
    // phases sort alphabetically, so re-order by the plan's real sequence
    const order = ['decide', 'reposition', 'build', 'market']
    const sorted = (tasks || []).sort(
      (a: any, b: any) =>
        order.indexOf(a.phase_key) - order.indexOf(b.phase_key) || a.position - b.position,
    )
    setNext(sorted.slice(0, 3))
    setWeekMinutes((logs || []).reduce((s: number, r: any) => s + r.minutes, 0))
    setTotals({
      done: (counts || []).filter((t: any) => t.status === 'done').length,
      all: (counts || []).length,
    })
  }

  useEffect(() => {
    load()
  }, [])

  async function logWork(e: React.FormEvent) {
    e.preventDefault()
    const m = parseFloat(minutes)
    if (!m || m <= 0) return
    setSaving(true)
    await supabase.from('work_log').insert({
      minutes: Math.round(m * 60),
      note: note.trim() || null,
      logged_on: today(),
    })
    setMinutes('')
    setNote('')
    setSaving(false)
    load()
  }

  async function complete(id: string) {
    await supabase
      .from('tasks')
      .update({ status: 'done', completed_at: new Date().toISOString() })
      .eq('id', id)
    load()
  }

  const weeksLeft = profile
    ? weeksBetween(today(), profile.target_date)
    : null
  const target = profile ? (profile.weekly_hours_min + profile.weekly_hours_max) / 2 : 6.5
  const pct = Math.min(100, Math.round((weekMinutes / 60 / target) * 100))

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          {greeting()}, Iain
        </h1>
        <p className="text-slate-400 text-sm mt-0.5">
          {weeksLeft !== null
            ? `${weeksLeft} weeks left on the runway`
            : 'Setting up…'}
        </p>
      </header>

      {!profile?.chosen_path && (
        <div className="card p-4 border-amber-300/20 bg-amber-300/5">
          <div className="chip text-amber-300 bg-amber-300/10 inline-block mb-2">
            Blocking
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            You haven't committed to a direction yet. Everything after the first
            phase is blocked on it, and it gets expensive if it drifts past month
            two. Work the <span className="text-amber-200">Decide</span> tasks first.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <div className="text-slate-400 text-xs font-medium uppercase tracking-wider">
            This week
          </div>
          <div className="text-2xl font-semibold text-white mt-1.5">
            {fmtHours(weekMinutes)}
          </div>
          <div className="h-1.5 bg-ink-600 rounded-full mt-2.5 overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-500 mt-1.5">
            target {target}h
          </div>
        </div>

        <div className="card p-4">
          <div className="text-slate-400 text-xs font-medium uppercase tracking-wider">
            Tasks done
          </div>
          <div className="text-2xl font-semibold text-white mt-1.5">
            {totals.done}
            <span className="text-slate-500 text-base font-normal">/{totals.all}</span>
          </div>
          <div className="h-1.5 bg-ink-600 rounded-full mt-2.5 overflow-hidden">
            <div
              className="h-full bg-sky-400 rounded-full transition-all"
              style={{ width: `${totals.all ? (totals.done / totals.all) * 100 : 0}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-500 mt-1.5">across all phases</div>
        </div>
      </div>

      <section>
        <div className="flex items-baseline justify-between mb-2.5">
          <h2 className="font-semibold text-white">Do next</h2>
          <button
            onClick={() => onNavigate('plan')}
            className="text-xs text-accent font-medium"
          >
            Full plan →
          </button>
        </div>

        <div className="space-y-2.5">
          {next.length === 0 && (
            <div className="card p-4 text-sm text-slate-400">
              Nothing outstanding. Either you're done or the plan needs refreshing.
            </div>
          )}
          {next.map((t) => (
            <div key={t.id} className="card p-4">
              <div
                className={`chip inline-block mb-2 ${PHASE_TONE[t.phase_key] || ''}`}
              >
                {t.phase_key}
              </div>
              <div className="font-medium text-white leading-snug">{t.title}</div>
              {t.detail && (
                <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">
                  {t.detail}
                </p>
              )}
              {t.why && (
                <p className="text-sm text-slate-500 mt-2 leading-relaxed italic border-l-2 border-white/10 pl-3">
                  {t.why}
                </p>
              )}
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-slate-500">~{t.est_hours}h</span>
                <button onClick={() => complete(t.id)} className="btn-ghost text-sm py-1.5">
                  Mark done
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-4">
        <h2 className="font-semibold text-white mb-3">Log time</h2>
        <form onSubmit={logWork} className="space-y-2.5">
          <div className="flex gap-2.5">
            <input
              className="field flex-1"
              type="number"
              step="0.25"
              inputMode="decimal"
              placeholder="Hours"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            />
            <button className="btn-primary px-5" disabled={saving}>
              {saving ? '…' : 'Log'}
            </button>
          </div>
          <input
            className="field"
            placeholder="What did you work on? (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </form>
      </section>

      <button
        onClick={() => supabase.auth.signOut()}
        className="text-xs text-slate-600 w-full py-2"
      >
        Sign out
      </button>
    </div>
  )
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Morning'
  if (h < 18) return 'Afternoon'
  return 'Evening'
}
