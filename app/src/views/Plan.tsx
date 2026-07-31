import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { PHASE_TONE } from '../lib/util'

const ORDER = ['decide', 'reposition', 'build', 'market']

export default function Plan() {
  const [phases, setPhases] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [open, setOpen] = useState<string | null>('decide')

  async function load() {
    const [{ data: p }, { data: t }] = await Promise.all([
      supabase.from('phases').select('*').order('position'),
      supabase.from('tasks').select('*').order('position'),
    ])
    setPhases(p || [])
    setTasks(t || [])
  }

  useEffect(() => {
    load()
  }, [])

  async function toggle(task: any) {
    const nextStatus = task.status === 'done' ? 'todo' : 'done'
    setTasks((ts) =>
      ts.map((x) => (x.id === task.id ? { ...x, status: nextStatus } : x)),
    )
    await supabase
      .from('tasks')
      .update({
        status: nextStatus,
        completed_at: nextStatus === 'done' ? new Date().toISOString() : null,
      })
      .eq('id', task.id)
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-white">The plan</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          Four phases to 30 July 2027. Tap a phase to expand.
        </p>
      </header>

      <div className="space-y-3">
        {phases.map((ph) => {
          const mine = tasks.filter((t) => t.phase_key === ph.key)
          const done = mine.filter((t) => t.status === 'done').length
          const isOpen = open === ph.key
          return (
            <div key={ph.key} className="card overflow-hidden">
              <button
                onClick={() => setOpen(isOpen ? null : ph.key)}
                className="w-full text-left p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className={`chip inline-block mb-1.5 ${PHASE_TONE[ph.key]}`}>
                      weeks {ph.start_week}–{ph.end_week}
                    </div>
                    <div className="font-semibold text-white">{ph.name}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm text-slate-400 tabular-nums">
                      {done}/{mine.length}
                    </div>
                    <div className="text-slate-600 text-xs mt-0.5">
                      {isOpen ? '▲' : '▼'}
                    </div>
                  </div>
                </div>
                {isOpen && ph.summary && (
                  <p className="text-sm text-slate-400 mt-3 leading-relaxed">
                    {ph.summary}
                  </p>
                )}
              </button>

              {isOpen && (
                <div className="border-t border-white/5 divide-y divide-white/5">
                  {mine.map((t) => (
                    <div key={t.id} className="p-4">
                      <div className="flex gap-3">
                        <button
                          onClick={() => toggle(t)}
                          className={`mt-0.5 w-5 h-5 shrink-0 rounded-md border grid place-items-center transition ${
                            t.status === 'done'
                              ? 'bg-accent border-accent text-ink-900'
                              : 'border-slate-600'
                          }`}
                        >
                          {t.status === 'done' && (
                            <span className="text-xs font-bold">✓</span>
                          )}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div
                            className={`font-medium leading-snug ${
                              t.status === 'done'
                                ? 'text-slate-500 line-through'
                                : 'text-white'
                            }`}
                          >
                            {t.title}
                          </div>
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
                          <div className="text-xs text-slate-600 mt-2">~{t.est_hours}h</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
