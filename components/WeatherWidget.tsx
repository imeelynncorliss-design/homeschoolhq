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

const DISMISSED_KEY = 'hr_weather_nudge_dismissed'

// ─── Component ────────────────────────────────────────────────────────────────

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'pre-prompt' | 'denied' | 'error'>('idle')
  const [nudgeDismissed, setNudgeDismissed] = useState(false)
  const [showHowTo, setShowHowTo] = useState(false)

  const requestLocation = () => {
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
  }

  useEffect(() => {
    const cached = loadCache()
    if (cached) { setWeather(cached); return }

    try { if (localStorage.getItem(DISMISSED_KEY)) { setNudgeDismissed(true); return } } catch {}

    if (!navigator.geolocation) { setStatus('error'); return }

    // Check if the user has already answered the permission prompt
    if (typeof navigator.permissions !== 'undefined') {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then(perm => {
        if (perm.state === 'granted') {
          requestLocation()
        } else if (perm.state === 'denied') {
          setStatus('denied')
        } else {
          // 'prompt' — show our explanation before triggering the browser dialog
          setStatus('pre-prompt')
        }
      }).catch(() => {
        // Permissions API unavailable — go straight to request
        requestLocation()
      })
    } else {
      requestLocation()
    }
  }, [])

  // ── Pre-prompt: explain what location is used for before the browser asks ──
  if (status === 'pre-prompt') {
    return (
      <div style={{ ...card, gap: 10, flexWrap: 'wrap' as const }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <img src="/Cardinal_Mascot.png" alt="Scout" style={{ width: 32, height: 32, objectFit: 'contain', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', lineHeight: 1.3 }}>
              Enable weather & Scout's daily tip ☀️
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              HomeschoolReady uses your location <strong>only</strong> to show today's local weather and Scout's personalized daily greeting. It's never stored or shared.
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <button
            onClick={requestLocation}
            style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: '#7c3aed', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer' }}
          >
            Turn on ✓
          </button>
          <button
            onClick={() => {
              try { localStorage.setItem(DISMISSED_KEY, '1') } catch {}
              setNudgeDismissed(true)
            }}
            style={{ fontSize: 12, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 4px' }}
          >
            Not now
          </button>
        </div>
      </div>
    )
  }

  // ── Denied: show a soft "enable weather" nudge ────────────────────────────
  if (status === 'denied') {
    if (nudgeDismissed) return null
    return (
      <div style={{ ...card, gap: 10, flexWrap: 'wrap' as const }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <img src="/Cardinal_Mascot.png" alt="Scout" style={{ width: 28, height: 28, objectFit: 'contain', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', lineHeight: 1.3 }}>
              Get weather + Scout's daily tip ☀️
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              Turn on location to see live weather and a personalized Scout greeting each day.
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <button
            onClick={() => setShowHowTo(true)}
            style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', background: '#ede9fe', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}
          >
            How to enable
          </button>
          <button
            onClick={() => {
              try { localStorage.setItem(DISMISSED_KEY, '1') } catch {}
              setNudgeDismissed(true)
            }}
            style={{ fontSize: 12, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 4px' }}
          >
            Not now
          </button>
        </div>

        {showHowTo && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: 24, maxWidth: 380, width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <img src="/Cardinal_Mascot.png" alt="Scout" style={{ width: 32, height: 32, objectFit: 'contain' }} />
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#111827' }}>Enable Location for Scout</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Your browser blocked location access</div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, marginBottom: 16 }}>
                To re-enable it, look for the <strong>lock icon 🔒</strong> in your browser's address bar and set <strong>Location → Allow</strong>.<br /><br />
                On iPhone/iPad, go to <strong>Settings → Safari → Location</strong> and set it to <em>Allow</em>.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => { setShowHowTo(false); requestLocation() }}
                  style={{ flex: 1, padding: '10px 0', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                >
                  Try again
                </button>
                <button
                  onClick={() => setShowHowTo(false)}
                  style={{ padding: '10px 16px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (status === 'error') return null

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
