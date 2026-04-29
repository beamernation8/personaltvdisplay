// Vercel serverless function — proxies NHL API to bypass browser CORS.
// File location: /api/nhl/[...path].js
// Triggered by any request to /api/nhl/*
//
// Example:
//   GET /api/nhl/v1/club-schedule/BUF/week/now
//     → https://api-web.nhle.com/v1/club-schedule/BUF/week/now

export default async function handler(req, res) {
  // Vercel passes the captured catch-all segments under req.query.path
  const segments = Array.isArray(req.query.path)
    ? req.query.path
    : [req.query.path].filter(Boolean)

  // Preserve query string from the original request (excluding `path`)
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(req.query)) {
    if (k === 'path') continue
    qs.append(k, String(v))
  }
  const query = qs.toString()

  const upstream =
    `https://api-web.nhle.com/${segments.join('/')}` +
    (query ? `?${query}` : '')

  try {
    const r = await fetch(upstream, {
      headers: { Accept: 'application/json' }
    })
    const body = await r.text()
    res.status(r.status)
    res.setHeader(
      'content-type',
      r.headers.get('content-type') ?? 'application/json'
    )
    res.setHeader('cache-control', 'public, max-age=30')
    res.setHeader('access-control-allow-origin', '*')
    res.send(body)
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
}
