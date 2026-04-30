import { useState } from 'react'
import { usePWAInstall } from '../hooks/usePWAInstall.js'

/* ── Inline brand SVGs ───────────────────────────────────────────────── */

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
      <path d="M12 7.5A3.5 3.5 0 0 0 8.5 11H10a2 2 0 1 1 3.72.96l-1.08 1.89A3.5 3.5 0 1 0 12 7.5z" opacity=".8"/>
      <circle cx="12" cy="11" r="1.25"/>
    </svg>
  )
}

/* ── InstallPill ─────────────────────────────────────────────────────── */

export default function InstallPill() {
  const { canInstall, install } = usePWAInstall()
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div className="fixed bottom-5 left-5 z-50 flex flex-col gap-2">
      {/* Download APK — always visible */}
      <a
        href="/personaltvdisplay.apk"
        download
        className="glass flex items-center gap-2.5 rounded-full px-4 py-2
                   text-sm font-medium text-white/75 transition
                   hover:text-white hover:bg-white/[0.08] no-underline"
        title="Sideload on Fire TV via the Downloader app"
      >
        <FireTVIcon className="h-4 w-4 shrink-0 text-orange-400/80" />
        <span className="flex flex-col leading-none">
          <span className="text-[0.78rem] font-semibold text-white/85">Download APK</span>
          <span className="text-[0.6rem] text-white/40 mt-0.5">Fire TV · Android TV</span>
        </span>
      </a>

      {/* Install PWA — only shown when browser supports it */}
      {canInstall && (
        <button
          onClick={install}
          className="glass flex items-center gap-2.5 rounded-full px-4 py-2
                     text-sm font-medium text-white/75 transition
                     hover:text-white hover:bg-white/[0.08]"
          title="Install as a standalone app on this device"
        >
          <GoogleTVIcon className="h-4 w-4 shrink-0 text-blue-400/80" />
          <span className="flex flex-col leading-none">
            <span className="text-[0.78rem] font-semibold text-white/85">Install App</span>
            <span className="text-[0.6rem] text-white/40 mt-0.5">Google TV · Chrome</span>
          </span>
        </button>
      )}
    </div>
  )
}
