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
  const others   = items.filter((_, i) => i !== activeIdx).slice(0, 3)

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

      {/* Featured */}
      {featured && (
        <article
          key={featured.link}
          className="animate-fade-in flex items-center gap-4"
        >
          <Thumbnail src={featured.image} size={92} className="rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-balance text-[1.1rem] font-semibold leading-snug text-white">
              {featured.title}
            </p>
            <p className="mt-1.5 flex items-center gap-1.5 text-[0.7rem] uppercase tracking-widest text-white/45">
              <span className="font-semibold text-white/65">{featured.topicLabel}</span>
              <span className="text-white/20">·</span>
              <span>{featured.source}</span>
              {featured.publishedAt && (
                <>
                  <span className="text-white/20">·</span>
                  <span className="normal-case tracking-normal">
                    {formatDistanceToNow(new Date(featured.publishedAt), { addSuffix: false })}
                  </span>
                </>
              )}
            </p>
          </div>
        </article>
      )}

      {/* Compact list */}
      <ul className="mt-auto space-y-2 border-t border-white/10 pt-3">
        {others.map(it => (
          <li key={it.link} className="flex items-center gap-3">
            <Thumbnail src={it.image} size={36} className="rounded-md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.85rem] leading-tight text-white/85">
                {it.title}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[0.65rem] uppercase tracking-widest text-white/40">
                <span className="font-semibold text-white/55">{it.topicLabel}</span>
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
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Image with graceful fallback to a subtle gradient tile             */
function Thumbnail({ src, size, className = '' }) {
  const [errored, setErrored] = useState(false)
  const style = { width: size, height: size }
  if (!src || errored) {
    return (
      <div
        style={style}
        className={`shrink-0 ${className}
                    bg-gradient-to-br from-white/[0.08] to-white/[0.02]
                    ring-1 ring-white/5`}
      />
    )
  }
  return (
    <img
      src={src}
      alt=""
      referrerPolicy="no-referrer"
      onError={() => setErrored(true)}
      style={style}
      className={`shrink-0 object-cover ${className} ring-1 ring-white/10`}
    />
  )
}
