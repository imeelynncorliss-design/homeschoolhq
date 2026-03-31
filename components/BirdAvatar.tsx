'use client'

// ─── Card gradients — one per child slot (cycles if > 7 children) ─────────────
export const CARD_GRADIENTS = [
  'linear-gradient(135deg, #b45309 0%, #f59e0b 100%)',  // amber   — Owl
  'linear-gradient(135deg, #1d4ed8 0%, #60a5fa 100%)',  // blue    — Blue Jay
  'linear-gradient(135deg, #dc2626 0%, #f87171 100%)',  // red     — Robin
  'linear-gradient(135deg, #047857 0%, #34d399 100%)',  // green   — Hummingbird
  'linear-gradient(135deg, #ca8a04 0%, #fde047 100%)',  // yellow  — Goldfinch
  'linear-gradient(135deg, #be185d 0%, #f9a8d4 100%)',  // pink    — Dove
  'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',  // purple  — Cardinal
]

// ─── Superpower copy keyed to MI IDs from learningProfiles.ts ─────────────────
export const MI_SUPERPOWERS: Record<string, string> = {
  logical:       'You see patterns, categories, and cause-and-effect everywhere.',
  musical:       'You are sensitive to rhythm, pitch, and patterns in sound.',
  naturalistic:  'You are energized by the outdoors and categorizing the living world.',
  intrapersonal: 'You need quiet time to "mull things over" and set your own goals.',
  existential:   'You ask the big "why" questions and connect learning to meaning.',
  visual:        'You think in pictures and remember what you see better than what you hear.',
  verbal:        'You love stories, words, and the "why" behind language.',
  kinesthetic:   'You learn by doing — sitting still is your biggest "learning tax."',
  interpersonal: 'You process information best when talking it through with others.',
}

// ─── Bird SVGs (80×80 viewBox, cute + recognizable) ───────────────────────────

