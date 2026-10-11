import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Label } from '../components/ui'
import { InstallHint } from '../components/InstallHint'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function signIn(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setMsg(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) setMsg(error.message)
  }

  async function magic() {
    if (!email) { setMsg('Enter your email first.'); return }
    setBusy(true); setMsg(null)
    const { error } = await supabase.auth.signInWithOtp({
      email, options: { emailRedirectTo: location.origin + location.pathname, shouldCreateUser: false },
    })
    setBusy(false)
    setMsg(error ? error.message : 'Check your email for the sign-in link.')
  }

  async function signUp() {
    if (!email || password.length < 8) { setMsg('Enter an email and a password of 8+ characters.'); return }
    setBusy(true); setMsg(null)
    const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } })
    setBusy(false)
    setMsg(error ? error.message : data.session ? null : 'Account created. Confirm it from your email, then sign in.')
  }

  return (
    <div className="main"><div className="screen" style={{ paddingBottom: 40 }}>
      <div className="page" style={{ maxWidth: 420, paddingTop: '12vh' }}>
        <div className="hero-light" />
        <div style={{ textAlign: 'center' }}>
          <div className="hero-word" style={{ fontSize: 48 }}>AHMED</div>
          <Label className="dim" >Operating system · v1</Label>
        </div>
        <InstallHint always />
        <form className="panel deep stack" style={{ gap: 12 }} onSubmit={signIn}>
          <Label>Sign in</Label>
          <input className="field" type="email" autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="field" type="password" autoComplete="current-password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className="btn btn-filled btn-big btn-caps" disabled={busy || !password}>Enter</button>
          <div className="row between">
            <button type="button" className="link" onClick={magic} disabled={busy}>Magic link</button>
            <button type="button" className="link" onClick={signUp} disabled={busy}>First time? Create account</button>
          </div>
          {msg && <p className="small muted" style={{ textAlign: 'center' }}>{msg}</p>}
        </form>
      </div>
    </div></div>
  )
}
