// Netlify serverless function — proxies NHL API calls to bypass browser CORS.
// Triggered by the /api/nhl/* redirect in netlify.toml.
//
// Path examples:
//   /api/nhl/v1/club-schedule/BUF/week/now
//   → https://api-web.nhle.com/v1/club-schedule/BUF/week/now

export default async (req) => {
  const url = new URL(req.url)
  // Strip the function prefix so we forward only the upstream path + query.
  const upstreamPath =
    url.pathname.replace(/^\/\.netlify\/functions\/nhl/, '') +
    url.search
  const upstream = `https://api-web.nhle.com${upstreamPath}`

  try {
    const r = await fetch(upstream, {
      headers: { Accept: 'application/json' }
    })
    const body = await r.text()
    return new Response(body, {
      status: r.status,
      headers: {
        'content-type': r.headers.get('content-type') ?? 'application/json',
        'cache-control': 'public, max-age=30',
        // Allow the dashboard origin to read the response.
        'access-control-allow-origin': '*'
      }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 502,
      headers: { 'content-type': 'application/json' }
    })
  }
}
