import { useEffect, useRef, useState, useCallback } from 'react'
import axios from 'axios'
import { format } from 'date-fns'
import {
  Sparkles,
  CalendarCheck,
  Mail,
  Bell,
  Clock,
  AlertTriangle,
  CheckCircle2,
  RefreshCw
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext.jsx'
import { useVisibilityRefresh } from '../hooks/useVisibilityRefresh.js'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const STORAGE_KEY = 'daily_brief_cache'
const REGEN_INTERVAL = 3 * 60 * 60 * 1000 // 3 hours
const FETCH_CALENDAR_DAYS = 2 // today + tomorrow
const MAX_EMAILS = 5

/* ------------------------------------------------------------------ */
/*  Mock fallback — polished before any API keys                       */
/* ------------------------------------------------------------------ */
const MOCK_BRIEF = {
  summary: 'Moderate day — a few meetings and some emails to catch up on.',
  priorities: [
    { text: 'Prep for the 11 AM design review', type: 'calendar' },
    { text: 'Reply to the project proposal from Alex', type: 'email' },
    { text: 'Review budget spreadsheet before EOD', type: 'reminder' }
  ],
  schedule: [
    { time: '9:00 AM', title: 'Morning Standup', detail: 'Zoom · Engineering' },
    { time: '11:00 AM', title: 'Design Review', detail: 'Dashboard v2' },
    { time: '12:30 PM', title: 'Lunch with Sarah', detail: 'Bocce Club Pizza' },
    { time: '3:00 PM', title: '1:1 with Manager', detail: 'Office' }
  ],
  headsUp: [
    { text: 'Project deadline Friday — final deliverables due' },
    { text: 'Dentist appointment tomorrow at 2 PM' }
  ],
  generatedAt: new Date().toISOString(),
  mock: true
}

/* ------------------------------------------------------------------ */
/*  Type → Icon mapping for priority items                             */
/* ------------------------------------------------------------------ */
const PriorityIcon = ({ type }) => {
  const cls = 'h-3.5 w-3.5 shrink-0'
  switch (type) {
    case 'calendar': return <CalendarCheck className={`${cls} text-sky-400`} strokeWidth={1.8} />
    case 'email':    return <Mail className={`${cls} text-violet-400`} strokeWidth={1.8} />
    default:         return <Bell className={`${cls} text-amber-400`} strokeWidth={1.8} />
  }
}

/* ------------------------------------------------------------------ */
/*  Main widget                                                        */
/* ------------------------------------------------------------------ */
export default function DailyBriefWidget() {
  const { token } = useAuth()
  const [brief, setBrief] = useState(null)
  const [loading, setLoading] = useState(false)
  const timerRef = useRef(null)
  const tokenRef = useRef(token)
  tokenRef.current = token

  /* Load cached brief from localStorage */
  const loadCached = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      const cached = JSON.parse(raw)
      // Check if it's from today and within TTL
      const cachedDate = new Date(cached.generatedAt).toDateString()
      const today = new Date().toDateString()
      if (cachedDate === today && Date.now() - new Date(cached.generatedAt).getTime() < REGEN_INTERVAL) {
        return cached
      }
    } catch {}
    return null
  }, [])

  /* Gather user context and call the daily-brief API */
  const fetchBrief = useCallback(async () => {
    const t = tokenRef.current
    let events = []
    let emails = []

    // Pull calendar events
    if (t) {
      try {
        const calRes = await axios.get(
          'https://www.googleapis.com/calendar/v3/calendars/primary/events',
          {
            headers: { Authorization: `Bearer ${t}` },
            params: {
              timeMin: new Date().toISOString(),
              timeMax: new Date(Date.now() + FETCH_CALENDAR_DAYS * 86400_000).toISOString(),
              singleEvents: true,
              orderBy: 'startTime',
              maxResults: 10
            }
          }
        )
        events = (calRes.data?.items || []).map(e => {
          const when = new Date(e.start?.dateTime || e.start?.date)
          const time = e.start?.dateTime
            ? when.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
            : 'All day'
          const loc = e.location ? ` (${e.location})` : ''
          return `${time}: ${e.summary || 'Event'}${loc}`
        })
      } catch (err) {
        console.warn('[DailyBrief] Calendar fetch failed:', err.message)
      }

      // Pull recent emails
      try {
        const gmailRes = await axios.get(
          'https://gmail.googleapis.com/gmail/v1/users/me/messages',
          {
            headers: { Authorization: `Bearer ${t}` },
            params: { maxResults: MAX_EMAILS, q: 'is:inbox is:important newer_than:2d' }
          }
        )
        const msgIds = (gmailRes.data?.messages || []).map(m => m.id)
        for (const id of msgIds.slice(0, MAX_EMAILS)) {
          try {
            const detail = await axios.get(
              `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}`,
              {
                headers: { Authorization: `Bearer ${t}` },
                params: { format: 'metadata', metadataHeaders: ['From', 'Subject'] }
              }
            )
            const headers = detail.data?.payload?.headers || []
            const from = headers.find(h => h.name === 'From')?.value?.split('<')[0]?.trim() || 'Someone'
            const subj = headers.find(h => h.name === 'Subject')?.value || 'No subject'
            emails.push(`From ${from}: ${subj}`)
          } catch {}
        }
      } catch (err) {
        console.warn('[DailyBrief] Gmail fetch failed:', err.message)
      }
    }

    // Call the daily-brief serverless endpoint
    try {
      setLoading(true)
      const res = await axios.post('/api/daily-brief', { events, emails })
      const data = res.data
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      setBrief(data)
    } catch (err) {
      console.warn('[DailyBrief] API call failed:', err.message)
      // Use mock if everything fails
      if (!brief) setBrief(MOCK_BRIEF)
    } finally {
      setLoading(false)
    }
  }, [])

  /* Init: load cache → fetch if stale */
  useEffect(() => {
    const cached = loadCached()
    if (cached) {
      setBrief(cached)
    } else {
      setBrief(MOCK_BRIEF) // show mock immediately
      if (token) fetchBrief()
    }

    // Schedule periodic regeneration
    timerRef.current = setInterval(() => {
      if (document.visibilityState === 'visible' && tokenRef.current) {
        fetchBrief()
      }
    }, REGEN_INTERVAL)

    return () => clearInterval(timerRef.current)
  }, [token, loadCached, fetchBrief])

  // Refresh when TV wakes up — only if cache is stale
  useVisibilityRefresh(() => {
    if (!loadCached() && tokenRef.current) fetchBrief()
  })

  const data = brief || MOCK_BRIEF
  const genTime = data.generatedAt
    ? format(new Date(data.generatedAt), 'h:mm a')
    : ''

  return (
    <div className="glass relative flex h-full w-full flex-col p-7">
      {/* Decorative glow */}
      <div className="pointer-events-none absolute -top-20 -right-16 h-64 w-64 rounded-full bg-violet-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />

      {/* Header */}
      <header className="relative mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-violet-300/80" strokeWidth={1.8} />
          <h2 className="widget-title">Daily Brief</h2>
        </div>
        <div className="flex items-center gap-2">
          {loading && (
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-white/30" strokeWidth={1.8} />
          )}
          {genTime && (
            <span className="text-[0.65rem] font-medium text-white/30">
              {genTime}
            </span>
          )}
        </div>
      </header>

      {/* Summary banner */}
      <div className="relative mb-4 rounded-2xl bg-white/[0.05] px-4 py-2.5 ring-1 ring-white/10">
        <p className="text-[0.85rem] leading-relaxed text-white/70">
          {data.summary}
        </p>
      </div>

      {/* Content area */}
      <div className="relative flex flex-1 flex-col gap-4 overflow-y-auto">

        {/* Priorities */}
        {data.priorities?.length > 0 && (
          <section>
            <SectionLabel icon={CheckCircle2} text="Priorities" />
            <ul className="flex flex-col gap-1.5">
              {data.priorities.map((p, i) => (
                <li key={i} className="flex items-start gap-3 rounded-xl px-2.5 py-1.5 transition-colors hover:bg-white/[0.03]">
                  <PriorityIcon type={p.type} />
                  <span className="text-[0.82rem] leading-snug text-white/80">{p.text}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Schedule */}
        {data.schedule?.length > 0 && (
          <section>
            <SectionLabel icon={Clock} text="Today's Schedule" />
            <ul className="flex flex-col gap-1">
              {data.schedule.map((s, i) => (
                <li key={i} className="flex items-center gap-3 rounded-xl px-2.5 py-1.5 transition-colors hover:bg-white/[0.03]">
                  <span className="w-[4.5rem] shrink-0 text-right text-[0.78rem] font-semibold text-white/90">
                    {s.time}
                  </span>
                  <span className="h-6 w-1 shrink-0 rounded-full bg-sky-400/60" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.82rem] font-medium text-white/80">{s.title}</p>
                    {s.detail && (
                      <p className="truncate text-[0.7rem] text-white/40">{s.detail}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Heads Up */}
        {data.headsUp?.length > 0 && (
          <section>
            <SectionLabel icon={AlertTriangle} text="Heads Up" />
            <ul className="flex flex-col gap-1.5">
              {data.headsUp.map((h, i) => (
                <li key={i} className="flex items-start gap-3 rounded-xl px-2.5 py-1.5 transition-colors hover:bg-white/[0.03]">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400/70" strokeWidth={1.8} />
                  <span className="text-[0.82rem] leading-snug text-white/70">{h.text}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Section label — reusable sub-header                                */
/* ------------------------------------------------------------------ */
function SectionLabel({ icon: Icon, text }) {
  return (
    <div className="mb-1.5 flex items-center gap-2">
      <Icon className="h-3 w-3 text-white/30" strokeWidth={1.8} />
      <p className="text-[0.6rem] font-semibold uppercase tracking-[0.25em] text-white/35">
        {text}
      </p>
    </div>
  )
}
