import { useEffect, useRef, useState, useCallback } from 'react'
import axios from 'axios'
import { useAuth } from '../auth/AuthContext.jsx'

/* ── Constants ───────────────────────────────────────────────────── */
const REGEN_INTERVAL = 4 * 60 * 60 * 1000 // 4 hours
const STORAGE_KEY = 'arbie_cache'

const EXPRESSIONS = {
  happy:    { eyes: 'open',   mouth: 'smile',  brows: 'normal', blush: true  },
  wink:     { eyes: 'wink',   mouth: 'smile',  brows: 'normal', blush: true  },
  excited:  { eyes: 'wide',   mouth: 'open',   brows: 'raised', blush: true  },
  thinking: { eyes: 'look',   mouth: 'hmm',    brows: 'raised', blush: false },
  laughing: { eyes: 'closed', mouth: 'laugh',  brows: 'normal', blush: true  },
  cool:     { eyes: 'shades', mouth: 'smirk',  brows: 'normal', blush: false }
}

/* ── SVG Face Component ──────────────────────────────────────────── */
function ArbieFace({ expression = 'happy', className = '' }) {
  const expr = EXPRESSIONS[expression] || EXPRESSIONS.happy

  return (
    <svg viewBox="0 0 120 120" className={className} aria-label={`Arbie is ${expression}`}>
      <defs>
        <radialGradient id="arbie-skin" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#fdd8c4" />
          <stop offset="100%" stopColor="#f5c1a8" />
        </radialGradient>
        <radialGradient id="arbie-hair" cx="50%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#5b3a1a" />
          <stop offset="100%" stopColor="#3d2410" />
        </radialGradient>
        <filter id="arbie-shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
        </filter>
      </defs>

      {/* Hair behind head */}
      <ellipse cx="60" cy="48" rx="42" ry="44" fill="url(#arbie-hair)" />
      <ellipse cx="60" cy="80" rx="28" ry="24" fill="url(#arbie-hair)" />

      {/* Face */}
      <ellipse cx="60" cy="55" rx="34" ry="36" fill="url(#arbie-skin)" filter="url(#arbie-shadow)" />

      {/* Hair bangs */}
      <path d="M26 42 Q36 18 60 20 Q84 18 94 42 Q88 28 60 26 Q32 28 26 42Z" fill="url(#arbie-hair)" />

      {/* Blush */}
      {expr.blush && (
        <>
          <circle cx="38" cy="62" r="6" fill="#f5a0a0" opacity="0.35" />
          <circle cx="82" cy="62" r="6" fill="#f5a0a0" opacity="0.35" />
        </>
      )}

      {/* Eyes */}
      <g className="arbie-eyes">
        {expr.eyes === 'open' && (
          <>
            <ellipse cx="46" cy="52" rx="4.5" ry="5" fill="#3d2410" className="arbie-blink" />
            <ellipse cx="74" cy="52" rx="4.5" ry="5" fill="#3d2410" className="arbie-blink" />
            <circle cx="47.5" cy="50.5" r="1.5" fill="white" opacity="0.8" />
            <circle cx="75.5" cy="50.5" r="1.5" fill="white" opacity="0.8" />
          </>
        )}
        {expr.eyes === 'wink' && (
          <>
            <ellipse cx="46" cy="52" rx="4.5" ry="5" fill="#3d2410" className="arbie-blink" />
            <circle cx="47.5" cy="50.5" r="1.5" fill="white" opacity="0.8" />
            <path d="M68 52 Q74 48 80 52" stroke="#3d2410" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </>
        )}
        {expr.eyes === 'wide' && (
          <>
            <ellipse cx="46" cy="51" rx="5.5" ry="6.5" fill="#3d2410" />
            <ellipse cx="74" cy="51" rx="5.5" ry="6.5" fill="#3d2410" />
            <circle cx="48" cy="49" r="2" fill="white" opacity="0.9" />
            <circle cx="76" cy="49" r="2" fill="white" opacity="0.9" />
          </>
        )}
        {expr.eyes === 'closed' && (
          <>
            <path d="M40 52 Q46 48 52 52" stroke="#3d2410" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M68 52 Q74 48 80 52" stroke="#3d2410" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </>
        )}
        {expr.eyes === 'look' && (
          <>
            <ellipse cx="46" cy="52" rx="4.5" ry="5" fill="#3d2410" />
            <ellipse cx="74" cy="52" rx="4.5" ry="5" fill="#3d2410" />
            <circle cx="48.5" cy="52" r="1.5" fill="white" opacity="0.8" />
            <circle cx="76.5" cy="52" r="1.5" fill="white" opacity="0.8" />
          </>
        )}
        {expr.eyes === 'shades' && (
          <>
            <rect x="36" y="46" width="18" height="12" rx="4" fill="#1a1a2e" opacity="0.85" />
            <rect x="66" y="46" width="18" height="12" rx="4" fill="#1a1a2e" opacity="0.85" />
            <line x1="54" y1="51" x2="66" y2="51" stroke="#1a1a2e" strokeWidth="2" />
            <line x1="36" y1="51" x2="28" y2="48" stroke="#1a1a2e" strokeWidth="2" />
            <line x1="84" y1="51" x2="92" y2="48" stroke="#1a1a2e" strokeWidth="2" />
          </>
        )}
      </g>

      {/* Eyebrows */}
      {expr.brows === 'raised' ? (
        <>
          <path d="M38 42 Q46 37 52 41" stroke="#3d2410" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M68 41 Q74 37 82 42" stroke="#3d2410" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M39 44 Q46 40 52 43" stroke="#3d2410" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M68 43 Q74 40 81 44" stroke="#3d2410" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </>
      )}

      {/* Mouth */}
      {expr.mouth === 'smile' && (
        <path d="M48 68 Q60 78 72 68" stroke="#c4735a" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      )}
      {expr.mouth === 'open' && (
        <ellipse cx="60" cy="70" rx="8" ry="6" fill="#c4735a" />
      )}
      {expr.mouth === 'laugh' && (
        <path d="M46 66 Q60 82 74 66" stroke="#c4735a" strokeWidth="2" fill="#d4836a" strokeLinecap="round" />
      )}
      {expr.mouth === 'hmm' && (
        <ellipse cx="62" cy="70" rx="4" ry="3.5" fill="#c4735a" />
      )}
      {expr.mouth === 'smirk' && (
        <path d="M50 68 Q60 74 72 66" stroke="#c4735a" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      )}

      {/* Nose */}
      <path d="M58 60 Q60 63 62 60" stroke="#dda88e" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </svg>
  )
}

