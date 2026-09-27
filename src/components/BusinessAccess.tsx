import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { businessSupabase } from '../lib/businessSupabase'

/** Keep business queries unmounted until the database owner's session is verified.
 * RLS is the security boundary; this gate avoids exposing controls or cached data.
 */
export default function BusinessAccess({ children }: { children: ReactNode }) {
  const ownerId = import.meta.env.VITE_BUSINESS_OWNER_ID as string | undefined
  const cache = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const { data: { subscription } } = businessSupabase.auth.onAuthStateChange((_event, next) => {
      if (!active) return
      setSession(next)
      setLoading(false)
      if (!next) cache.clear()
    })
    return () => { active = false; subscription.unsubscribe() }
  }, [cache])

  /** The service emails the code only after the owner explicitly requests it. */
  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = sent
        ? await businessSupabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' })
        : await businessSupabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false } })
      if (result.error) throw result.error
      setSent(true)
    } catch {
      setError(sent ? 'The code could not be verified. Check it or request a new one.' : 'Unable to send a code. Use the authorised business email and try again.')
    } finally { setBusy(false) }
  }

  /** Clear private query results as well as the persisted login on sign-out. */
  async function signOut() {
    const { error: signOutError } = await businessSupabase.auth.signOut({ scope: 'local' })
    if (signOutError) { setError('Unable to sign out. Please try again.'); return }
    setSession(null)
    cache.clear()
    setCode('')
    setSent(false)
  }

  if (loading) return <p role="status" style={{ padding: 32 }}>Checking business access…</p>
  if (ownerId && session?.user.id === ownerId) return <>
    <div style={{ textAlign: 'right', padding: '12px 24px' }}>
      <button onClick={signOut}>Sign out of business</button>
      {error && <p role="alert">{error}</p>}
    </div>
    {children}
  </>

  return <section style={{ maxWidth: 440, margin: '48px auto', padding: 24, color: 'var(--ink)' }}>
    <h1 style={{ fontFamily: 'var(--font-display)' }}>Business sign-in</h1>
    {!ownerId ? <p role="alert">Business access is being configured. Please try again later.</p>
      : session ? <><p>This account does not have business access.</p><button onClick={signOut}>Use another account</button></>
        : <form onSubmit={submit} style={{ display: 'grid', gap: 16 }}>
          <p>Sign in to view your business records and invoices.</p>
          <label>Email address
            <input aria-label="Email address" type="email" autoComplete="email" required value={email} disabled={sent || busy}
              onChange={event => setEmail(event.target.value)} style={{ display: 'block', width: '100%', padding: 12, boxSizing: 'border-box' }} />
          </label>
          {sent && <><p role="status">Check your email for a sign-in code.</p><label>Sign-in code
            <input aria-label="Sign-in code" inputMode="numeric" autoComplete="one-time-code" required value={code}
              onChange={event => setCode(event.target.value)} style={{ display: 'block', width: '100%', padding: 12, boxSizing: 'border-box' }} />
          </label></>}
          <button type="submit" disabled={busy}>{busy ? 'Please wait…' : sent ? 'Sign in' : 'Email me a code'}</button>
          {sent && <button type="button" disabled={busy} onClick={() => { setSent(false); setCode(''); setError('') }}>Request a new code</button>}
        </form>}
    {error && <p role="alert">{error}</p>}
  </section>
}
