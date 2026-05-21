# Personal TV Display

A premium, always-on **16:9 living-room dashboard** built with **Vite + React + Tailwind CSS**. Inspired by visionOS / iOS 18 — heavy glassmorphism, deep dark theme, rounded-3xl cards, no scrollbars. Designed to live on your TV forever.

## Modules

- **Header** — Large 12-hour clock, full date, OpenWeather current conditions
- **Today's Agenda** — Up to 5 upcoming Google Calendar events
- **Comm Center** — 5 most recent important unread Gmail messages
- **Daily Brief** — AI-generated daily overview (priorities, schedule, heads-up) via Gemini + your Calendar/Gmail
- **Top Headlines** — Rotating top-3+ headlines from NewsAPI

> Every module ships with **realistic mock data**. The dashboard is fully polished out of the box, even before you add any API keys.

## Quick start

```bash
npm install
cp .env.example .env   # optional — fill in keys when ready
npm run dev
```

Open the URL printed by Vite on your TV browser (typically `http://<your-pc-ip>:5173`) and put the browser into full-screen / kiosk mode.

## Login (Google) — one-time setup

The dashboard never shows a login wall. Sign in once on your phone or laptop, and the TV stays auto-logged in across reboots forever (token cached in `localStorage`, silently renewed before expiry).

**Google Cloud Console steps:**

1. Open https://console.cloud.google.com → create / pick a project.
2. **APIs & Services → Library** → enable **Google Calendar API** and **Gmail API**.
3. **APIs & Services → OAuth consent screen** → User type **External** → fill in app name + your email → add yourself as a Test User. (No verification needed for personal use.)
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**
   - **Authorized JavaScript origins** — add every URL the TV browser might load:
     - `http://localhost:5173`
     - `http://<your-pc-lan-ip>:5173` (e.g. `http://192.168.1.100:5173`)
5. Copy the generated **Client ID** into `.env`:
   ```
   VITE_GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
   ```
6. Restart `npm run dev`. A small "Sign in with Google" pill will appear bottom-right of the TV. Click it once (from your phone hitting the same URL is fine), grant Calendar + Gmail read access. The pill collapses to a small green dot — that's it.

**Sign out:** hover the green dot in the bottom-right corner, click the **Out** button.

## Adding API keys

All keys live in `.env` (Vite requires the `VITE_` prefix):

| Variable | Used by | Get it from |
|---|---|---|
| `VITE_OPENWEATHER_API_KEY` | Header weather | https://openweathermap.org/api |
| `VITE_WEATHER_LAT` / `VITE_WEATHER_LON` | Header weather | Your city coords (defaults to Buffalo) |
| `VITE_WEATHER_UNITS` | Header weather | `imperial` or `metric` |
| `VITE_NEWSAPI_KEY` | News widget | https://newsapi.org |
| `VITE_GOOGLE_CLIENT_ID` | Calendar + Gmail | https://console.cloud.google.com (see Login section above) |

Each widget contains a clearly marked `// TODO: ADD API INTEGRATION HERE` comment showing exactly where to drop your fetch / OAuth logic. If a fetch fails or a key is missing, the widget silently falls back to mock data — **the UI never shows a broken/loading state**.

The Sabres widget hits the public NHL API (`api-web.nhle.com`) via the Vite dev/preview proxy (`/api/nhl/*`) — needs no key, but **must** be served by `npm run dev` or `npm run preview` (not a plain static host) so the proxy is active.

## Project structure

```
personaltvdisplay/
├─ index.html
├─ package.json
├─ vite.config.js
├─ tailwind.config.js
├─ postcss.config.js
├─ .env.example
└─ src/
   ├─ main.jsx              ← Google OAuth + Auth providers
   ├─ App.jsx               ← 12×6 CSS grid for the whole TV
   ├─ index.css             ← Tailwind + glassmorphism utilities + mesh BG
   ├─ auth/
   │  ├─ AuthContext.jsx    ← shared auth state
   │  └─ useGoogleAuth.js   ← token storage + silent renewal
   └─ components/
      ├─ HeaderWidget.jsx
      ├─ CalendarWidget.jsx
      ├─ EmailWidget.jsx
      ├─ DailyBriefWidget.jsx
      ├─ NewsWidget.jsx
      └─ AuthPill.jsx       ← corner sign-in pill
```

## Notes

- Strict dark mode + soft animated mesh gradient to prevent burn-in and minimize room glare.
- All scrollbars globally hidden (`*::-webkit-scrollbar { display: none }`).
- Glassmorphism utility class is `.glass` — defined in `src/index.css`.
- For a real kiosk, set Chrome to `--kiosk --start-fullscreen` pointing at the dev/preview URL.
