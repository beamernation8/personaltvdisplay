import { useEffect, useState } from 'react'
import axios from 'axios'
import { format, addHours, addMinutes, startOfDay, isToday, isThisWeek, isTomorrow } from 'date-fns'
import { CalendarDays, MapPin } from 'lucide-react'
import { useAuth } from '../auth/AuthContext.jsx'

/* Color cycle for left bar — rotates through events */
const COLORS = [
  'bg-sky-400',
  'bg-violet-400',
  'bg-amber-400',
  'bg-emerald-400',
  'bg-rose-400'
]

/* ------------------------------------------------------------------ */
/*  Mock fallback                                                     */
/* ------------------------------------------------------------------ */
const buildMockEvents = () => {
  const base = startOfDay(new Date())
  return [
    {
      id: 'm1',
      title: 'Morning Standup',
      location: 'Zoom · Engineering',
      start: addHours(base, 9),
      end:   addMinutes(addHours(base, 9), 30),
      color: 'bg-sky-400'
    },
    {
      id: 'm2',
      title: 'Design Review — Dashboard v2',
      location: 'Figma',
      start: addMinutes(addHours(base, 11), 0),
      end:   addHours(base, 12),
      color: 'bg-violet-400'
    },
    {
      id: 'm3',
      title: 'Lunch with Sarah',
      location: 'Bocce Club Pizza',
      start: addMinutes(addHours(base, 12), 30),
      end:   addMinutes(addHours(base, 13), 30),
      color: 'bg-amber-400'
    },
    {
      id: 'm4',
      title: '1:1 with Manager',
      location: 'Office',
      start: addHours(base, 15),
      end:   addMinutes(addHours(base, 15), 30),
      color: 'bg-emerald-400'
    },
    {
      id: 'm5',
      title: 'Sabres vs. Maple Leafs',
      location: 'KeyBank Center',
      start: addHours(base, 19),
      end:   addMinutes(addHours(base, 21), 30),
      color: 'bg-rose-400'
    }
  ]
}

/** Map a Google Calendar API event to our shape. */
const mapGoogleEvent = (ev, idx) => {
  const startISO = ev.start?.dateTime ?? ev.start?.date
  const endISO   = ev.end?.dateTime   ?? ev.end?.date
  return {
    id: ev.id,
    title: ev.summary || '(no title)',
    location: ev.location || '',
    start: new Date(startISO),
    end:   new Date(endISO),
    color: COLORS[idx % COLORS.length]
  }
}

export default function CalendarWidget() {
  const [events, setEvents] = useState(buildMockEvents)
  const { token } = useAuth()

  useEffect(() => {
    // Falls back to mock data when no Google token is present.
    if (!token) { setEvents(buildMockEvents()); return }

    let cancelled = false
    const fetchEvents = async () => {
      try {
        const { data } = await axios.get(
          'https://www.googleapis.com/calendar/v3/calendars/primary/events',
          {
            headers: { Authorization: `Bearer ${token}` },
            params: {
              timeMin:      new Date().toISOString(),
              singleEvents: true,
              orderBy:      'startTime',
              maxResults:   8
            }
          }
        )
        const mapped = (data?.items ?? []).map(mapGoogleEvent)
        if (!cancelled && mapped.length) setEvents(mapped)
      } catch (err) {
        console.warn('[Calendar] falling back to mock:', err.message)
      }
    }

    fetchEvents()
    const id = setInterval(fetchEvents, 5 * 60 * 1000) // every 5 min
    return () => { cancelled = true; clearInterval(id) }
  }, [token])

  /* Split into Today + Later-this-week, then cap for clean fit. */
  const now = new Date()
  const upcoming = events.filter(e => e.end >= now)
  const todayEvents = upcoming.filter(e => isToday(e.start))
  const laterEvents = upcoming
    .filter(e => !isToday(e.start) && isThisWeek(e.start, { weekStartsOn: 0 }))

  // Cap counts so the widget always fits in its grid slot.
  const MAX_TODAY = todayEvents.length >= 3 ? 3 : todayEvents.length
  const MAX_LATER = Math.max(5 - (MAX_TODAY || 0), 2)
  const todayShown = todayEvents.slice(0, MAX_TODAY)
  const laterShown = laterEvents.slice(0, MAX_LATER)

  return (
    <div className="glass flex h-full w-full flex-col p-7">
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-5 w-5 text-white/60" strokeWidth={1.8} />
          <h2 className="widget-title">Agenda</h2>
        </div>
        <span className="text-sm font-medium text-white/40">
          {format(now, 'EEE, MMM d')}
        </span>
      </header>

      <div className="flex flex-1 flex-col gap-3 overflow-hidden">
        {/* Today */}
        <Section
          label="Today"
          empty="Nothing left today — enjoy your evening."
          events={todayShown}
          showDate={false}
        />

        {/* Later this week (only render header if there's anything to show) */}
        {laterShown.length > 0 && (
          <Section
            label="Later this week"
            events={laterShown}
            showDate
          />
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
function Section({ label, empty, events, showDate }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <p className="mb-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-white/40">
        {label}
      </p>
      <ul className="flex flex-1 flex-col gap-1">
        {events.length === 0 ? (
          <li className="my-2 text-sm text-white/40">{empty}</li>
        ) : (
          events.map(ev => <EventRow key={ev.id} ev={ev} showDate={showDate} />)
        )}
      </ul>
    </div>
  )
}

function EventRow({ ev, showDate }) {
  const dayLabel = isTomorrow(ev.start) ? 'Tomorrow' : format(ev.start, 'EEE')
  return (
    <li
      className="flex items-center gap-4 rounded-2xl px-2.5 py-2
                 transition-colors hover:bg-white/[0.03]"
    >
      <div className="flex w-20 flex-col items-end leading-tight">
        {showDate && (
          <span className="text-[0.65rem] font-semibold uppercase tracking-widest text-white/40">
            {dayLabel}
          </span>
        )}
        <span className="text-base font-semibold text-white">
          {format(ev.start, 'h:mm')}
          <span className="ml-1 text-[0.65rem] font-medium text-white/40">
            {format(ev.start, 'a')}
          </span>
        </span>
      </div>

      <span
        className={`h-9 w-1.5 shrink-0 rounded-full ${ev.color}
                    shadow-[0_0_12px_currentColor] opacity-90`}
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.95rem] font-medium text-white">
          {ev.title}
        </p>
        {ev.location && (
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-white/50">
            <MapPin className="h-3 w-3" strokeWidth={1.8} />
            {ev.location}
          </p>
        )}
      </div>

      <span className="shrink-0 text-xs font-medium text-white/40">
        {format(ev.end, 'h:mm a')}
      </span>
    </li>
  )
}
