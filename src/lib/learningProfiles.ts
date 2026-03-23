// ─── Shared Learning Profile Data ─────────────────────────────────────────────
// Used by onboarding (child MI quiz) and resources (Parent's Corner)
// MI framework based on Howard Gardner / Walter McKenzie
// VAK tips adapted from J.A. Beatrice, "Learning to Study Through Critical Thinking"

// ── Multiple Intelligences ────────────────────────────────────────────────────

export type MiCluster = 'analytical' | 'introspective' | 'interactive'

export const MI_CLUSTERS: Record<MiCluster, { label: string; tagline: string; color: string }> = {
  analytical: {
    label: 'Analytical',
    tagline: 'Heuristic thinkers — analyze, hypothesize, and incorporate data into existing ideas.',
    color: '#7c3aed',
  },
  introspective: {
    label: 'Introspective',
    tagline: 'Affective learners — need an emotive connection to new learning to make sense of it.',
    color: '#0284c7',
  },
  interactive: {
    label: 'Interactive',
    tagline: 'Social processors — invite interaction to achieve understanding, even when working alone.',
    color: '#059669',
  },
}

export const MI_INTELLIGENCES = [
  {
    id: 'logical',
    emoji: '🔢',
    name: 'Logical',
    fullName: 'Logical (Mathematical)',
    desc: 'Patterns, math & sequences',
    cluster: 'analytical' as MiCluster,
    detail: 'Displays an aptitude for numbers, reasoning, and problem solving. Thrives when teaching is logically sequenced and expectations are clear.',
  },
  {
    id: 'musical',
    emoji: '🎵',
    name: 'Musical',
    fullName: 'Musical (Rhythmic)',
    desc: 'Rhythm, sound & music',
    cluster: 'analytical' as MiCluster,
    detail: 'Learns through songs, patterns, rhythms, instruments, and musical expression. This intelligence is often overlooked in traditional settings.',
  },
  {
    id: 'naturalistic',
    emoji: '🌿',
    name: 'Naturalistic',
    fullName: 'Naturalist',
    desc: 'Nature, animals & outdoors',
    cluster: 'analytical' as MiCluster,
    detail: 'Loves the outdoors, animals, and field trips. Picks up on subtle differences in meanings and patterns. The traditional classroom has not been accommodating to these children.',
  },
  {
    id: 'intrapersonal',
    emoji: '🪞',
    name: 'Intrapersonal',
    fullName: 'Intrapersonal',
    desc: 'Self-awareness & reflection',
    cluster: 'introspective' as MiCluster,
    detail: 'Especially in touch with their own feelings, values, and ideas. May tend to be more reserved, but is actually quite intuitive about what they learn and how it relates to themselves.',
  },
  {
    id: 'existential',
    emoji: '🌌',
    name: 'Existential',
    fullName: 'Existentialist',
    desc: 'Big ideas & deep questions',
    cluster: 'introspective' as MiCluster,
    detail: 'Learns in the context of the "big picture." Asks "Why are we here?" and "What is our role in the world?" Naturally drawn to philosophy and meaning-making.',
  },
  {
    id: 'visual',
    emoji: '🎨',
    name: 'Visual',
    fullName: 'Visual (Spatial)',
    desc: 'Images, art & spatial thinking',
    cluster: 'introspective' as MiCluster,
    detail: 'Learns best visually and by organizing things spatially. Needs to see what you are talking about to understand. Loves charts, graphs, maps, illustrations, art, and puzzles.',
  },
  {
    id: 'verbal',
    emoji: '📖',
    name: 'Verbal',
    fullName: 'Verbal (Linguistic)',
    desc: 'Words, reading & stories',
    cluster: 'interactive' as MiCluster,
    detail: 'Demonstrates strength in language arts — speaking, writing, reading, listening. Has always been successful in traditional classrooms because this intelligence lends itself to traditional teaching.',
  },
  {
    id: 'kinesthetic',
    emoji: '🤸',
    name: 'Kinesthetic',
    fullName: 'Kinesthetic (Bodily)',
    desc: 'Movement & hands-on doing',
    cluster: 'interactive' as MiCluster,
    detail: 'Experiences learning best through activity: games, movement, hands-on tasks, building. These children were often labeled "overly active" in traditional classrooms.',
  },
  {
    id: 'interpersonal',
    emoji: '👥',
    name: 'Interpersonal',
    fullName: 'Interpersonal',
    desc: 'People, groups & teamwork',
    cluster: 'interactive' as MiCluster,
    detail: 'Noticeably people-oriented and outgoing. Learns cooperatively in groups or with a partner. May have been identified as "talkative" or "too social" in a traditional setting.',
  },
]

export const MI_REMEMBER = [
  'Everyone has all the intelligences!',
  'You can strengthen any intelligence!',
  'This is a snapshot in time — it can change!',
  'M.I. is meant to empower, not label.',
]

// ── VAK Learning Style Tips ───────────────────────────────────────────────────
// Adapted from J.A. Beatrice, "Learning to Study Through Critical Thinking"

export const VAK_TIPS: Record<string, { label: string; emoji: string; tips: string[] }> = {
  visual: {
    label: 'Visual', emoji: '👁️',
    tips: [
      'Use pictures, charts, maps, and graphs',
      'Highlight important points with colour',
      'Illustrate ideas as a picture or mind-map before writing',
      'Study in a quiet place away from verbal distractions',
      'Use illustrated books, videos, and multi-media',
      'Visualize information as a mental picture to aid memorization',
    ],
  },
  auditory: {
    label: 'Auditory', emoji: '👂',
    tips: [
      'Participate in discussions and debates',
      'Read text out loud',
      'Create songs or jingles to aid memorization',
      'Use verbal analogies and storytelling',
      'Discuss ideas out loud before writing them down',
      'Record lessons and listen back',
    ],
  },
  kinesthetic: {
    label: 'Kinesthetic', emoji: '🤸',
    tips: [
      'Take frequent movement breaks',
      'Learn new concepts while moving (read on a walk, mold clay)',
      'Work at a standing position when possible',
      'Use bright colours to highlight reading material',
      'Use hands-on activities and experiments',
      "Skim material first to get the gist — don't force linear reading",
    ],
  },
}

export type MiId = typeof MI_INTELLIGENCES[number]['id']
export type VakType = keyof typeof VAK_TIPS
