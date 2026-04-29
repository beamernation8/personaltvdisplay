import { useEffect, useState } from 'react'
import axios from 'axios'
import { formatDistanceToNow, subHours, subMinutes } from 'date-fns'
import { Activity } from 'lucide-react'

/* Topic styling — one chip per team/category */
const TOPIC_STYLES = {
  sabres:  { ring: 'ring-blue-400/40',    bg: 'bg-blue-500/15',    text: 'text-blue-200'    },
  bills:   { ring: 'ring-rose-400/40',    bg: 'bg-rose-500/15',    text: 'text-rose-200'    },
  fantasy: { ring: 'ring-emerald-400/40', bg: 'bg-emerald-500/15', text: 'text-emerald-200' }
}

/* ------------------------------------------------------------------ */
/*  Mock fallback                                                     */
/* ------------------------------------------------------------------ */
const MOCK_ITEMS = [
  {
    title: 'Sabres extend winning streak to six with overtime victory in Toronto',
    source: 'ESPN',
    topic: 'sabres',
    topicLabel: 'Sabres',
    publishedAt: subMinutes(new Date(), 18).toISOString(),
    link: '#'
  },
  {
    title: 'Josh Allen named AFC Offensive Player of the Week after 4-TD performance',
    source: 'Bills.com',
    topic: 'bills',
    topicLabel: 'Bills',
    publishedAt: subHours(new Date(), 1).toISOString(),
    link: '#'
  },
  {
    title: 'Fantasy Week 12 waiver wire: 5 must-add RBs after surprise Sunday',
    source: 'The Athletic',
    topic: 'fantasy',
    topicLabel: 'Fantasy',
    publishedAt: subHours(new Date(), 2).toISOString(),
    link: '#'
  },
  {
    title: 'Sabres call up top prospect from Rochester ahead of road trip',
    source: 'Buffalo News',
    topic: 'sabres',
    topicLabel: 'Sabres',
    publishedAt: subHours(new Date(), 3).toISOString(),
    link: '#'
  },
  {
    title: 'Bills clinch AFC East with dominant Thursday Night Football win',
    source: 'NFL.com',
    topic: 'bills',
    topicLabel: 'Bills',
    publishedAt: subHours(new Date(), 5).toISOString(),
    link: '#'
  }
]

export default function NewsWidget() {
  const [items, setItems] = useState(MOCK_ITEMS)
  const [activeIdx, setActiveIdx] = useState(0)

  useEffect(() => {
    let cancelled = false
    const fetchFeed = async () => {
      try {
        const { data } = await axios.get('/api/sports-news')
        const arts = data?.items ?? []
        if (arts.length && !cancelled) setItems(arts)
      } catch (err) {
        console.warn('[SportsFeed] falling back to mock:', err.message)
      }
    }
    fetchFeed()
    const id = setInterval(fetchFeed, 5 * 60 * 1000) // refresh every 5 min
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  /* Rotate the spotlighted post every 7s */
  useEffect(() => {
    if (items.length < 2) return
    const id = setInterval(() => {
      setActiveIdx(i => (i + 1) % Math.min(items.length, 5))
    }, 7000)
    return () => clearInterval(id)
  }, [items.length])

  const featured = items[activeIdx] ?? items[0]
  const upcoming = items.filter((_, i) => i !== activeIdx).slice(0, 3)

  const fStyle = TOPIC_STYLES[featured?.topic] ?? TOPIC_STYLES.sabres

  return (
    <div className="glass relative flex h-full w-full flex-col p-7">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="h-5 w-5 text-white/60" strokeWidth={1.8} />
          <h2 className="widget-title">Buffalo Sports Feed</h2>
        </div>
        <div className="flex gap-1.5">
          {items.slice(0, 5).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i === activeIdx ? 'w-6 bg-white/80' : 'w-1.5 bg-white/20'
              }`}
            />
          ))}
        </div>
      </header>

      {/* Featured post */}
      {featured && (
        <div key={featured.link} className="animate-fade-in">
          <span
            className={`inline-block rounded-full px-2.5 py-0.5 text-[0.65rem]
                        font-semibold uppercase tracking-widest ring-1
                        ${fStyle.bg} ${fStyle.text} ${fStyle.ring}`}
          >
            {featured.topicLabel}
          </span>
          <p className="mt-2 text-balance text-[1.2rem] font-semibold leading-snug text-white">
            {featured.title}
          </p>
          <p className="mt-1 flex items-center gap-2 text-xs text-white/45">
            <span className="font-medium">{featured.source}</span>
            {featured.publishedAt && (
              <>
                <span className="text-white/20">·</span>
                <span>
                  {formatDistanceToNow(new Date(featured.publishedAt), { addSuffix: true })}
                </span>
              </>
            )}
          </p>
        </div>
      )}

      {/* Upcoming list */}
      <ul className="mt-auto space-y-1.5 border-t border-white/10 pt-3">
        {upcoming.map(it => {
          const style = TOPIC_STYLES[it.topic] ?? TOPIC_STYLES.sabres
          return (
            <li key={it.link} className="flex items-baseline gap-2.5 text-sm">
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[0.6rem]
                            font-semibold uppercase tracking-widest ring-1
                            ${style.bg} ${style.text} ${style.ring}`}
              >
                {it.topicLabel}
              </span>
              <span className="truncate text-white/65">{it.title}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
