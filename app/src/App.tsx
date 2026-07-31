import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Login from './views/Login'
import Today from './views/Today'
import Plan from './views/Plan'
import Jobs from './views/Jobs'
import Gaps from './views/Gaps'
import Evidence from './views/Evidence'
import Brief from './views/Brief'

const TABS = [
  { key: 'today', label: 'Today', icon: '◎' },
  { key: 'plan', label: 'Plan', icon: '☰' },
  { key: 'jobs', label: 'Jobs', icon: '⌗' },
  { key: 'gaps', label: 'Gaps', icon: '▲' },
  { key: 'log', label: 'Evidence', icon: '✎' },
  { key: 'brief', label: 'Brief', icon: '❖' },
] as const

type TabKey = (typeof TABS)[number]['key']

export default function App() {
  const [session, setSession] = useState<any>(null)
  const [ready, setReady] = useState(false)
  const [tab, setTab] = useState<TabKey>('today')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (!ready) {
    return (
      <div className="min-h-dvh grid place-items-center">
        <div className="animate-pulse text-slate-500 text-sm">Loading…</div>
      </div>
    )
  }

  if (!session) return <Login />

  return (
    <div className="min-h-dvh flex flex-col">
      <main className="flex-1 px-4 pt-5 pb-28 max-w-2xl w-full mx-auto safe-top">
        {tab === 'today' && <Today onNavigate={setTab} />}
        {tab === 'plan' && <Plan />}
        {tab === 'jobs' && <Jobs />}
        {tab === 'gaps' && <Gaps />}
        {tab === 'log' && <Evidence />}
        {tab === 'brief' && <Brief />}
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-ink-800/95 backdrop-blur border-t border-white/5 safe-bottom">
        <div className="max-w-2xl mx-auto grid grid-cols-6">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex flex-col items-center gap-0.5 py-2.5 transition ${
                tab === t.key ? 'text-accent' : 'text-slate-500'
              }`}
            >
              <span className="text-lg leading-none">{t.icon}</span>
              <span className="text-[10px] font-medium">{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
