// Vercel serverless function — proxies NHL API to bypass browser CORS.
// File: /api/nhl.js
//
// Routing: vercel.json rewrites every /api/nhl/<anything> request to
//   /api/nhl?path=<anything>&<original-query-string>
// so this single function handles all upstream paths.

export default async function handler(req, res) {
  const path = (req.query.path ?? '').toString()

  // Forward all non-`path` query params to upstream.
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(req.query)) {
    if (k === 'path') continue
    qs.append(k, String(v))
  }
  const query = qs.toString()

  const upstream =
    `https://api-web.nhle.com/${path}` + (query ? `?${query}` : '')

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
