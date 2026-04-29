import { useEffect, useState } from 'react'
import { LogIn, LogOut } from 'lucide-react'
import { useAuth } from '../auth/AuthContext.jsx'

/**
 * Tiny corner pill for one-time Google sign-in.
 *
 *   - Visible whenever signed-out (so you can scan the URL on your phone
 *     and click sign-in once).
 *   - Once signed in, shrinks to just a circular Google profile avatar.
 *   - Hover to reveal name + email + sign-out option.
 */
export default function AuthPill() {
  const { isAuthed, profile, signIn, signOut } = useAuth()
  const [hovered, setHovered] = useState(false)
  const [revealed, setRevealed] = useState(true)

  // After 5s of being signed in, collapse the pill to a tiny dot.
  useEffect(() => {
    if (!isAuthed) { setRevealed(true); return }
    const id = setTimeout(() => setRevealed(false), 5000)
    return () => clearTimeout(id)
  }, [isAuthed])

  const expanded = !isAuthed || hovered || revealed

  return (
    <div
      className="fixed bottom-5 right-5 z-50"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {!isAuthed ? (
        <button
          onClick={() => signIn()}
          className="glass flex items-center gap-2.5 rounded-full px-4 py-2
                     text-sm font-medium text-white/85 transition
                     hover:text-white hover:bg-white/[0.08]"
        >
          <LogIn className="h-4 w-4" strokeWidth={2} />
          Sign in with Google
        </button>
      ) : (
        <div
          className={`glass flex items-center gap-2.5 rounded-full p-1.5
                      transition-all duration-500 ${expanded ? 'pr-4' : ''}`}
        >
          {/* Google profile avatar — always visible when authed */}
          {profile?.picture ? (
            <img
              src={profile.picture}
              alt={profile?.name ?? 'Account'}
              referrerPolicy="no-referrer"
              className="h-7 w-7 shrink-0 rounded-full ring-2 ring-emerald-400/60
                         shadow-[0_0_10px_rgba(52,211,153,0.4)]"
            />
          ) : (
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center
                         rounded-full bg-emerald-400/20 text-xs font-bold
                         text-emerald-200 ring-2 ring-emerald-400/60"
            >
              {(profile?.name ?? '?').slice(0, 1).toUpperCase()}
            </span>
          )}

          {expanded && (
            <>
              <div className="flex flex-col leading-tight">
                <span className="text-xs font-semibold text-white/85">
                  {profile?.name ?? 'Connected'}
                </span>
                {profile?.email && (
                  <span className="text-[0.65rem] text-white/40">
                    {profile.email}
                  </span>
                )}
              </div>
              <button
                onClick={signOut}
                title="Sign out"
                className="ml-1 flex items-center gap-1 rounded-full
                           bg-white/5 px-2 py-1 text-[0.65rem]
                           uppercase tracking-widest text-white/50
                           hover:bg-white/10 hover:text-white/80"
              >
                <LogOut className="h-3 w-3" strokeWidth={2} />
                Out
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
