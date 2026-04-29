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
        {/* Featured (large) — image on top, headline + meta beneath */}
        {featured && (
          <article
            key={featured.link}
            className="animate-fade-in flex min-h-0 flex-col"
          >
            <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl ring-1 ring-white/10">
              <Thumbnail
                src={featured.image}
                domain={featured.domain}
                fill
                className="rounded-xl"
              />
              {/* Subtle gradient over image so the topic chip on it is readable */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black/40 to-transparent" />
              <span className="absolute left-2 top-2 rounded-full bg-black/40 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-widest text-white/95 backdrop-blur-sm">
                {featured.topicLabel}
              </span>
            </div>

            <p className="mt-2.5 line-clamp-2 text-balance text-[0.95rem] font-semibold leading-snug text-white">
              {featured.title}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-[0.65rem] uppercase tracking-widest text-white/45">
              <span className="font-semibold text-white/65">{featured.source}</span>
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

        {/* Compact list (right) */}
        <ul className="flex min-h-0 flex-col gap-2 overflow-hidden">
          {others.map((it, i) => (
            <li
              key={it.link}
              className="flex min-h-0 flex-1 cursor-default items-center gap-2.5
                         rounded-lg px-1 transition-colors hover:bg-white/[0.03]"
              onClick={() => {
                // Click to make this the featured story (then auto-cycle resumes)
                const clickedItem = items.find(x => x.link === it.link)
                if (clickedItem) {
                  const idx = items.indexOf(clickedItem)
                  if (idx >= 0) setActiveIdx(idx)
                }
              }}
            >
              <Thumbnail
                src={it.image}
                domain={it.domain}
                size={42}
                className="rounded-md"
              />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-[0.8rem] leading-tight text-white/85">
                  {it.title}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-[0.6rem] uppercase tracking-widest text-white/40">
                  <span className="font-semibold text-white/55">{it.topicLabel}</span>
                  <span className="text-white/15">·</span>
                  <span className="normal-case tracking-normal">
                    {it.publishedAt
                      ? formatDistanceToNow(new Date(it.publishedAt), { addSuffix: false })
                      : it.source}
                  </span>
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Smart thumbnail:
 *   1. Prefers the article's OpenGraph image (cropped, full-bleed).
 *   2. Falls back to the publisher's favicon centered on a subtle tile.
 *   3. Falls back again to a plain gradient tile if everything 404s.
 */
function Thumbnail({ src, domain, size, fill = false, className = '' }) {
  const [imgErrored, setImgErrored] = useState(false)
  const [favErrored, setFavErrored] = useState(false)

  // `fill` = absolutely fill parent (used for the featured hero image).
  // Otherwise use a fixed `size` square.
  const wrapperClass = fill
    ? 'absolute inset-0'
    : 'shrink-0'
  const style = fill ? undefined : { width: size, height: size }

  if (src && !imgErrored) {
    return (
      <img
        src={src}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setImgErrored(true)}
        style={style}
        className={`${wrapperClass} h-full w-full object-cover ${className} ${
          fill ? '' : 'ring-1 ring-white/10'
        }`}
      />
    )
  }

  // Favicon tile fallback
  if (domain && !favErrored) {
    const fSize = fill ? 256 : Math.max(64, Math.min(size, 128))
    return (
      <div
        style={style}
        className={`${wrapperClass} flex items-center justify-center ${className}
                    bg-gradient-to-br from-white/[0.08] to-white/[0.02]
                    ${fill ? '' : 'ring-1 ring-white/5'}`}
      >
        <img
          src={`https://www.google.com/s2/favicons?sz=${fSize}&domain=${domain}`}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setFavErrored(true)}
          className={fill ? 'h-1/3 w-1/3 object-contain opacity-90' : 'h-1/2 w-1/2 object-contain'}
        />
      </div>
    )
  }

  // Final fallback — empty tile
  return (
    <div
      style={style}
      className={`${wrapperClass} ${className}
                  bg-gradient-to-br from-white/[0.08] to-white/[0.02]
                  ${fill ? '' : 'ring-1 ring-white/5'}`}
    />
  )
}
