import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Gaps() {
  const [gaps, setGaps] = useState<any[]>([])

  async function load() {
    const { data } = await supabase.from('gaps').select('*').order('priority')
    setGaps(data || [])
  }

  useEffect(() => {
    load()
  }, [])

  async function setScore(g: any, score: number) {
    setGaps((gs) => gs.map((x) => (x.id === g.id ? { ...x, score } : x)))
    await supabase
      .from('gaps')
      .update({ score, updated_at: new Date().toISOString() })
      .eq('id', g.id)
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Gaps</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          Ordered by what actually costs you money, not by how weak you feel.
          Re-score as evidence changes.
        </p>
      </header>

      <div className="space-y-3">
        {gaps.map((g) => (
          <div key={g.id} className="card p-4">
            <div className="flex items-baseline justify-between gap-3">
              <div className="font-medium text-white">{g.label}</div>
              <div className="text-xs text-slate-600 shrink-0">#{g.priority}</div>
            </div>

            <div className="flex gap-1.5 mt-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setScore(g, n)}
                  className={`flex-1 h-8 rounded-lg text-sm font-medium transition ${
                    n <= g.score
                      ? n >= g.target_score
                        ? 'bg-accent text-ink-900'
                        : 'bg-sky-500/80 text-white'
                      : 'bg-ink-600 text-slate-600'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="text-[11px] text-slate-500 mt-1.5">
              now {g.score} · target {g.target_score}
            </div>

            {g.note && (
              <p className="text-sm text-slate-400 mt-3 leading-relaxed">{g.note}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
