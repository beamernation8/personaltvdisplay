import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { formatDistanceToNow, subHours, subMinutes } from 'date-fns'
import { Newspaper } from 'lucide-react'
import { useVisibilityRefresh } from '../hooks/useVisibilityRefresh.js'

/* ------------------------------------------------------------------ */
/*  Mock fallback                                                     */
/* ------------------------------------------------------------------ */
const MOCK_ITEMS = [
  {
    title: 'Sabres extend winning streak to six with overtime victory in Toronto',
    source: 'ESPN',
    topicLabel: 'Sabres',
    publishedAt: subMinutes(new Date(), 18).toISOString(),
    image: 'https://images.unsplash.com/photo-1515703407324-5f51c225da9b?w=600&q=70',
    link: '#'
  },
  {
    title: 'Josh Allen named AFC Offensive Player of the Week after 4-TD performance',
    source: 'Bills.com',
    topicLabel: 'Bills',
    publishedAt: subHours(new Date(), 1).toISOString(),
    image: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=600&q=70',
    link: '#'
  },
  {
    title: 'Fantasy Week 12 waiver wire: 5 must-add RBs after surprise Sunday',
    source: 'The Athletic',
    topicLabel: 'Fantasy',
    publishedAt: subHours(new Date(), 2).toISOString(),
    image: 'https://images.unsplash.com/photo-1487466365202-1afdb86c764e?w=600&q=70',
    link: '#'
  },
  {
    title: 'Sabres call up top prospect from Rochester ahead of road trip',
    source: 'Buffalo News',
    topicLabel: 'Sabres',
    publishedAt: subHours(new Date(), 3).toISOString(),
    image: null,
    link: '#'
  }
]

export default function NewsWidget() {
  const [items, setItems] = useState(MOCK_ITEMS)
  const [activeIdx, setActiveIdx] = useState(0)

  const fetchFeedRef = useRef(null)
  fetchFeedRef.current = async () => {
    try {
      const { data } = await axios.get('/api/sports-news')
      const arts = data?.items ?? []
      if (arts.length) setItems(arts)
    } catch (err) {
      console.warn('[YourFeed] falling back to mock:', err.message)
    }
  }

  // Initial + every 2 minutes
  useEffect(() => {
    fetchFeedRef.current?.()
    const id = setInterval(() => fetchFeedRef.current?.(), 2 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  // Re-fetch immediately whenever the TV/tab wakes up
  useVisibilityRefresh(() => fetchFeedRef.current?.())

  /* Rotate the spotlighted post every 8s */
  useEffect(() => {
    if (items.length < 2) return
    const id = setInterval(() => {
      setActiveIdx(i => (i + 1) % Math.min(items.length, 5))
    }, 8000)
    return () => clearInterval(id)
  }, [items.length])

  const featured = items[activeIdx] ?? items[0]
  const others   = items.filter((_, i) => i !== activeIdx).slice(0, 4)

  return (
    <div className="glass relative flex h-full w-full flex-col p-6">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Newspaper className="h-5 w-5 text-white/60" strokeWidth={1.8} />
          <h2 className="widget-title">Your Feed</h2>
        </div>
        <div className="flex gap-1.5">
          {items.slice(0, 5).map((_, i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all duration-500 ${
                i === activeIdx ? 'w-5 bg-white/80' : 'w-1 bg-white/20'
              }`}
            />
          ))}
        </div>
      </header>

      {/* Two-column layout: featured on the left (big), compact list on the right */}
      <div className="grid min-h-0 flex-1 grid-cols-[1.05fr_1fr] gap-5">
        {/* Featured (large) — image fills top, headline + meta beneath */}
        {featured && (
          <article key={featured.link} className="animate-fade-in flex min-h-0 flex-col">
            {/* Image area — only show if a real non-favicon image exists */}
            {featured.image ? (
              <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl ring-1 ring-white/10">
                <img
                  src={featured.image}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 h-full w-full object-cover"
                  onError={e => { e.currentTarget.style.display = 'none' }}
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
                <span className="absolute left-2.5 top-2.5 rounded-full bg-black/50 px-2 py-0.5
                                 text-[0.6rem] font-bold uppercase tracking-widest text-white/90 backdrop-blur-sm">
                  {featured.topicLabel}
                </span>
              </div>
            ) : (
              /* No image — show a clean dark card with colored accent bar */
              <div className="relative flex min-h-0 flex-1 items-end overflow-hidden rounded-xl
                              bg-gradient-to-br from-white/[0.07] to-white/[0.02] ring-1 ring-white/10 p-4">
                <span className="absolute left-0 top-0 h-full w-1 rounded-l-xl
                                 bg-gradient-to-b from-white/30 to-white/10" />
                <p className="line-clamp-3 text-sm font-semibold leading-snug text-white/70">
                  {featured.topicLabel}
                </p>
              </div>
            )}

            <p className="mt-2.5 line-clamp-2 text-[0.95rem] font-semibold leading-snug text-white">
              {featured.title}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-[0.65rem] uppercase tracking-widest text-white/40">
              <span className="font-semibold text-white/60">{featured.source}</span>
              {featured.publishedAt && (
                <>
                  <span className="text-white/20">·</span>
                  <span className="normal-case tracking-normal">
                    {formatDistanceToNow(new Date(featured.publishedAt), { addSuffix: false })}
                  </span>
                </>
              )}
            </p>
          </article>
        )}

        {/* Compact list (right) — divider-separated, no images */}
        <ul className="flex min-h-0 flex-col divide-y divide-white/[0.07] overflow-hidden">
          {others.map((it) => (
            <li
              key={it.link}
              className="flex min-h-0 flex-1 cursor-default flex-col justify-center py-2
                         px-1 transition-colors hover:bg-white/[0.03]"
              onClick={() => {
                const idx = items.indexOf(items.find(x => x.link === it.link))
                if (idx >= 0) setActiveIdx(idx)
              }}
            >
              <p className="line-clamp-2 text-[0.78rem] font-medium leading-snug text-white/85">
                {it.title}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[0.58rem] uppercase tracking-widest text-white/38">
                <span className="font-bold text-white/50">{it.topicLabel}</span>
                <span className="text-white/15">·</span>
                <span>{it.source}</span>
                {it.publishedAt && (
                  <>
                    <span className="text-white/15">·</span>
                    <span className="normal-case tracking-normal">
                      {formatDistanceToNow(new Date(it.publishedAt), { addSuffix: false })}
                    </span>
                  </>
                )}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
