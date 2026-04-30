import { useEffect, useState } from 'react'
import { LogOut } from 'lucide-react'
import { useAuth } from '../auth/AuthContext.jsx'
import { usePWAInstall } from '../hooks/usePWAInstall.js'

/* ── Inline brand SVGs ───────────────────────────────────────────── */
function FireTVIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M11.97 1C6.01 1 1.13 5.9 1.13 11.85c0 3.42 1.56 6.48 4.02 8.52l.8-.93C3.85 17.6 2.5 14.87 2.5 11.85 2.5 6.66 6.78 2.38 11.97 2.38c5.19 0 9.47 4.28 9.47 9.47 0 3.02-1.35 5.75-3.45 7.59l.8.93c2.46-2.04 4.02-5.1 4.02-8.52C22.81 5.9 17.93 1 11.97 1z"/>
      <path d="M11.97 5.5c-3.5 0-6.35 2.85-6.35 6.35 0 2.1.99 3.97 2.52 5.19l.8-.93a5 5 0 0 1-1.95-3.96c0-2.76 2.22-4.98 4.98-4.98s4.98 2.22 4.98 4.98a5 5 0 0 1-1.95 3.96l.8.93c1.53-1.22 2.52-3.09 2.52-5.19 0-3.5-2.85-6.35-6.35-6.35z"/>
      <circle cx="11.97" cy="11.85" r="2.1"/>
      <path d="M10.7 15.5h2.54v6.5H10.7z"/>
    </svg>
  )
}

function GoogleTVIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M21 3H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5l-1 2h8l-1-2h5a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 14H3V5h18v12z"/>
      <circle cx="12" cy="11" r="1.25"/>
    </svg>
  )
}

/* ── AuthPill ────────────────────────────────────────────────────── */
export default function AuthPill() {
  const { isAuthed, profile, signIn, signOut } = useAuth()
  const { canInstall, install } = usePWAInstall()
  const [hovered, setHovered] = useState(false)
  const [revealed, setRevealed] = useState(true)

  useEffect(() => {
    if (!isAuthed) { setRevealed(true); return }
    const id = setTimeout(() => setRevealed(false), 5000)
    return () => clearTimeout(id)
  }, [isAuthed])

  const menuOpen = hovered
  const pillExpanded = !isAuthed || hovered || revealed

  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Hover menu — slides in above the pill ── */}
      <div
        className={`flex flex-col items-end gap-1.5 transition-all duration-300 origin-bottom-right
                    ${menuOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'}`}
      >
        {/* Download APK */}
        <a
          href="/personaltvdisplay.apk"
          download
          className="glass flex items-center gap-2.5 rounded-full px-3.5 py-2
                     text-white/75 transition hover:text-white hover:bg-white/[0.08] no-underline"
        >
          <FireTVIcon className="h-3.5 w-3.5 shrink-0 text-orange-400/80" />
          <span className="flex flex-col leading-none">
            <span className="text-[0.75rem] font-semibold text-white/85">Download APK</span>
            <span className="text-[0.58rem] text-white/40 mt-0.5">Fire TV · Android TV</span>
          </span>
        </a>

        {/* Install PWA — only when browser supports it */}
        {canInstall && (
          <button
            onClick={install}
            className="glass flex items-center gap-2.5 rounded-full px-3.5 py-2
                       text-white/75 transition hover:text-white hover:bg-white/[0.08]"
          >
            <GoogleTVIcon className="h-3.5 w-3.5 shrink-0 text-blue-400/80" />
            <span className="flex flex-col leading-none">
              <span className="text-[0.75rem] font-semibold text-white/85">Install App</span>
              <span className="text-[0.58rem] text-white/40 mt-0.5">Google TV · Chrome</span>
            </span>
          </button>
        )}

        {/* Sign out — only when authed */}
        {isAuthed && (
          <button
            onClick={signOut}
            className="glass flex items-center gap-2 rounded-full px-3.5 py-2
                       text-white/75 transition hover:text-white hover:bg-white/[0.08]"
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            <span className="text-[0.75rem] font-semibold">Sign out</span>
          </button>
        )}
      </div>

      {/* ── Avatar pill (only rendered when authed — lock screen handles sign-in) ── */}
      <div
        className={`glass flex items-center gap-2.5 rounded-full p-1.5
                    transition-all duration-500 ${pillExpanded ? 'pr-4' : ''}`}
      >
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
        {pillExpanded && (
          <div className="flex flex-col leading-tight">
            <span className="text-xs font-semibold text-white/85">
              {profile?.name ?? 'Connected'}
            </span>
            {profile?.email && (
              <span className="text-[0.65rem] text-white/40">{profile.email}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
