import { useCallback, useEffect, useRef, useState } from 'react'
import { useGoogleLogin } from '@react-oauth/google'
import axios from 'axios'

/**
 * Tiny client-side Google auth hook for a personal TV dashboard.
 *
 *  - Implicit token flow (Google Identity Services).
 *  - Token + expiry persisted in localStorage so the TV stays signed in
 *    across reboots forever (until the user revokes access).
 *  - Silently re-issues a fresh access token ~5 min before it expires
 *    using `prompt=''` — no popups, no user interaction after the
 *    initial one-time sign-in.
 *  - If silent renewal ever fails, we drop back to the unauthenticated
 *    state and the widgets transparently use mock data.
 */

const STORAGE_KEY = 'tv_dashboard_google_token'

// Read-only scopes — minimum needed for Calendar + Gmail widgets,
// plus openid+profile so we can show the user's avatar in the AuthPill.
export const GOOGLE_SCOPES = [
  'openid',
  'profile',
  'email',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/gmail.readonly'
].join(' ')

const PROFILE_KEY = 'tv_dashboard_google_profile'

const loadStored = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.access_token || !parsed?.expires_at) return null
    return parsed
  } catch {
    return null
  }
}

const saveStored = (val) => {
  if (val) localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
  else     localStorage.removeItem(STORAGE_KEY)
}

const loadProfile = () => {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY) ?? 'null') }
  catch { return null }
}

export function useGoogleAuth() {
  const [auth, setAuth] = useState(loadStored)
  const [profile, setProfile] = useState(loadProfile)
  const renewTimer = useRef(null)

  const handleSuccess = useCallback((res) => {
    // res.expires_in is seconds; pad with -60s safety margin.
    const expires_at = Date.now() + (res.expires_in - 60) * 1000
    const next = {
      access_token: res.access_token,
      expires_at,
      scope: res.scope
    }
    saveStored(next)
    setAuth(next)
  }, [])

  const handleError = useCallback((err) => {
    console.warn('[GoogleAuth] failed:', err)
    saveStored(null)
    setAuth(null)
  }, [])

  // Interactive sign-in (only used the very first time on this device)
  const interactiveLogin = useGoogleLogin({
    flow: 'implicit',
    scope: GOOGLE_SCOPES,
    onSuccess: handleSuccess,
    onError: handleError
  })

  // Silent renewal — same flow but with prompt=''
  // (Google will return a token without showing UI as long as the user
  //  has previously granted these scopes and is still signed into Google.)
  const silentLogin = useGoogleLogin({
    flow: 'implicit',
    scope: GOOGLE_SCOPES,
    prompt: '',
    onSuccess: handleSuccess,
    onError: handleError
  })

  const signIn  = useCallback(() => interactiveLogin(), [interactiveLogin])
  const signOut = useCallback(() => {
    saveStored(null)
    localStorage.removeItem(PROFILE_KEY)
    setAuth(null)
    setProfile(null)
  }, [])

  // Fetch the Google user profile (name + picture) whenever we have a fresh token.
  useEffect(() => {
    if (!auth?.access_token) return
    let cancelled = false
    axios
      .get('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${auth.access_token}` }
      })
      .then((r) => {
        if (cancelled) return
        const p = {
          name:    r.data.name,
          email:   r.data.email,
          picture: r.data.picture
        }
        localStorage.setItem(PROFILE_KEY, JSON.stringify(p))
        setProfile(p)
      })
      .catch((err) => console.warn('[GoogleAuth] userinfo failed:', err.message))
    return () => { cancelled = true }
  }, [auth?.access_token])

  // Schedule silent renewal before the current token expires.
  useEffect(() => {
    if (renewTimer.current) clearTimeout(renewTimer.current)
    if (!auth?.expires_at) return

    const msUntilRenew = Math.max(auth.expires_at - Date.now() - 5 * 60 * 1000, 0)
    renewTimer.current = setTimeout(() => silentLogin(), msUntilRenew)

    return () => clearTimeout(renewTimer.current)
  }, [auth?.expires_at, silentLogin])

  // On mount: if stored token is already expired, try a silent renew.
  useEffect(() => {
    if (auth && auth.expires_at <= Date.now()) silentLogin()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isAuthed =
    !!auth?.access_token && auth.expires_at > Date.now()

  return {
    token: isAuthed ? auth.access_token : null,
    profile,
    isAuthed,
    signIn,
    signOut
  }
}
