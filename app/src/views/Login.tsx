import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErr('')
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error) setErr(error.message)
    setBusy(false)
  }

  return (
    <div className="min-h-dvh grid place-items-center px-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4">
        <div className="mb-8">
          <div className="text-accent text-3xl font-semibold tracking-tight">levelup</div>
          <p className="text-slate-400 text-sm mt-1.5">
            Senior Data Engineer → £100k+ remote.
          </p>
        </div>

        <input
          className="field"
          type="email"
          inputMode="email"
          autoComplete="username"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="field"
          type="password"
          autoComplete="current-password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {err && <p className="text-rose-400 text-sm">{err}</p>}

        <button className="btn-primary w-full" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
