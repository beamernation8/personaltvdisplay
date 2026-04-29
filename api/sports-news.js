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

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

const fetchWithTimeout = (url, ms = 3500, opts = {}) =>
  Promise.race([
    fetch(url, { ...opts, headers: { 'User-Agent': UA, ...(opts.headers ?? {}) } }),
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))
  ])

/** Extract OpenGraph / Twitter card image URL from an article HTML page. */
async function fetchOgImage(articleUrl) {
  if (!articleUrl) return null
  try {
    const r = await fetchWithTimeout(articleUrl, 3500, { redirect: 'follow' })
    if (!r.ok) return null
    const html = await r.text()
    // Look for og:image (or twitter:image) — both attribute orders.
    const patterns = [
      /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]*content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:image(?::secure_url)?["']/i,
      /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]*content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]*name=["']twitter:image(?::src)?["']/i
    ]
    for (const re of patterns) {
      const m = html.match(re)
      if (m?.[1]) return m[1].replace(/&amp;/g, '&')
    }
    return null
  } catch {
    return null
  }
}

async function fetchTopic({ key, label, query }) {
  const url =
    'https://news.google.com/rss/search?q=' +
    encodeURIComponent(query) +
    '&hl=en-US&gl=US&ceid=US:en'

  const r = await fetchWithTimeout(url, 5000, {
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

    const top = merged.slice(0, 8)

    // Fetch OpenGraph images for the top items in parallel (with timeout).
    const images = await Promise.all(top.map((it) => fetchOgImage(it.link)))
    top.forEach((it, i) => { it.image = images[i] })

    res.setHeader('cache-control', 'public, s-maxage=300, stale-while-revalidate=600')
    res.setHeader('access-control-allow-origin', '*')
    res.status(200).json({ items: top })
  } catch (err) {
    res.status(502).json({ error: err.message, items: [] })
  }
}
