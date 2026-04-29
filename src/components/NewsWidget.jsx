import { useEffect, useState } from 'react'
import axios from 'axios'
import { Newspaper } from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Mock fallback                                                     */
/* ------------------------------------------------------------------ */
const MOCK_HEADLINES = [
  {
    id: 'n1',
    source: 'The Verge',
    title: 'Apple unveils visionOS 3 with new spatial widgets and shared workspaces',
    category: 'Tech'
  },
  {
    id: 'n2',
    source: 'AP News',
    title: 'Federal Reserve holds rates steady, signals two cuts later this year',
    category: 'Finance'
  },
  {
    id: 'n3',
    source: 'ESPN',
    title: 'Sabres extend winning streak to six with overtime victory in Toronto',
    category: 'Sports'
  },
  {
    id: 'n4',
    source: 'Reuters',
    title: 'NASA confirms Europa Clipper has entered Jupiter system, science ops begin',
    category: 'Science'
  }
]

export default function NewsWidget() {
  const [headlines, setHeadlines] = useState(MOCK_HEADLINES)
  const [activeIdx, setActiveIdx] = useState(0)

  useEffect(() => {
    const key = import.meta.env.VITE_NEWSAPI_KEY
    const country = import.meta.env.VITE_NEWS_COUNTRY || 'us'

    // TODO: ADD API INTEGRATION HERE — drop your NewsAPI key in .env
    if (!key) return

    let cancelled = false
    const fetchNews = async () => {
      try {
        const { data } = await axios.get(
          'https://newsapi.org/v2/top-headlines',
          { params: { country, pageSize: 5, apiKey: key } }
        )
        const arts = (data?.articles ?? []).slice(0, 4).map((a, i) => ({
          id:       `n${i}`,
          source:   a.source?.name ?? 'News',
          title:    a.title,
          category: 'Top'
        }))
        if (arts.length && !cancelled) setHeadlines(arts)
      } catch (err) {
        console.warn('[News] falling back to mock:', err.message)
      }
    }

    fetchNews()
    const id = setInterval(fetchNews, 15 * 60 * 1000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  /* Rotate the spotlighted headline every 7s */
  useEffect(() => {
    if (headlines.length < 2) return
    const id = setInterval(() => {
      setActiveIdx(i => (i + 1) % headlines.length)
    }, 7000)
    return () => clearInterval(id)
  }, [headlines.length])

  const active = headlines[activeIdx] ?? headlines[0]
  const upcoming = headlines.filter((_, i) => i !== activeIdx).slice(0, 2)

  return (
    <div className="glass relative flex h-full w-full flex-col p-7">
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Newspaper className="h-5 w-5 text-white/60" strokeWidth={1.8} />
          <h2 className="widget-title">Top Headlines</h2>
        </div>
        <div className="flex gap-1.5">
          {headlines.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i === activeIdx ? 'w-6 bg-white/80' : 'w-1.5 bg-white/20'
              }`}
            />
          ))}
        </div>
      </header>

      {/* Featured headline */}
      <div key={active?.id} className="animate-fade-in">
        <span className="inline-block rounded-full bg-sky-400/15 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-widest text-sky-200 ring-1 ring-sky-400/25">
          {active?.category ?? 'Top'}
        </span>
        <p className="mt-2.5 text-balance text-[1.35rem] font-semibold leading-snug text-white">
          {active?.title}
        </p>
        <p className="mt-1 text-sm text-white/45">{active?.source}</p>
      </div>

      {/* Upcoming list */}
      <ul className="mt-auto space-y-1.5 border-t border-white/10 pt-3">
        {upcoming.map(h => (
          <li key={h.id} className="flex items-baseline gap-2.5 text-sm">
            <span className="shrink-0 text-[0.7rem] font-semibold uppercase tracking-widest text-white/30">
              {h.source}
            </span>
            <span className="truncate text-white/65">{h.title}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
