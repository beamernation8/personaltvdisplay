import { useEffect, useState } from 'react'
import axios from 'axios'
import { formatDistanceToNow, subHours, subMinutes } from 'date-fns'
import { Mail, Star, Paperclip } from 'lucide-react'
import { useAuth } from '../auth/AuthContext.jsx'

/* ------------------------------------------------------------------ */
/*  Mock fallback                                                     */
/* ------------------------------------------------------------------ */
const buildMockEmails = () => {
  const now = new Date()
  return [
    {
      id: 'e1',
      from: 'Stripe',
      subject: 'Your monthly payout summary is ready',
      received: subMinutes(now, 22),
      hasAttachment: false,
      starred: true
    },
    {
      id: 'e2',
      from: 'GitHub',
      subject: '[security] New sign-in from Edge on Windows',
      received: subHours(now, 1),
      hasAttachment: false,
      starred: true
    },
    {
      id: 'e3',
      from: 'Sarah Chen',
      subject: 'Re: Q2 roadmap deck — comments inside',
      received: subHours(now, 2),
      hasAttachment: true,
      starred: false
    },
    {
      id: 'e4',
      from: 'Buffalo Sabres',
      subject: 'Your tickets for Saturday are ready 🏒',
      received: subHours(now, 4),
      hasAttachment: true,
      starred: false
    },
    {
      id: 'e5',
      from: 'Linear',
      subject: '12 issues due this week in DASH',
      received: subHours(now, 6),
      hasAttachment: false,
      starred: false
    }
  ]
}

/** Extract a header value (case-insensitive) from a Gmail message payload. */
const findHeader = (headers, name) =>
  headers?.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value ?? ''

/** Strip "Name <email@x>" → "Name" (or fall back to the email). */
const cleanFrom = (raw) => {
  const m = raw.match(/^"?([^"<]+?)"?\s*<.+>$/)
  return (m ? m[1] : raw).trim()
}

const mapGmailMessage = (m) => {
  const headers  = m.payload?.headers
  const from     = cleanFrom(findHeader(headers, 'From'))
  const subject  = findHeader(headers, 'Subject')
  const dateStr  = findHeader(headers, 'Date')
  const labels   = m.labelIds ?? []
  return {
    id:            m.id,
    from:          from || '(unknown)',
    subject:       subject || '(no subject)',
    received:      dateStr ? new Date(dateStr) : new Date(parseInt(m.internalDate, 10)),
    starred:       labels.includes('STARRED') || labels.includes('IMPORTANT'),
    hasAttachment: m.payload?.parts?.some(p => p.filename) ?? false
  }
}

export default function EmailWidget() {
  const [emails, setEmails] = useState(buildMockEmails)
  const { token } = useAuth()

  useEffect(() => {
    if (!token) { setEmails(buildMockEmails()); return }

    let cancelled = false
    const fetchEmails = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` }
        // 1. List ids of important+unread+primary inbox messages
        const list = await axios.get(
          'https://gmail.googleapis.com/gmail/v1/users/me/messages',
          {
            headers,
            params: {
              q: 'is:unread is:important category:primary',
              maxResults: 5
            }
          }
        )
        const ids = (list.data?.messages ?? []).map(m => m.id)
        if (!ids.length) { if (!cancelled) setEmails([]); return }

        // 2. Fetch metadata for each in parallel
        const details = await Promise.all(ids.map(id =>
          axios.get(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}`, {
            headers,
            params: {
              format: 'metadata',
              metadataHeaders: ['From', 'Subject', 'Date']
            }
          }).then(r => r.data)
        ))

        if (!cancelled) setEmails(details.map(mapGmailMessage))
      } catch (err) {
        console.warn('[Gmail] falling back to mock:', err.message)
      }
    }

    fetchEmails()
    const id = setInterval(fetchEmails, 2 * 60 * 1000) // every 2 min
    return () => { cancelled = true; clearInterval(id) }
  }, [token])

  const unreadCount = emails.length

  return (
    <div className="glass flex h-full w-full flex-col p-7">
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Mail className="h-5 w-5 text-white/60" strokeWidth={1.8} />
          <h2 className="widget-title">Comm Center</h2>
        </div>
        <span className="rounded-full bg-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-200 ring-1 ring-rose-400/30">
          {unreadCount} unread
        </span>
      </header>

      <ul className="flex flex-1 flex-col justify-between">
        {emails.slice(0, 5).map(em => (
          <li
            key={em.id}
            className="group flex items-center gap-4 rounded-2xl px-2.5 py-2
                       transition-colors hover:bg-white/[0.04]"
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center
                         rounded-full bg-white/[0.06] ring-1 ring-white/10
                         text-sm font-semibold text-white/80"
            >
              {em.from.slice(0, 1)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-[0.95rem] font-semibold text-white">
                  {em.from}
                </span>
                {em.starred && (
                  <Star
                    className="h-3.5 w-3.5 shrink-0 fill-amber-300 text-amber-300"
                    strokeWidth={1.8}
                  />
                )}
                {em.hasAttachment && (
                  <Paperclip className="h-3.5 w-3.5 shrink-0 text-white/40" strokeWidth={1.8} />
                )}
              </div>
              <p className="truncate text-sm text-white/60">{em.subject}</p>
            </div>

            <span className="shrink-0 text-xs font-medium text-white/40">
              {formatDistanceToNow(em.received, { addSuffix: false })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
