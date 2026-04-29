// Vercel serverless function — aggregates the latest news from Google News
// RSS for three Buffalo-fan topics: Sabres, Bills, and NFL fantasy.
//
// File: /api/sports-news.js
// Returns: { items: [{ title, link, source, topic, publishedAt }, ...] }
//
// Free, no API key, no rate limits — Google News RSS is open.

const TOPICS = [
  { key: 'sabres',  label: 'Sabres',  query: 'Buffalo Sabres' },
  { key: 'bills',   label: 'Bills',   query: 'Buffalo Bills' },
  { key: 'fantasy', label: 'Fantasy', query: 'NFL fantasy football' }
]

// Lightweight HTML-entity decoder — only the handful that appear in RSS titles.
const decode = (s = '') =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')

const pickTag = (block, tag) => {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`))
  return m ? decode(m[1].trim()) : ''
}

const stripSourceSuffix = (title, source) => {
  if (!source) return title
  // Google News appends " - SourceName" to every title
  const suffix = ` - ${source}`
  return title.endsWith(suffix) ? title.slice(0, -suffix.length) : title
}

async function fetchTopic({ key, label, query }) {
  const url =
    'https://news.google.com/rss/search?q=' +
    encodeURIComponent(query) +
    '&hl=en-US&gl=US&ceid=US:en'

  const r = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; PersonalTVDashboard/1.0; +https://personaltvdisplay.vercel.app)'
    }
  })
  if (!r.ok) return []
  const xml = await r.text()

  const items = []
  const re = /<item>([\s\S]*?)<\/item>/g
  let m
  while ((m = re.exec(xml)) && items.length < 6) {
    const block      = m[1]
    const rawTitle   = pickTag(block, 'title')
    const link       = pickTag(block, 'link')
    const date       = pickTag(block, 'pubDate')
    const source     = pickTag(block, 'source')
    if (!rawTitle) continue
    items.push({
      title:       stripSourceSuffix(rawTitle, source),
      link,
      source:      source || 'Google News',
      topic:       key,
      topicLabel:  label,
      publishedAt: date ? new Date(date).toISOString() : null
    })
  }
  return items
}

export default async function handler(req, res) {
  try {
    const buckets = await Promise.all(TOPICS.map(fetchTopic))
    // Round-robin merge so each topic is represented near the top,
    // then re-sort by publishedAt for the final feed.
    const merged = []
    const max = Math.max(...buckets.map(b => b.length))
    for (let i = 0; i < max; i++) {
      for (const b of buckets) if (b[i]) merged.push(b[i])
    }
    merged.sort((a, b) => (
      new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0)
    ))

    res.setHeader('cache-control', 'public, s-maxage=300, stale-while-revalidate=600')
    res.setHeader('access-control-allow-origin', '*')
    res.status(200).json({ items: merged.slice(0, 12) })
  } catch (err) {
    res.status(502).json({ error: err.message, items: [] })
  }
}