/* ── ArbyWidget (main export) ────────────────────────────────────── */
export default function ArbyWidget() {
  const { token } = useAuth()
  const [message, setMessage] = useState('')
  const [expression, setExpression] = useState('happy')
  const [animating, setAnimating] = useState(false)
  const timerRef = useRef(null)

  const loadCached = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      const cached = JSON.parse(raw)
      if (Date.now() - cached.timestamp < REGEN_INTERVAL) return cached
    } catch {}
    return null
  }, [])

  const fetchMessage = useCallback(async () => {
    // Gather context from the page — read from existing widget data
    let events = [], emails = [], news = []
    try {
      if (token) {
        const calRes = await axios.get(
          'https://www.googleapis.com/calendar/v3/calendars/primary/events',
          {
            headers: { Authorization: `Bearer ${token}` },
            params: {
              timeMin: new Date().toISOString(),
              timeMax: new Date(Date.now() + 2 * 86400_000).toISOString(),
              singleEvents: true, orderBy: 'startTime', maxResults: 3
            }
          }
        ).catch(() => ({ data: {} }))
        events = (calRes.data?.items || []).map(e =>
          `${e.summary || 'Event'} at ${new Date(e.start?.dateTime || e.start?.date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
        )

        const gmailRes = await axios.get(
          'https://gmail.googleapis.com/gmail/v1/users/me/messages',
          {
            headers: { Authorization: `Bearer ${token}` },
            params: { maxResults: 3, q: 'is:inbox newer_than:1d' }
          }
        ).catch(() => ({ data: {} }))
        const msgIds = (gmailRes.data?.messages || []).map(m => m.id)
        for (const id of msgIds.slice(0, 3)) {
          try {
            const detail = await axios.get(
              `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}`,
              {
                headers: { Authorization: `Bearer ${token}` },
                params: { format: 'metadata', metadataHeaders: ['From', 'Subject'] }
              }
            )
            const headers = detail.data?.payload?.headers || []
            const from = headers.find(h => h.name === 'From')?.value?.split('<')[0]?.trim() || 'Someone'
            const subj = headers.find(h => h.name === 'Subject')?.value || 'No subject'
            emails.push(`${from}: ${subj}`)
          } catch {}
        }
      }
    } catch {}

    // Call Arbie API
    try {
      const res = await axios.post('/api/arby', { events, emails, news })
      const { message: msg, expression: expr } = res.data
      const result = {
        message: msg,
        expression: expr,
        timestamp: Date.now()
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(result))
      setAnimating(true)
      setTimeout(() => {
        setMessage(msg)
        setExpression(expr)
        setAnimating(false)
      }, 300)
    } catch (err) {
      console.warn('[Arbie] fetch failed:', err.message)
    }
  }, [token])

  useEffect(() => {
    const cached = loadCached()
    if (cached) {
      setMessage(cached.message)
      setExpression(cached.expression)
    } else if (token) {
      fetchMessage()
    } else {
      setMessage("Hey there! Sign in and I'll keep you company with fun updates about your day! 💜")
      setExpression('wink')
    }

    // Schedule regeneration
    timerRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') fetchMessage()
    }, REGEN_INTERVAL)

    return () => clearInterval(timerRef.current)
  }, [token, loadCached, fetchMessage])

  return (
    <div className="glass flex h-full w-full flex-col items-center justify-center p-5 text-center">
      {/* Avatar */}
      <div className={`transition-all duration-500 ${animating ? 'scale-90 opacity-0' : 'scale-100 opacity-100'}`}>
        <ArbieFace
          expression={expression}
          className="arbie-float mx-auto h-28 w-28 drop-shadow-[0_0_20px_rgba(245,193,168,0.25)]"
        />
      </div>

      {/* Name */}
      <p className="mt-3 text-[0.6rem] font-bold uppercase tracking-[0.3em] text-white/30">
        Arbie
      </p>

      {/* Message bubble */}
      <div
        className={`mt-3 max-w-full rounded-2xl bg-white/[0.06] px-4 py-3
                    ring-1 ring-white/10 transition-all duration-500
                    ${animating ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100'}`}
      >
        <p className="text-[0.82rem] leading-relaxed text-white/75">
          {message || '...'}
        </p>
      </div>
    </div>
  )
}
