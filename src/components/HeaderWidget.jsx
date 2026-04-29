import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import {
  Sun,
  Cloud,
  CloudSun,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  Wind
} from 'lucide-react'
import axios from 'axios'

/* ------------------------------------------------------------------ */
/*  Mock fallback — used when no API key or fetch fails               */
/* ------------------------------------------------------------------ */
const MOCK_WEATHER = {
  temp: 38,
  feels_like: 31,
  high: 42,
  low: 29,
  description: 'Partly Cloudy',
  icon: 'partly-cloudy',
  city: 'Buffalo'
}

/* OpenWeather "main" → our icon key */
const mapOWMIcon = (main = '', id = 800) => {
  const m = main.toLowerCase()
  if (m.includes('thunder')) return 'thunder'
  if (m.includes('drizzle') || m.includes('rain')) return 'rain'
  if (m.includes('snow')) return 'snow'
  if (m.includes('mist') || m.includes('fog') || m.includes('haze')) return 'fog'
  if (id === 800) return 'sun'
  if (m.includes('cloud')) return id === 801 ? 'partly-cloudy' : 'cloud'
  return 'partly-cloudy'
}

const WeatherIcon = ({ kind, className = 'h-12 w-12' }) => {
  const props = { className, strokeWidth: 1.5 }
  switch (kind) {
    case 'sun':           return <Sun {...props} />
    case 'cloud':         return <Cloud {...props} />
    case 'rain':          return <CloudRain {...props} />
    case 'snow':          return <CloudSnow {...props} />
    case 'thunder':       return <CloudLightning {...props} />
    case 'fog':           return <CloudFog {...props} />
    case 'wind':          return <Wind {...props} />
    case 'partly-cloudy':
    default:              return <CloudSun {...props} />
  }
}

export default function HeaderWidget() {
  const [now, setNow]         = useState(new Date())
  const [weather, setWeather] = useState(MOCK_WEATHER)

  /* Live clock — tick every second, render every minute (no seconds shown) */
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000)
    return () => clearInterval(id)
  }, [])

  /* Weather fetch */
  useEffect(() => {
    const key   = import.meta.env.VITE_OPENWEATHER_API_KEY
    const lat   = import.meta.env.VITE_WEATHER_LAT  || 42.8864
    const lon   = import.meta.env.VITE_WEATHER_LON  || -78.8784
    const units = import.meta.env.VITE_WEATHER_UNITS || 'imperial'

    // TODO: ADD API INTEGRATION HERE — drop your OpenWeather key in .env
    if (!key) return // keep mock data — UI stays polished

    let cancelled = false
    const fetchWeather = async () => {
      try {
        const { data } = await axios.get(
          'https://api.openweathermap.org/data/2.5/weather',
          { params: { lat, lon, units, appid: key } }
        )
        if (cancelled) return
        setWeather({
          temp:        Math.round(data.main.temp),
          feels_like:  Math.round(data.main.feels_like),
          high:        Math.round(data.main.temp_max),
          low:         Math.round(data.main.temp_min),
          description: data.weather?.[0]?.description ?? 'Clear',
          icon:        mapOWMIcon(data.weather?.[0]?.main, data.weather?.[0]?.id),
          city:        data.name
        })
      } catch (err) {
        console.warn('[Weather] falling back to mock:', err.message)
      }
    }

    fetchWeather()
    const id = setInterval(fetchWeather, 10 * 60 * 1000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  const time = format(now, 'h:mm')
  const ampm = format(now, 'a')
  const date = format(now, 'EEEE, MMMM d')

  return (
    <div className="glass h-full w-full px-10 py-5">
      <div className="flex h-full items-center justify-between">
        {/* Time + date */}
        <div className="flex items-baseline gap-4">
          <h1 className="text-7xl font-light leading-none tracking-tight text-white">
            {time}
            <span className="ml-3 text-3xl font-light text-white/50">{ampm}</span>
          </h1>
          <p className="ml-2 text-xl font-medium text-white/70">{date}</p>
        </div>

        {/* Weather */}
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-sm uppercase tracking-[0.2em] text-white/50">
              {weather.city}
            </p>
            <p className="text-base font-medium text-white/80 capitalize">
              {weather.description}
            </p>
            <p className="text-xs text-white/50">
              H {weather.high}°  ·  L {weather.low}°
            </p>
          </div>
          <div className="flex items-center gap-3 text-white">
            <WeatherIcon kind={weather.icon} className="h-14 w-14 text-sky-200/90" />
            <span className="text-6xl font-extralight leading-none">
              {weather.temp}°
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
