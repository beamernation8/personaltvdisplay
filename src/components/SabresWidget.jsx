import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { format, addHours, addDays } from 'date-fns'
import { Trophy, Calendar, Radio, Tv } from 'lucide-react'
import { useVisibilityRefresh } from '../hooks/useVisibilityRefresh.js'

const SABRES_ABBR = 'BUF'

/* ------------------------------------------------------------------ */
/*  Mock fallback — looks like a real upcoming game                   */
/* ------------------------------------------------------------------ */
const MOCK_GAME = {
  state: 'upcoming',
  startsAt: addHours(addDays(new Date(), 1), 3),
  home: { abbr: 'BUF', name: 'Sabres',      score: null, logo: null },
  away: { abbr: 'TOR', name: 'Maple Leafs', score: null, logo: null },
  venue: 'KeyBank Center',
  broadcast: 'MSG-B',
  series: null
}

/** Format the period descriptor object from the NHL API. */
const formatPeriod = (pd) => {
  if (!pd) return ''
  if (pd.periodType === 'OT') return 'OT'
  if (pd.periodType === 'SO') return 'SO'
  const n = pd.number
  if (!n) return ''
  return n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`
}

/** Map an NHL API game object to our render shape */
const mapGame = (g, gc) => {
  const s = g.gameState
  const isLive  = s === 'LIVE' || s === 'CRIT' || s === 'PRE'
  const isFinal = s === 'FINAL' || s === 'OFF'

  const team = (t) => ({
    id:    t.id,
    abbr:  t.abbrev,
    // NHL API: commonName.default ("Sabres"), placeName.default ("Buffalo")
    name:  t.commonName?.default ?? t.placeName?.default ?? t.abbrev,
    score: t.score ?? null,
    // dark-themed asset reads better on our dark UI
    logo:  t.darkLogo ?? t.logo ?? null
  })

  // Series info ("1st Round · Game 6") if in playoffs
  const series = g.seriesStatus
    ? `${g.seriesStatus.seriesTitle} \u00B7 Game ${g.seriesStatus.gameNumberOfSeries}`
    : null

  // Prefer home (Sabres) broadcast → US national → first available
  const tv = g.tvBroadcasts ?? []
  const broadcast =
    tv.find(b => b.market === 'H')?.network ??
    tv.find(b => b.countryCode === 'US')?.network ??
    tv[0]?.network ??
    ''

  // Live period + clock from the gamecenter "landing" feed (if available).
  // Fall back to whatever the schedule entry includes so we still show
  // something useful as soon as the schedule flips to LIVE.
  const periodDesc = gc?.periodDescriptor ?? g.periodDescriptor
  const clock      = gc?.clock           ?? g.clock
  const homeScore  = gc?.homeTeam?.score ?? g.homeTeam.score ?? null
  const awayScore  = gc?.awayTeam?.score ?? g.awayTeam.score ?? null

  const homeTeam = { ...team(g.homeTeam), score: homeScore }
  const awayTeam = { ...team(g.awayTeam), score: awayScore }

  return {
    id: g.id,
    state: isLive ? 'live' : isFinal ? 'final' : 'upcoming',
    startsAt: new Date(g.startTimeUTC),
    home: homeTeam,
    away: awayTeam,
    venue: g.venue?.default ?? '',
    broadcast,
    series,
    period:        formatPeriod(periodDesc),
    clock:         clock?.timeRemaining ?? '',
    intermission:  clock?.inIntermission ?? false
  }
}

/** Pick the most relevant game from a schedule list. */
const pickRelevantGame = (games) => {
  if (!games?.length) return null
  const live = games.find(g => ['LIVE', 'CRIT', 'PRE'].includes(g.gameState))
  if (live) return live
  const now = Date.now()
  const future = games
    .filter(g => new Date(g.startTimeUTC).getTime() >= now)
    .sort((a, b) => new Date(a.startTimeUTC) - new Date(b.startTimeUTC))
  return future[0] ?? games[games.length - 1]
}

const TeamLogo = ({ team, size = 88 }) => {
  if (team.logo) {
    return (
      <img
        src={team.logo}
        alt={`${team.name} logo`}
        style={{ width: size, height: size }}
        className="object-contain drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)]"
      />
    )
  }
  // Fallback monogram tile
  return (
    <div
      style={{ width: size, height: size }}
      className="flex items-center justify-center rounded-2xl
                 bg-gradient-to-br from-white/10 to-white/[0.02]
                 ring-1 ring-white/10 text-2xl font-extrabold tracking-tight text-white"
    >
      {team.abbr}
    </div>
  )
}

export default function SabresWidget() {
  const [game, setGame] = useState(MOCK_GAME)
  const [isLiveState, setIsLive] = useState(false)

  const fetchRef = useRef(async () => {})
  fetchRef.current = async () => {
    try {
      // 1. Pick the most relevant game from this week's schedule.
      const { data } = await axios.get(
        `/api/nhl/v1/club-schedule/${SABRES_ABBR}/week/now`
      )
      const next = pickRelevantGame(data?.games)
      if (!next) return

      const isLive = ['LIVE', 'CRIT', 'PRE'].includes(next.gameState)

      // 2. If the game is live, fetch the gamecenter landing feed
      //    for period / clock / live scores.
      let gc = null
      if (isLive) {
        try {
          const lr = await axios.get(`/api/nhl/v1/gamecenter/${next.id}/landing`)
          gc = lr.data
        } catch (err) {
          console.warn('[Sabres] gamecenter fetch failed:', err.message)
        }
      }

      setIsLive(isLive)
      setGame(mapGame(next, gc))
    } catch (err) {
      console.warn('[Sabres] falling back to mock:', err.message)
    }
  }

  useEffect(() => {
    fetchRef.current?.()
    // 15 s during live games, 60 s otherwise.
    const id = setInterval(
      () => fetchRef.current?.(),
      isLiveState ? 15_000 : 60_000
    )
    return () => clearInterval(id)
  }, [isLiveState])

  // Refresh instantly when the TV/tab wakes up.
  useVisibilityRefresh(() => fetchRef.current?.())

  const isLive  = game.state === 'live'
  const isFinal = game.state === 'final'

  return (
    <div className="glass relative flex h-full w-full flex-col p-7">
      {/* Soft Sabres-blue glow */}
      <div className="pointer-events-none absolute -top-20 -right-16 h-64 w-64 rounded-full bg-blue-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />

      <header className="relative mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trophy className="h-5 w-5 text-amber-300/80" strokeWidth={1.8} />
          <h2 className="widget-title">Sabres Tracker</h2>
        </div>

        {isLive ? (
          <span className="flex items-center gap-2 rounded-full bg-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-200 ring-1 ring-rose-400/40">
            <Radio className="h-3 w-3 animate-pulse" />
            {game.intermission
              ? `${game.period || 'INT'} INT`
              : game.period && game.clock
                ? `${game.period} · ${game.clock}`
                : 'LIVE'}
          </span>
        ) : isFinal ? (
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/70">
            FINAL
          </span>
        ) : (
          <span className="flex items-center gap-2 text-xs font-medium text-white/50">
            <Calendar className="h-3.5 w-3.5" strokeWidth={1.8} />
            {format(game.startsAt, 'EEE, MMM d')}
          </span>
        )}
      </header>

      {/* Optional playoff series banner */}
      {game.series && (
        <p className="relative mb-2 text-center text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-amber-200/80">
          {game.series}
        </p>
      )}

      {/* Matchup row */}
      <div className="relative flex flex-1 items-center justify-between gap-4">
        {/* Away */}
        <div className="flex flex-1 flex-col items-center gap-2 text-center">
          <TeamLogo team={game.away} />
          <p className="text-base font-semibold text-white">{game.away.name}</p>
          {game.away.score !== null && (
            <p className="text-5xl font-light text-white">{game.away.score}</p>
          )}
        </div>

        {/* Center */}
        <div className="flex flex-col items-center gap-1 px-2">
          {isLive ? (
            <>
              <p className="text-sm font-semibold uppercase tracking-widest text-rose-200">
                {game.intermission ? 'Intermission' : 'Live'}
              </p>
              {game.period && (
                <p className="text-xs font-medium uppercase tracking-widest text-white/55">
                  {game.period}
                </p>
              )}
              {game.clock && !game.intermission && (
                <p className="font-mono text-base font-semibold text-white">
                  {game.clock}
                </p>
              )}
            </>
          ) : isFinal ? (
            <p className="text-sm font-semibold uppercase tracking-widest text-white/40">
              Final{game.period && game.period !== '3rd' ? ` / ${game.period}` : ''}
            </p>
          ) : (
            <>
              <p className="text-3xl font-light text-white">
                {format(game.startsAt, 'h:mm')}
              </p>
              <p className="text-xs uppercase tracking-widest text-white/40">
                {format(game.startsAt, 'a')}
              </p>
            </>
          )}
          <p className="mt-1 text-[0.65rem] font-medium uppercase tracking-widest text-white/30">
            vs
          </p>
        </div>

        {/* Home */}
        <div className="flex flex-1 flex-col items-center gap-2 text-center">
          <TeamLogo team={game.home} />
          <p className="text-base font-semibold text-white">{game.home.name}</p>
          {game.home.score !== null && (
            <p className="text-5xl font-light text-white">{game.home.score}</p>
          )}
        </div>
      </div>

      {/* Footer meta */}
      <footer className="relative mt-3 flex items-center justify-between text-xs text-white/40">
        <span className="truncate">{game.venue || '\u00A0'}</span>
        {game.broadcast && (
          <span className="flex items-center gap-1.5 rounded-md bg-white/[0.06] px-2 py-0.5 ring-1 ring-white/10">
            <Tv className="h-3 w-3" strokeWidth={1.8} />
            {game.broadcast}
          </span>
        )}
      </footer>
    </div>
  )
}