function Owl() {
  return (
    <svg viewBox="0 0 80 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      {/* Body */}
      <ellipse cx="40" cy="57" rx="20" ry="17" fill="#92400e" />
      {/* Head */}
      <circle cx="40" cy="32" r="21" fill="#a16207" />
      {/* Ear tufts */}
      <polygon points="28,14 24,5 33,12" fill="#78350f" />
      <polygon points="52,14 56,5 47,12" fill="#78350f" />
      {/* Facial disk */}
      <ellipse cx="40" cy="34" rx="16" ry="15" fill="#fef3c7" />
      {/* Eyes */}
      <circle cx="32" cy="31" r="7.5" fill="#fbbf24" />
      <circle cx="48" cy="31" r="7.5" fill="#fbbf24" />
      <circle cx="32" cy="31" r="4.5" fill="#111" />
      <circle cx="48" cy="31" r="4.5" fill="#111" />
      <circle cx="33.5" cy="29.5" r="1.8" fill="#fff" />
      <circle cx="49.5" cy="29.5" r="1.8" fill="#fff" />
      {/* Beak */}
      <polygon points="40,38 36,45 44,45" fill="#f97316" />
      {/* Belly feather bands */}
      <path d="M 24 58 Q 40 55 56 58" stroke="#78350f" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M 24 64 Q 40 61 56 64" stroke="#78350f" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Feet */}
      <path d="M 31 71 L 27 76 M 31 71 L 31 77 M 31 71 L 35 76" stroke="#f97316" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M 49 71 L 45 76 M 49 71 L 49 77 M 49 71 L 53 76" stroke="#f97316" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  )
}

function BlueJay() {
  return (
    <svg viewBox="0 0 80 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      {/* Tail */}
      <ellipse cx="14" cy="57" rx="14" ry="5" fill="#1d4ed8" transform="rotate(-18 14 57)" />
      {/* Body */}
      <ellipse cx="38" cy="54" rx="23" ry="17" fill="#3b82f6" />
      {/* White belly */}
      <ellipse cx="42" cy="57" rx="14" ry="11" fill="#f8fafc" />
      {/* Head */}
      <circle cx="54" cy="33" r="16" fill="#3b82f6" />
      {/* Crest */}
      <polygon points="50,9 46,22 56,20" fill="#1d4ed8" />
      <polygon points="54,7 50,20 59,19" fill="#2563eb" />
      {/* White face patch */}
      <ellipse cx="56" cy="36" rx="10" ry="8" fill="#f8fafc" />
      {/* Black necklace */}
      <path d="M 39 44 Q 53 48 62 41" stroke="#111" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* Eye */}
      <circle cx="60" cy="31" r="5" fill="#111" />
      <circle cx="61.5" cy="29.5" r="1.8" fill="#fff" />
      {/* Beak */}
      <polygon points="62,34 73,37 62,41" fill="#374151" />
      {/* Wing bar */}
      <path d="M 20 50 Q 35 46 50 50" stroke="#1d4ed8" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M 20 55 Q 35 51 50 55" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  )
}

function Robin() {
  return (
    <svg viewBox="0 0 80 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      {/* Tail */}
      <ellipse cx="14" cy="57" rx="13" ry="5" fill="#374151" transform="rotate(-15 14 57)" />
      {/* Body */}
      <ellipse cx="38" cy="54" rx="22" ry="17" fill="#4b5563" />
      {/* Orange breast */}
      <ellipse cx="43" cy="57" rx="15" ry="12" fill="#f97316" />
      {/* Head */}
      <circle cx="54" cy="33" r="15" fill="#111827" />
      {/* Eye ring */}
      <circle cx="60" cy="29" r="6.5" fill="none" stroke="#fff" strokeWidth="2" />
      {/* Eye */}
      <circle cx="60" cy="29" r="4.5" fill="#111" />
      <circle cx="61.5" cy="27.5" r="1.8" fill="#fff" />
      {/* Beak */}
      <polygon points="63,35 74,38 63,42" fill="#fbbf24" />
      {/* Wing detail */}
      <path d="M 20 49 Q 34 45 48 49" stroke="#6b7280" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  )
}

function Hummingbird() {
  return (
    <svg viewBox="0 0 80 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      {/* Tail */}
      <ellipse cx="13" cy="54" rx="10" ry="4" fill="#065f46" transform="rotate(-25 13 54)" />
      {/* Wing blur (behind body) */}
      <ellipse cx="33" cy="37" rx="22" ry="9" fill="#6ee7b7" opacity="0.6" transform="rotate(-20 33 37)" />
      {/* Body */}
      <ellipse cx="38" cy="50" rx="17" ry="11" fill="#10b981" />
      {/* Ruby throat */}
      <ellipse cx="50" cy="47" rx="8" ry="5.5" fill="#dc2626" />
      {/* White belly */}
      <ellipse cx="40" cy="53" rx="9" ry="7" fill="#d1fae5" />
      {/* Head */}
      <circle cx="55" cy="33" r="13" fill="#059669" />
      {/* Eye */}
      <circle cx="60" cy="29" r="4.5" fill="#111" />
      <circle cx="61.5" cy="27.5" r="1.8" fill="#fff" />
      {/* Long beak */}
      <path d="M 63 35 L 78 31" stroke="#374151" strokeWidth="3" strokeLinecap="round" />
      <path d="M 63 36 L 78 33" stroke="#4b5563" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function Goldfinch() {
  return (
    <svg viewBox="0 0 80 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      {/* Tail */}
      <ellipse cx="14" cy="57" rx="12" ry="5" fill="#111" transform="rotate(-15 14 57)" />
      {/* Wing (behind body) */}
      <ellipse cx="32" cy="52" rx="18" ry="10" fill="#1f2937" transform="rotate(-8 32 52)" />
      {/* Wing bar */}
      <path d="M 18 51 Q 32 47 46 52" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Body */}
      <ellipse cx="40" cy="54" rx="21" ry="15" fill="#fbbf24" />
      {/* Head */}
      <circle cx="55" cy="33" r="15" fill="#fbbf24" />
      {/* Black cap */}
      <ellipse cx="54" cy="22" rx="11" ry="9" fill="#111" />
      {/* Eye */}
      <circle cx="61" cy="31" r="4.5" fill="#111" />
      <circle cx="62.5" cy="29.5" r="1.8" fill="#fff" />
      {/* Beak */}
      <polygon points="63,36 74,38 63,41" fill="#f97316" />
    </svg>
  )
}

function Dove() {
  return (
    <svg viewBox="0 0 80 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      {/* Tail feathers */}
      <ellipse cx="13" cy="56" rx="15" ry="5" fill="#e5e7eb" transform="rotate(-12 13 56)" />
      <ellipse cx="11" cy="53" rx="13" ry="4" fill="#d1d5db" transform="rotate(-5 11 53)" />
      {/* Body */}
      <ellipse cx="39" cy="52" rx="23" ry="17" fill="#f9fafb" />
      {/* Wing fold */}
      <path d="M 18 50 Q 36 44 54 50 Q 36 56 18 50 Z" fill="#e5e7eb" />
      {/* Head */}
      <circle cx="55" cy="32" r="15" fill="#f9fafb" />
      {/* Rosy blush */}
      <ellipse cx="58" cy="37" rx="8" ry="5" fill="#fecdd3" opacity="0.8" />
      {/* Iridescent neck sheen */}
      <path d="M 44 41 Q 50 36 57 43" stroke="#a78bfa" strokeWidth="2" fill="none" opacity="0.7" strokeLinecap="round" />
      <path d="M 46 44 Q 52 39 58 45" stroke="#34d399" strokeWidth="1.5" fill="none" opacity="0.5" strokeLinecap="round" />
      {/* Eye ring */}
      <circle cx="61" cy="29" r="6" fill="none" stroke="#c4b5fd" strokeWidth="1.5" />
      {/* Eye */}
      <circle cx="61" cy="29" r="4" fill="#111" />
      <circle cx="62.5" cy="27.5" r="1.8" fill="#fff" />
      {/* Beak */}
      <polygon points="63,33 72,36 63,40" fill="#fda4af" />
    </svg>
  )
}

function Cardinal() {
  return (
    <svg viewBox="0 0 80 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      {/* Tail */}
      <ellipse cx="13" cy="57" rx="14" ry="5" fill="#b91c1c" transform="rotate(-18 13 57)" />
      {/* Body */}
      <ellipse cx="37" cy="53" rx="23" ry="17" fill="#ef4444" />
      {/* Wing shading */}
      <ellipse cx="34" cy="51" rx="17" ry="10" fill="#dc2626" />
      {/* Head */}
      <circle cx="54" cy="33" r="16" fill="#ef4444" />
      {/* Crest */}
      <polygon points="53,9 48,23 59,22" fill="#dc2626" />
      <polygon points="57,7 52,21 62,21" fill="#b91c1c" />
      {/* Black mask — lower face */}
      <ellipse cx="55" cy="39" rx="13" ry="7" fill="#111" />
      {/* Black around eye area */}
      <ellipse cx="53" cy="33" rx="9" ry="8" fill="#111" />
      {/* Eye — on top of mask */}
      <circle cx="61" cy="29" r="5" fill="#1a1a1a" />
      <circle cx="62.5" cy="27.5" r="1.8" fill="#fff" />
      {/* Beak */}
      <polygon points="63,38 75,42 63,47" fill="#f97316" />
      <line x1="63" y1="42" x2="75" y2="42" stroke="#ea580c" strokeWidth="1" />
    </svg>
  )
}

const BIRDS = [Owl, BlueJay, Robin, Hummingbird, Goldfinch, Dove, Cardinal]

export function BirdAvatar({ index, size = 64 }: { index: number; size?: number }) {
  const Bird = BIRDS[index % BIRDS.length]
  return (
    <div style={{
      width: size, height: size,
      borderRadius: '50%',
      overflow: 'hidden',
      background: 'rgba(255,255,255,0.18)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Bird />
    </div>
  )
}
