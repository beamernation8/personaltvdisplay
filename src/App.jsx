import React from 'react'
import { LogIn } from 'lucide-react'
import HeaderWidget from './components/HeaderWidget.jsx'
import CalendarWidget from './components/CalendarWidget.jsx'
import EmailWidget from './components/EmailWidget.jsx'
import SabresWidget from './components/SabresWidget.jsx'
import NewsWidget from './components/NewsWidget.jsx'
import ArbyWidget from './components/ArbyWidget.jsx'
import AuthPill from './components/AuthPill.jsx'
import { useAuth } from './auth/AuthContext.jsx'
import { usePWAInstall } from './hooks/usePWAInstall.js'

/* ── Inline brand SVGs (shared with AuthPill) ───────────────────── */
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

/**
 * Fixed 16:9 dashboard. The whole UI is sized to the viewport with CSS Grid
 * — no scrollbars, no overflow, designed to live on a TV screen forever.
 *
 * Grid (12 cols x 6 rows):
 *  ┌──────────────────────────────────────────────────────────────┐
 *  │                       HEADER  (12 x 1)                       │
 *  ├────────────────────┬──────┬──────────────────────────────────┤
 *  │  CALENDAR (5 x 3)  │      │       SABRES  (5 x 3)            │
 *  │                    │ARBIE │                                   │
 *  ├────────────────────┤(2x5) ├──────────────────────────────────┤
 *  │   EMAIL  (5 x 2)   │      │        NEWS   (5 x 2)            │
 *  └────────────────────┴──────┴──────────────────────────────────┘
 */
export default function App() {
  const { isAuthed, signIn } = useAuth()
  const { canInstall, install } = usePWAInstall()

  return (
    <div className="relative h-screen w-screen overflow-hidden mesh-bg">
      {/* Subtle vignette for premium TV feel */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.55)_100%)]" />

      {/* Dashboard grid — always rendered, blurred when locked */}
      <main
        className={`relative z-10 grid h-full w-full gap-5 p-6
                    grid-cols-12 grid-rows-6 transition-all duration-700
                    ${!isAuthed ? 'blur-xl scale-[1.02] brightness-50' : ''}`}
      >
        <section className="col-span-12 row-span-1 animate-fade-in">
          <HeaderWidget />
        </section>

        <section
          className="col-span-5 row-span-3 animate-fade-in"
          style={{ animationDelay: '80ms' }}
        >
          <CalendarWidget />
        </section>

        <section
          className="col-span-2 row-span-5 animate-fade-in"
          style={{ animationDelay: '120ms' }}
        >
          <ArbyWidget />
        </section>

        <section
          className="col-span-5 row-span-3 animate-fade-in"
          style={{ animationDelay: '160ms' }}
        >
          <SabresWidget />
        </section>

        <section
          className="col-span-5 row-span-2 animate-fade-in"
          style={{ animationDelay: '240ms' }}
        >
          <EmailWidget />
        </section>

        <section
          className="col-span-5 row-span-2 animate-fade-in"
          style={{ animationDelay: '320ms' }}
        >
          <NewsWidget />
        </section>
      </main>

      {/* ── Lock screen overlay — visible when signed out ── */}
      {!isAuthed && (
        <div className="absolute inset-0 z-40 flex items-center justify-center">
          <div className="flex flex-col items-center gap-8 animate-fade-in">
            {/* Title */}
            <div className="flex flex-col items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight text-white">
                Personal Display
              </h1>
              <p className="text-sm text-white/40">
                Sign in to unlock your dashboard
              </p>
            </div>

            {/* Sign in button */}
            <button
              onClick={() => signIn()}
              className="glass flex items-center gap-3 rounded-full px-8 py-3.5
                         text-base font-semibold text-white/90 transition
                         hover:text-white hover:bg-white/[0.1]
                         hover:shadow-[0_0_30px_rgba(255,255,255,0.08)]"
            >
              <LogIn className="h-5 w-5" strokeWidth={2} />
              Sign in with Google
            </button>

            {/* Divider */}
            <div className="flex w-64 items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-[0.65rem] uppercase tracking-widest text-white/25">
                or get the app
              </span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            {/* Download buttons */}
            <div className="flex items-center gap-3">
              <a
                href="/personaltvdisplay.apk"
                download
                className="glass flex items-center gap-2.5 rounded-full px-5 py-2.5
                           text-white/70 transition hover:text-white hover:bg-white/[0.08] no-underline"
              >
                <FireTVIcon className="h-4 w-4 shrink-0 text-orange-400/80" />
                <span className="flex flex-col leading-none">
                  <span className="text-[0.8rem] font-semibold text-white/85">Download APK</span>
                  <span className="text-[0.6rem] text-white/35 mt-0.5">Fire TV · Android TV</span>
                </span>
              </a>

              {canInstall && (
                <button
                  onClick={install}
                  className="glass flex items-center gap-2.5 rounded-full px-5 py-2.5
                             text-white/70 transition hover:text-white hover:bg-white/[0.08]"
                >
                  <GoogleTVIcon className="h-4 w-4 shrink-0 text-blue-400/80" />
                  <span className="flex flex-col leading-none">
                    <span className="text-[0.8rem] font-semibold text-white/85">Install App</span>
                    <span className="text-[0.6rem] text-white/35 mt-0.5">Google TV · Chrome</span>
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AuthPill — only shown when logged in */}
      {isAuthed && <AuthPill />}
    </div>
  )
}
