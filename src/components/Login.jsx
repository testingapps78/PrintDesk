import { useState } from 'react'
import { supabase, loginIdentifierToEmail } from '../lib/supabase'
import statelifeBadge from '../assets/statelife-badge.png'
import szSymbol from '../assets/sz-symbol.png'
import { Watermark, Credit } from './shared'

export default function Login() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault(); setError('')
    if (!identifier.trim() || !password) { setError('Enter your SSM code or role, and password.'); return }
    setBusy(true)
    const { error: authError } = await supabase.auth.signInWithPassword({ email: loginIdentifierToEmail(identifier), password })
    setBusy(false)
    if (authError) setError('Could not sign in. Check your code and password.')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', padding: '24px 16px' }}>
      <Watermark src={szSymbol} size={620} top={-80} right={-120} opacity={0.04} rotate={-8} />
      <Watermark src={szSymbol} size={420} bottom={-60} left={-100} opacity={0.03} rotate={10} />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 380, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '36px 32px 28px', boxShadow: 'var(--shadow-lift)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
          <img src={statelifeBadge} alt="State Life" style={{ width: 52, height: 52, borderRadius: '50%' }} />
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 600, textAlign: 'center', margin: '0 0 4px', color: 'var(--gold)' }}>PrintDesk</h1>
        <p style={{ textAlign: 'center', margin: '0 0 18px', color: 'var(--text-secondary)', fontSize: 13 }}>Area 9219 · Photocopy &amp; Cash Ledger</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--border-subtle)' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 0 3px var(--success-soft)' }} />
          State Life Insurance Corporation of Pakistan
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 8 }}>SSM code, or "manager" / "clerk"</label>
          <input style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)', padding: '11px 13px', fontSize: 14.5, fontFamily: 'var(--font-ui)', outline: 'none' }} value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="e.g. 292362" autoComplete="username" />
          <label style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 10 }}>Password</label>
          <input type="password" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)', padding: '11px 13px', fontSize: 14.5, fontFamily: 'var(--font-ui)', outline: 'none' }} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
          {error && <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--danger)', background: 'var(--danger-soft)', border: '1px solid rgba(226,101,75,0.3)', borderRadius: 'var(--radius-sm)', padding: '9px 12px' }}>{error}</div>}
          <button type="submit" disabled={busy} style={{ marginTop: 20, background: 'var(--gold)', color: 'var(--text-on-accent)', border: 'none', borderRadius: 'var(--radius-sm)', padding: '12px 16px', fontSize: 14.5, fontWeight: 700, cursor: 'pointer' }}>
            {busy ? 'Signing in…' : 'Log in'}
          </button>
        </form>
        <p style={{ marginTop: 20, fontSize: 11.5, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6 }}>Same code and password as Policy Records.<br />Forgotten password? Contact the office clerk.</p>
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}><Credit szSymbol={szSymbol} /></div>
    </div>
  )
}
