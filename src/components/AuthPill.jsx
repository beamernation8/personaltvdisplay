import { useEffect, useState } from 'react'
import { LogIn, CheckCircle2, LogOut } from 'lucide-react'
import { useAuth } from '../auth/AuthContext.jsx'

/**
 * Tiny corner pill for one-time Google sign-in.
 *
 *   - Visible whenever signed-out (so you can scan the URL on your phone
 *     and click sign-in once).
 *   - Auto-fades to a subtle dot when authed so it doesn't clutter the TV.
 *   - Hover to reveal a sign-out option.
 */
export default function AuthPill() {
  const { isAuthed, signIn, signOut } = useAuth()
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
          className={`glass flex items-center gap-2 rounded-full
                      transition-all duration-500 ${
                        expanded
                          ? 'px-3.5 py-1.5 text-xs text-white/70'
                          : 'p-1.5 text-transparent'
                      }`}
        >
          <CheckCircle2
            className={`shrink-0 text-emerald-300 transition-all ${
              expanded ? 'h-3.5 w-3.5' : 'h-2 w-2'
            }`}
            strokeWidth={2.5}
          />
          {expanded && (
            <>
              <span>Google connected</span>
              <button
                onClick={signOut}
                className="ml-2 flex items-center gap-1 rounded-full
                           bg-white/5 px-2 py-0.5 text-[0.65rem]
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
