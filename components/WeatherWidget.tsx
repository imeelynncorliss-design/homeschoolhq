'use client'

import { useEffect, useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface WeatherData {
  tempF: number
  condition: string
  emoji: string
  city: string
  scoutTip: string
  tipColor: string
}

// ─── WMO weather code → label + emoji ────────────────────────────────────────

function interpretCode(code: number, tempF: number): { condition: string; emoji: string; scoutTip: string; tipColor: string } {
  if (code === 0 || code === 1) {
    if (tempF >= 90) return {
      condition: 'Sunny & Hot', emoji: '🌡️',
      scoutTip: "It's a scorcher today — keep learning cool inside.",
      tipColor: '#dc2626',
    }
    if (tempF <= 28) return {
      condition: 'Clear & Cold', emoji: '🥶',
      scoutTip: 'Bundle-up weather! Stick to cozy indoor activities today.',
      tipColor: '#2563eb',
    }
    return {
      condition: 'Clear & Sunny', emoji: '☀️',
      scoutTip: 'Beautiful day! Great opportunity to take learning outside.',
      tipColor: '#059669',
    }
  }
  if (code === 2 || code === 3) return {
    condition: code === 2 ? 'Partly Cloudy' : 'Overcast', emoji: '⛅',
    scoutTip: 'Nice day overall — outdoor breaks between subjects could help focus.',
    tipColor: '#0d9488',
  }
  if (code === 45 || code === 48) return {
    condition: 'Foggy', emoji: '🌫️',
    scoutTip: 'Foggy morning — a good day for quiet, focused indoor work.',
    tipColor: '#6b7280',
  }
  if (code >= 51 && code <= 57) return {
    condition: 'Drizzling', emoji: '🌦️',
    scoutTip: 'Light rain today. Cozy inside with books and hands-on projects.',
    tipColor: '#7c3aed',
  }
  if (code >= 61 && code <= 67) return {
    condition: 'Rainy', emoji: '🌧️',
    scoutTip: 'Rainy day — perfect for indoor experiments, reading, or a movie lesson.',
    tipColor: '#2563eb',
  }
  if (code >= 71 && code <= 77) return {
    condition: 'Snowing', emoji: '❄️',
    scoutTip: 'Snow day energy! Lean in — snow science, nature journaling, or a free day.',
    tipColor: '#0284c7',
  }
  if (code >= 80 && code <= 82) return {
    condition: 'Showers', emoji: '🌦️',
    scoutTip: 'On-and-off showers expected. Plan for a mostly-indoor day.',
    tipColor: '#7c3aed',
  }
  if (code >= 85 && code <= 86) return {
    condition: 'Snow Showers', emoji: '🌨️',
    scoutTip: 'Snow showers coming. A perfect snow-day schedule might be just the thing.',
    tipColor: '#0284c7',
  }
  if (code >= 95) return {
    condition: 'Thunderstorm', emoji: '⛈️',
    scoutTip: 'Storm alert! Stay safe inside — great for screen-free, cozy learning.',
    tipColor: '#dc2626',
  }
  return {
    condition: 'Variable', emoji: '🌤️',
    scoutTip: 'Mixed conditions today — plan to be flexible with your schedule.',
    tipColor: '#6b7280',
  }
}

const CACHE_KEY = 'hr_weather_v1'
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

function loadCache(): WeatherData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL) return null
    return data
  } catch { return null }
}

function saveCache(data: WeatherData) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() })) } catch {}
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'denied' | 'error'>('idle')

  useEffect(() => {
    const cached = loadCache()
    if (cached) { setWeather(cached); return }

    if (!navigator.geolocation) { setStatus('error'); return }

    setStatus('loading')

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude: lat, longitude: lon } = coords
        try {
          const [weatherRes, geoRes] = await Promise.all([
            fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=fahrenheit&timezone=auto`
            ),
            fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`,
              { headers: { 'Accept-Language': 'en' } }
            ),
          ])

          if (!weatherRes.ok) throw new Error('weather fetch failed')
          const wJson = await weatherRes.json()
          const gJson = geoRes.ok ? await geoRes.json() : null

          const tempF = Math.round(wJson.current_weather.temperature)
          const code = wJson.current_weather.weathercode
          const { condition, emoji, scoutTip, tipColor } = interpretCode(code, tempF)

          const city =
            gJson?.address?.city ||
            gJson?.address?.town ||
            gJson?.address?.village ||
            gJson?.address?.county ||
            'Your Area'

          const data: WeatherData = { tempF, condition, emoji, city, scoutTip, tipColor }
          saveCache(data)
          setWeather(data)
          setStatus('idle')
        } catch {
          setStatus('error')
        }
      },
      () => setStatus('denied')
    )
  }, [])

  // Don't render anything if denied or errored — don't clutter the dashboard
  if (status === 'denied' || status === 'error') return null

  if (status === 'loading' || (status === 'idle' && !weather)) {
    return (
      <div style={card}>
        <style>{`@keyframes hr-spin { to { transform: rotate(360deg) } }`}</style>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #e9d5ff', borderTopColor: '#7c3aed', animation: 'hr-spin 0.8s linear infinite' }} />
          <span style={{ fontSize: 13, color: '#9ca3af', fontWeight: 600 }}>Getting local weather…</span>
        </div>
      </div>
    )
  }

  if (!weather) return null

  return (
    <div style={card}>
      {/* Left: temp + condition + city */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
        <span style={{ fontSize: 36, lineHeight: 1 }}>{weather.emoji}</span>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 26, fontWeight: 900, color: '#1a1a2e', lineHeight: 1 }}>{weather.tempF}°F</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#6b7280' }}>{weather.condition}</span>
          </div>
          <div style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600, marginTop: 2 }}>{weather.city}</div>
        </div>
      </div>

      {/* Right: Scout tip */}
      <div style={{
        flex: 2, borderLeft: `3px solid ${weather.tipColor}20`,
        paddingLeft: 14, display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <img src="/Cardinal_Mascot.png" alt="Scout" style={{ width: 26, height: 26, objectFit: 'contain', flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: '#374151', fontWeight: 600, lineHeight: 1.4 }}>
          {weather.scoutTip}
        </span>
      </div>
    </div>
  )
}

const card: React.CSSProperties = {
  background: 'rgba(255,255,255,0.82)',
  borderRadius: 16,
  border: '1.5px solid rgba(124,58,237,0.10)',
  backdropFilter: 'blur(8px)',
  boxShadow: '0 2px 12px rgba(124,58,237,0.07)',
  padding: '14px 18px',
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  flexWrap: 'wrap' as const,
}
