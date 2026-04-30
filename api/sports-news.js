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

/** Pull the `url="..."` attribute off a tag like `<source url="...">`. */
const pickAttr = (block, tag, attr) => {
  const m = block.match(new RegExp(`<${tag}[^>]*${attr}=["']([^"']+)["']`))
  return m ? m[1] : ''
}

/** Extract host (e.g. "espn.com") from a URL, or null. */
const hostOf = (url) => {
  if (!url) return null
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
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

/**
 * Decode a Google News RSS article URL to the real publisher URL.
 * Google News switched to "AU_yqL…" encoding in July 2024 which requires
 * a POST to their batchexecute endpoint.
 */
async function decodeGoogleNewsUrl(gnUrl) {
  if (!gnUrl) return gnUrl
  try {
    const u = new URL(gnUrl)
    const parts = u.pathname.split('/')
    if (u.hostname !== 'news.google.com' || parts[parts.length - 2] !== 'articles') return gnUrl
    const base64 = parts[parts.length - 1].split('?')[0]

    // Try offline base64 decode first (older format)
    try {
      const str = Buffer.from(base64, 'base64').toString('binary')
      const prefix = Buffer.from([0x08, 0x13, 0x22]).toString('binary')
      let s = str.startsWith(prefix) ? str.slice(prefix.length) : str
      const suffix = Buffer.from([0xd2, 0x01, 0x00]).toString('binary')
      if (s.endsWith(suffix)) s = s.slice(0, -suffix.length)
      const bytes = Uint8Array.from(s, c => c.charCodeAt(0))
      const len = bytes[0]
      const decoded = len >= 0x80 ? s.slice(2, len + 2) : s.slice(1, len + 1)
      if (decoded.startsWith('http') && !decoded.startsWith('AU_yqL')) return decoded
    } catch { /* fall through to batchexecute */ }

    // New-style AU_yqL encoding — use Google's batchexecute API
    const body =
      'f.req=' +
      encodeURIComponent(
        '[[[\"Fbv4je\",\"[\\\"garturlreq\\\",[[\\\"en-US\\\",\\\"US\\\",[\\\"FINANCE_TOP_INDICES\\\",\\\"WEB_TEST_1_0_0\\\"],null,null,1,1,\\\"US:en\\\",null,180,null,null,null,null,null,0,null,null,[1608992183,723341000]],\\\"en-US\\\",\\\"US\\\",1,[2,3,4,8],1,0,\\\"655000234\\\",0,0,null,0],\\\"' +
        base64 +
        '\\\"]\",null,\"generic\"]]]'
      )

    const r = await fetchWithTimeout(
      'https://news.google.com/_/DotsSplashUi/data/batchexecute?rpcids=Fbv4je',
      5000,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
          Referer: 'https://news.google.com/'
        },
        body
      }
    )
    if (!r.ok) return gnUrl
    const text = await r.text()
    const header = '[\"garturlres\",\"'
    const footer = '\",\"'
    if (!text.includes(header)) return gnUrl
    const start = text.substring(text.indexOf(header) + header.length)
    const realUrl = start.substring(0, start.indexOf(footer))
    return realUrl.startsWith('http') ? realUrl : gnUrl
  } catch {
    return gnUrl
  }
}

/** Extract OpenGraph / Twitter card image URL from an article HTML page. */
async function fetchOgImage(gnArticleUrl) {
  if (!gnArticleUrl) return null
  try {
    const articleUrl = await decodeGoogleNewsUrl(gnArticleUrl)
    if (!articleUrl || /news\.google\.com/i.test(articleUrl)) return null

    const r = await fetchWithTimeout(articleUrl, 4000, { redirect: 'follow' })
    if (!r.ok) return null
    const html = await r.text()
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
    const sourceUrl  = pickAttr(block, 'source', 'url')
    if (!rawTitle) continue
    items.push({
      title:       stripSourceSuffix(rawTitle, source),
      link,
      source:      source || 'Google News',
      sourceUrl,
      domain:      hostOf(sourceUrl),
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

    // Try to fetch real article OG images. Google News' RSS link is a
    // wrapper that often returns the same interstitial thumbnail for
    // every article, so we detect and discard those duplicates and
    // let the client fall back to publisher favicons.
    const images = await Promise.all(top.map((it) => fetchOgImage(it.link)))
    const counts = images.reduce((acc, url) => {
      if (url) acc[url] = (acc[url] || 0) + 1
      return acc
    }, {})
    top.forEach((it, i) => {
      const url = images[i]
      // Drop any image that appears multiple times (= Google News default).
      it.image = url && counts[url] === 1 ? url : null
    })

    res.setHeader('cache-control', 'public, s-maxage=300, stale-while-revalidate=600')
    res.setHeader('access-control-allow-origin', '*')
    res.status(200).json({ items: top })
  } catch (err) {
    res.status(502).json({ error: err.message, items: [] })
  }
}
