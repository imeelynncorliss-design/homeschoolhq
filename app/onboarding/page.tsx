'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/src/lib/supabase'
import { CANONICAL_SUBJECTS } from '@/src/constants/subjects'
import { DEFAULT_FLEXIBLE, DEFAULT_STRUCTURED } from '@/components/StylePickerModal'

// ── State Data ────────────────────────────────────────────────────────────────

type StateReq  = { icon: string; label: string; desc: string }
type StateData = {
  code: string; difficulty: 'Easy' | 'Moderate' | 'Strict'
  diffColor: string; note: string; goalDays: string; reqs: StateReq[]
}

const SUPPORTED_STATES: Record<string, StateData> = {
  'North Carolina': {
    code: 'NC', difficulty: 'Moderate', diffColor: '#F59E0B', goalDays: '180',
    note: 'NC is one of the more structured states — but HomeschoolReady handles all of this automatically.',
    reqs: [
      { icon: '📋', label: 'Notice of Intent', desc: 'File annually with your local school district before Aug 1st or within 30 days of starting.' },
      { icon: '📅', label: '180 Teaching Days', desc: 'Required minimum per school year across all subjects.' },
      { icon: '📚', label: '9 Core Subjects', desc: 'English, math, science, social studies, health, PE, arts, foreign language, and computer skills.' },
      { icon: '📊', label: 'Annual Assessment', desc: 'Nationally standardized test OR review by a certified teacher required each year.' },
    ],
  },
  'Texas': {
    code: 'TX', difficulty: 'Easy', diffColor: '#10B981', goalDays: '180',
    note: 'Texas is one of the most homeschool-friendly states. Very few requirements.',
    reqs: [
      { icon: '📋', label: 'No Registration Required', desc: 'Texas does not require you to notify anyone that you are homeschooling.' },
      { icon: '📚', label: 'Bona Fide Curriculum', desc: 'Must cover reading, spelling, grammar, math, and good citizenship.' },
      { icon: '📁', label: 'No Testing Required', desc: 'Texas does not require standardized testing or portfolio reviews.' },
    ],
  },
  'Florida': {
    code: 'FL', difficulty: 'Moderate', diffColor: '#F59E0B', goalDays: '180',
    note: 'Florida requires a portfolio — HomeschoolReady helps you build one automatically.',
    reqs: [
      { icon: '📋', label: 'Notice of Intent', desc: 'File with your county school superintendent within 30 days of starting.' },
      { icon: '📅', label: '180 Teaching Days', desc: 'Required minimum per school year.' },
      { icon: '📊', label: 'Annual Evaluation', desc: 'Portfolio review OR standardized test OR licensed psychologist evaluation — your choice.' },
      { icon: '📁', label: 'Portfolio Required', desc: 'Keep samples of work, log of educational activities, and materials used.' },
    ],
  },
  'New York': {
    code: 'NY', difficulty: 'Strict', diffColor: '#EF4444', goalDays: '180',
    note: "New York has some of the strictest requirements. HomeschoolReady's compliance tools are essential here.",
    reqs: [
      { icon: '📋', label: 'Annual IHIP', desc: 'Submit an Individualized Home Instruction Plan to your school district by July 1st.' },
      { icon: '📅', label: '900–990 Hours', desc: 'Required minimum depending on grade level.' },
      { icon: '📚', label: '10+ Subjects', desc: 'Extensive required subject list including patriotism, civics, and fire/traffic safety.' },
      { icon: '📊', label: 'Quarterly Reports', desc: 'Submit quarterly reports AND an annual assessment to your school district.' },
    ],
  },
  'Pennsylvania': {
    code: 'PA', difficulty: 'Strict', diffColor: '#EF4444', goalDays: '180',
    note: "Pennsylvania is one of the strictest states — HomeschoolReady's compliance tools are built for this.",
    reqs: [
      { icon: '📋', label: 'Annual Affidavit', desc: 'File with your school district superintendent by Aug 1st each year.' },
      { icon: '📅', label: '180 Teaching Days', desc: 'With 900 hours at elementary and 990 hours at secondary level.' },
      { icon: '📚', label: 'Core Subjects', desc: 'Extensive list including English, math, science, history, geography, art, music, health, and more.' },
      { icon: '📊', label: 'Portfolio Review', desc: 'Annual evaluation by a licensed psychologist or certified teacher required.' },
    ],
  },
  'Georgia': {
    code: 'GA', difficulty: 'Moderate', diffColor: '#F59E0B', goalDays: '180',
    note: 'Georgia has clear requirements that are easy to track with HomeschoolReady.',
    reqs: [
      { icon: '📋', label: 'Declaration of Intent', desc: 'File annually with your local school superintendent by Sept 1st.' },
      { icon: '📅', label: '180 Teaching Days', desc: 'Required minimum, with 4.5 hours per day.' },
      { icon: '📚', label: 'Core Subjects', desc: 'Reading, language arts, math, social studies, and science required.' },
      { icon: '📊', label: 'Annual Testing', desc: 'Standardized test required every 3 years starting in 3rd grade.' },
    ],
  },
  'Virginia': {
    code: 'VA', difficulty: 'Moderate', diffColor: '#F59E0B', goalDays: '180',
    note: 'Virginia has clear annual requirements that HomeschoolReady tracks automatically.',
    reqs: [
      { icon: '📋', label: 'Notice of Intent', desc: 'File with your school division superintendent by Aug 15th each year.' },
      { icon: '👨‍🏫', label: 'Instructor Requirement', desc: 'Teaching parent must have a high school diploma or GED, or meet other qualifications.' },
      { icon: '📚', label: 'Core Subjects', desc: 'Curriculum must include math, science, English, and history.' },
      { icon: '📊', label: 'Annual Assessment', desc: 'Standardized test, portfolio review, or other evidence of progress required annually.' },
    ],
  },
  'Tennessee': {
    code: 'TN', difficulty: 'Easy', diffColor: '#10B981', goalDays: '180',
    note: 'Tennessee is relatively homeschool-friendly with two clear paths to choose from.',
    reqs: [
      { icon: '📋', label: 'Registration', desc: 'Register with your local school district or a church-related school.' },
      { icon: '📅', label: '180 Teaching Days', desc: 'Required minimum per school year.' },
      { icon: '📚', label: 'Core Subjects', desc: 'Reading, language arts, math, science, and social studies required.' },
      { icon: '📊', label: 'Annual Testing', desc: 'Standardized test required in grades 5, 7, and 9 under the independent option.' },
    ],
  },
  'California': {
    code: 'CA', difficulty: 'Moderate', diffColor: '#F59E0B', goalDays: '175',
    note: "California's PSA process sounds complex but HomeschoolReady walks you through it.",
    reqs: [
      { icon: '📋', label: 'Private School Affidavit', desc: 'File annually with the state between Oct 1–15. Registers your home as a private school.' },
      { icon: '📅', label: '175 Teaching Days', desc: 'Required minimum per school year.' },
      { icon: '📚', label: 'Core Subjects', desc: 'English, math, social sciences, science, fine arts, health, and PE.' },
      { icon: '👨‍🏫', label: 'Instructor Qualification', desc: "Teaching parent must be 'capable of teaching' — no formal credential required." },
    ],
  },
  'Ohio': {
    code: 'OH', difficulty: 'Moderate', diffColor: '#F59E0B', goalDays: '180',
    note: "Ohio's requirements are straightforward and easy to manage with HomeschoolReady.",
    reqs: [
      { icon: '📋', label: 'Annual Notification', desc: 'File with your school district superintendent by the first day of school each year.' },
      { icon: '📅', label: '900 Hours', desc: 'Required minimum instructional hours per year.' },
      { icon: '📚', label: 'Core Subjects', desc: 'Language arts, math, science, social studies, health, fine arts, and electives.' },
      { icon: '📊', label: 'Annual Assessment', desc: 'Standardized test OR portfolio assessed by a certified teacher.' },
    ],
  },
}

const ALL_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut',
  'Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa',
  'Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan',
  'Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada',
  'New Hampshire','New Jersey','New Mexico','New York','North Carolina',
  'North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island',
  'South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont',
  'Virginia','Washington','West Virginia','Wisconsin','Wyoming',
]

const SUPPORTED_NAMES = Object.keys(SUPPORTED_STATES)

// ── Grades ────────────────────────────────────────────────────────────────────

const GRADES = [
  'Pre-K','Kindergarten','1st','2nd','3rd','4th','5th',
  '6th','7th','8th','9th','10th','11th','12th',
]
const LEARNING_STYLES = [
  { value: 'visual',      label: '🎨 Visual' },
  { value: 'aural',       label: '👂 Aural' },
  { value: 'read_write',  label: '📝 Read / Write' },
  { value: 'kinesthetic', label: '🤲 Kinesthetic' },
]

// ── Learning Style Quiz ───────────────────────────────────────────────────────

const LS_QUIZ = [
  {
    q: 'When your child is trying to learn something new, what do they do first?',
    answers: [
      { emoji: '🎨', text: 'Look for pictures, diagrams, or videos',         style: 'visual' },
      { emoji: '👂', text: 'Ask someone to explain it out loud',              style: 'aural' },
      { emoji: '📝', text: 'Read about it or look it up in a book',           style: 'read_write' },
      { emoji: '🤲', text: 'Jump straight in and figure it out by doing',     style: 'kinesthetic' },
    ],
  },
  {
    q: "When your child tells you about something exciting, they usually…",
    answers: [
      { emoji: '🖼️', text: 'Draw it, show you a picture, or describe what it looks like', style: 'visual' },
      { emoji: '🗣️', text: 'Talk about it non-stop with great enthusiasm',                 style: 'aural' },
      { emoji: '📖', text: 'Bring you something they read or wrote about it',              style: 'read_write' },
      { emoji: '🏃', text: 'Demonstrate it or bring you the actual thing',                 style: 'kinesthetic' },
    ],
  },
  {
    q: 'During free time, your child most often…',
    answers: [
      { emoji: '📺', text: 'Watches videos, draws, or flips through picture books', style: 'visual' },
      { emoji: '🎵', text: 'Listens to music, podcasts, or chats with friends',     style: 'aural' },
      { emoji: '📚', text: 'Reads, writes stories, or plays word games',            style: 'read_write' },
      { emoji: '🧱', text: 'Builds, crafts, moves around, or explores outside',    style: 'kinesthetic' },
    ],
  },
]

const LS_STYLE_LABELS: Record<string, { label: string; emoji: string; desc: string }> = {
  visual:      { label: 'Visual Learner',      emoji: '🎨', desc: "Learns best through images, diagrams, and demonstrations. Videos, charts, and colorful visuals stick best." },
  aural:       { label: 'Aural Learner',        emoji: '👂', desc: "Learns best by listening and talking. Discussions, audiobooks, and read-alouds are highly effective." },
  read_write:  { label: 'Read/Write Learner',   emoji: '📝', desc: "Learns best through reading and writing. Note-taking, written instructions, and books work great." },
  kinesthetic: { label: 'Kinesthetic Learner',  emoji: '🤲', desc: "Learns best by doing. Hands-on projects, experiments, and real-world activities are the key." },
}

// ── Quiz Data ─────────────────────────────────────────────────────────────────

type StyleScores = Partial<Record<string, number>>

const QUIZ_QUESTIONS = [
  {
    id: 1, emoji: '📅',
    question: 'How do you picture your ideal school day?',
    tip: "There's no wrong answer — homeschool families succeed with wildly different structures, from rigid schedules to completely free-flowing days.",
    answers: [
      { id: 'a', emoji: '📋', text: 'Scheduled lessons, one subject at a time',           scores: { traditional: 2, classical: 1 } },
      { id: 'b', emoji: '🌊', text: 'A loose rhythm with room to follow interests',         scores: { charlotte_mason: 2, waldorf: 1 } },
      { id: 'c', emoji: '🌍', text: 'Theme-based projects that connect everything',         scores: { unit_studies: 2, eclectic: 1 } },
      { id: 'd', emoji: '✨', text: 'Wherever curiosity leads that day',                    scores: { unschooling: 2, montessori: 1 } },
    ],
  },
  {
    id: 2, emoji: '📚',
    question: 'When you imagine teaching, what does it look like?',
    tip: "You don't need to buy a full curriculum to start. Many successful homeschool families mix library books, online videos, hands-on projects, and real-world experiences.",
    answers: [
      { id: 'a', emoji: '📚', text: 'Textbooks and a clear, structured program',            scores: { traditional: 2, classical: 1 } },
      { id: 'b', emoji: '🎨', text: 'A mix of books, projects, and real-world experiences', scores: { eclectic: 2, unit_studies: 1 } },
      { id: 'c', emoji: '🌿', text: 'Living books, nature study, and hands-on learning',    scores: { charlotte_mason: 2, waldorf: 1 } },
      { id: 'd', emoji: '🌟', text: 'Whatever keeps them engaged that day',                  scores: { unschooling: 2, eclectic: 1 } },
    ],
  },
  {
    id: 3, emoji: '📈',
    question: 'How would you like to track your child\'s learning progress?',
    tip: "Most states don't require formal grades or standardized tests for homeschoolers. You get to define what 'progress' means for your child.",
    answers: [
      { id: 'a', emoji: '📊', text: 'Tests, grades, and clear benchmarks',                  scores: { traditional: 2, classical: 1 } },
      { id: 'b', emoji: '⚖️', text: 'A mix depending on the subject and the kid',           scores: { eclectic: 2, montessori: 1 } },
      { id: 'c', emoji: '📁', text: 'A portfolio of their work, art, and projects',          scores: { waldorf: 1, charlotte_mason: 1, montessori: 1 } },
      { id: 'd', emoji: '💬', text: "Conversations — I'll know by how they talk about it",  scores: { unschooling: 2, charlotte_mason: 1 } },
    ],
  },
]

const STYLE_RESULTS: Record<string, {
  emoji: string; name: string; tagline: string; description: string
  traits: string[]; gradient: string
  curriculum: { name: string; type: 'free' | 'paid'; desc: string; url: string }[]
}> = {
  traditional: {
    emoji: '📚', name: 'Traditional',
    tagline: '"Structure gives your family confidence and clarity."',
    description: "Traditional homeschoolers follow a structured, subject-by-subject approach with clear goals and measurable progress. It's reliable, well-documented, and pairs well with any structured curriculum.",
    traits: ['Clear expectations', 'Easy to track progress', 'Curriculum-friendly'],
    gradient: 'from-blue-600 to-indigo-700',
    curriculum: [
      { name: 'Abeka', type: 'paid', desc: 'Comprehensive K–12 faith-based curriculum with structured daily lessons and assessments.', url: 'https://abeka.com' },
      { name: 'Saxon Math', type: 'paid', desc: 'Incremental math curriculum used by thousands of homeschool families. Highly structured.', url: 'https://saxonhomeschool.com' },
      { name: 'Easy Peasy All-in-One', type: 'free', desc: 'A complete free online curriculum covering all subjects, K–8. No materials needed.', url: 'https://allinonehomeschool.com' },
    ],
  },
  charlotte_mason: {
    emoji: '🌿', name: 'Charlotte Mason',
    tagline: '"Learning happens through beauty, nature, and great books."',
    description: "Charlotte Mason homeschoolers use living books, nature journals, and narration to make learning feel alive. It's rich, unhurried, and deeply child-centered.",
    traits: ['Living books', 'Nature connection', 'Gentle pacing'],
    gradient: 'from-emerald-500 to-teal-600',
    curriculum: [
      { name: 'Ambleside Online', type: 'free', desc: 'A free Charlotte Mason curriculum with curated living books and a structured year plan.', url: 'https://amblesideonline.org' },
      { name: 'Simply Charlotte Mason', type: 'paid', desc: 'Practical CM guides, planners, and resources. Great for beginners to the method.', url: 'https://simplycharlottemason.com' },
      { name: 'Gentle + Classical', type: 'paid', desc: 'Combines Charlotte Mason with classical elements. Beautiful books and narration focus.', url: 'https://gentleandclassical.com' },
    ],
  },
  eclectic: {
    emoji: '🎨', name: 'Eclectic',
    tagline: '"You take the best from everything — and make it your own."',
    description: 'Eclectic homeschoolers mix and match methods based on what works for each child and subject. This is the most common approach among experienced homeschool families.',
    traits: ['Maximum flexibility', 'Tailored to each child', 'Adapts as kids grow'],
    gradient: 'from-purple-600 to-pink-600',
    curriculum: [
      { name: 'Build Your Library', type: 'paid', desc: 'Literature-based, secular curriculum guides you can mix with any other resources.', url: 'https://buildyourlibrary.com' },
      { name: 'Khan Academy', type: 'free', desc: 'Free, world-class math and science instruction. Perfect as a standalone or supplement.', url: 'https://khanacademy.org' },
      { name: 'Teaching Textbooks', type: 'paid', desc: 'Self-grading math curriculum. Kids often love the independence.', url: 'https://teachingtextbooks.com' },
    ],
  },
  classical: {
    emoji: '📜', name: 'Classical',
    tagline: '"Train young minds to think — not just what to think."',
    description: 'Classical education follows the Trivium — grammar, logic, and rhetoric — to develop reasoning and communication skills through the great works of Western thought.',
    traits: ['Deep reasoning skills', 'Great Books focus', 'Language-rich'],
    gradient: 'from-amber-600 to-orange-700',
    curriculum: [
      { name: 'Classical Conversations', type: 'paid', desc: 'Community-based classical education using memory work, Socratic dialogue, and essay writing.', url: 'https://classicalconversations.com' },
      { name: 'The Well-Trained Mind', type: 'paid', desc: 'The definitive guide to classical homeschooling by Susan Wise Bauer. Grades K–12.', url: 'https://welltrainedmind.com' },
      { name: 'Memoria Press', type: 'paid', desc: 'Traditional classical curriculum with Latin, logic, and great books. Clear and structured.', url: 'https://memoriapress.com' },
    ],
  },
  montessori: {
    emoji: '🧩', name: 'Montessori',
    tagline: '"Trust children to guide their own learning."',
    description: "Montessori homeschoolers create prepared environments that let children follow their natural developmental stages. It's hands-on, self-paced, and deeply respectful of the child.",
    traits: ['Child-led pacing', 'Hands-on materials', 'Intrinsic motivation'],
    gradient: 'from-rose-500 to-red-600',
    curriculum: [
      { name: 'Montessori Print Shop', type: 'paid', desc: 'Printable Montessori materials for every subject and level. Huge library.', url: 'https://montessoriprintshop.com' },
      { name: 'Khan Academy Kids', type: 'free', desc: 'Free, self-paced learning app for ages 2–8 with a Montessori-friendly approach.', url: 'https://khanacademy.org/kids' },
      { name: 'Montessori By Mom', type: 'paid', desc: 'Subscription Montessori activity kits delivered monthly for home learners.', url: 'https://montessoribymom.com' },
    ],
  },
  waldorf: {
    emoji: '🎭', name: 'Waldorf',
    tagline: '"Nurture the whole child — head, heart, and hands."',
    description: "Waldorf education emphasizes imagination, arts, and rhythmic routines that align with a child's developmental phases. It's holistic, seasonal, and beautifully creative.",
    traits: ['Arts-integrated', 'Seasonal rhythms', 'Holistic development'],
    gradient: 'from-violet-600 to-purple-700',
    curriculum: [
      { name: 'Christopherus Homeschool', type: 'paid', desc: 'Waldorf-inspired homeschool curriculum guides written by Donna Simmons. Thorough and beautiful.', url: 'https://christopherushomeschool.org' },
      { name: 'Waldorf Essentials', type: 'paid', desc: 'Practical Waldorf curriculum for homeschoolers with parent support and community.', url: 'https://waldorfessentials.com' },
      { name: 'Oak Meadow', type: 'paid', desc: 'Waldorf-inspired curriculum with accredited options. Flexible and family-friendly.', url: 'https://oakmeadow.com' },
    ],
  },
  unit_studies: {
    emoji: '🔬', name: 'Unit Studies',
    tagline: '"Dive deep into topics and make every subject connect."',
    description: 'Unit Studies homeschoolers build weeks or months around a single topic — Ancient Egypt, the ocean, the Civil War — weaving all subjects in naturally.',
    traits: ['Deep dives', 'Cross-subject connections', 'High engagement'],
    gradient: 'from-cyan-600 to-blue-600',
    curriculum: [
      { name: 'KONOS', type: 'paid', desc: 'Character-based unit study curriculum organized around virtues and integrated subjects.', url: 'https://konos.com' },
      { name: 'Five in a Row', type: 'paid', desc: 'Literature-based unit studies for PreK–8. Read a book five days in a row and explore its world.', url: 'https://fiveinarow.com' },
      { name: 'Notebooking Pages', type: 'paid', desc: 'Printable notebooking templates for any unit study topic. Huge and flexible library.', url: 'https://notebookingpages.com' },
    ],
  },
  unschooling: {
    emoji: '✨', name: 'Unschooling',
    tagline: '"Life itself is the curriculum."',
    description: "Unschoolers believe children learn best when they're free to follow their passions without a formal curriculum. It requires deep trust — and produces remarkably self-directed learners.",
    traits: ['Interest-led', 'No forced curriculum', 'Builds love of learning'],
    gradient: 'from-yellow-500 to-orange-500',
    curriculum: [
      { name: 'Khan Academy', type: 'free', desc: 'Self-paced, child-led learning across math, science, and more. Zero pressure.', url: 'https://khanacademy.org' },
      { name: 'Library + Real Life', type: 'free', desc: 'Many unschoolers find a library card, documentaries, and daily experiences are enough.', url: '#' },
      { name: 'Brave Writer', type: 'paid', desc: 'A child-led approach to writing and language arts. Celebrates each child\'s voice.', url: 'https://bravewriter.com' },
    ],
  },
}

function calculateStyle(answers: Record<number, StyleScores>): string {
  const totals: Record<string, number> = {}
  Object.values(answers).forEach(scores => {
    Object.entries(scores).forEach(([style, points]) => {
      totals[style] = (totals[style] || 0) + (points ?? 0)
    })
  })
  let topStyle = 'eclectic', topScore = 0
  Object.entries(totals).forEach(([style, score]) => {
    if (score > topScore) { topScore = score; topStyle = style }
  })
  return topStyle
}

// ── Shared sub-components ─────────────────────────────────────────────────────

const STEP_LABELS = ['Your School', 'Teaching Style', 'Curriculum', 'Your Child', 'Subjects']

const ONBOARDING_SUBJECTS = [
  { name: 'Mathematics',        emoji: '🔢', color: '#7c3aed' },
  { name: 'Reading',            emoji: '📖', color: '#0d9488' },
  { name: 'Language Arts',      emoji: '✏️', color: '#ec4899' },
  { name: 'Science',            emoji: '🔬', color: '#3b82f6' },
  { name: 'Social Studies',     emoji: '🌍', color: '#f59e0b' },
  { name: 'History',            emoji: '🏛️', color: '#ef4444' },
  { name: 'Art',                emoji: '🎨', color: '#8b5cf6' },
  { name: 'Music',              emoji: '🎵', color: '#84cc16' },
  { name: 'Physical Education', emoji: '⚽', color: '#06b6d4' },
  { name: 'Bible',              emoji: '✝️', color: '#f97316' },
]
const DEFAULT_SUBJECTS = ['Mathematics', 'Reading', 'Language Arts', 'Science', 'Social Studies']

function StepIndicator({ currentStep, onBack }: { currentStep: number; onBack?: () => void }) {
  const canGoBack = !!onBack && currentStep > 1
  return (
    <div className="flex items-center justify-center gap-2 mb-12">
      <button
        onClick={onBack}
        disabled={!canGoBack}
        aria-label="Go back"
        className="flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all flex-shrink-0"
        style={{
          borderColor: canGoBack ? '#7c3aed' : '#e5e7eb',
          color: canGoBack ? '#7c3aed' : '#d1d5db',
          background: 'transparent',
          cursor: canGoBack ? 'pointer' : 'not-allowed',
          opacity: canGoBack ? 1 : 0.4,
        }}
      >
        ←
      </button>
      <div className="flex items-start gap-0">
      {STEP_LABELS.map((label, i) => {
        const stepNum    = i + 1
        const isCompleted = stepNum < currentStep
        const isActive   = stepNum === currentStep
        return (
          <div key={i} className="flex items-start">
            <div className="flex flex-col items-center" style={{ minWidth: 64 }}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                isCompleted ? 'bg-yellow-400 border-yellow-400 text-white'
                : isActive  ? 'bg-white border-purple-600 text-purple-700 shadow-md'
                            : 'bg-transparent border-gray-300 text-gray-400'
              }`}>
                {isCompleted ? '✓' : stepNum}
              </div>
              <span
                className="text-xs mt-1.5 font-semibold text-center whitespace-nowrap leading-tight"
                style={{ color: isActive ? '#c4b5fd' : isCompleted ? '#fde68a' : 'rgba(255,255,255,0.45)' }}
              >{label}</span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div
                className={`h-0.5 rounded-full mt-4 ${stepNum < currentStep ? 'bg-yellow-400' : 'bg-gray-200'}`}
                style={{ width: 56, marginLeft: 4, marginRight: 4 }}
              />
            )}
          </div>
        )
      })}
      </div>
      {/* spacer to balance the back button */}
      <div className="w-8 flex-shrink-0" />
    </div>
  )
}

function ScoutBubble({ tip }: { tip: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 20 }}>
      <div style={{
        background: '#ede9fe',
        borderRadius: 16,
        padding: '14px 18px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        flex: 1,
        minWidth: 0,
      }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: '#1a1a2e', marginBottom: 4 }}>
          Scout says:
        </div>
        <div style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.55 }}>
          {tip}
        </div>
      </div>
      <img
        src="/Cardinal_Mascot.png"
        alt="Scout"
        style={{ width: 110, height: 110, objectFit: 'contain', flexShrink: 0, marginLeft: -24 }}
      />
    </div>
  )
}

function AnswerRow({ emoji, text, onClick }: { emoji: string; text: string; onClick: () => void }) {
  const [pressed, setPressed] = useState(false)
  return (
    <button
      onClick={() => { setPressed(true); onClick() }}
      className={`w-full flex items-center gap-4 p-5 bg-white rounded-2xl text-left transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 group ${
        pressed ? 'ring-2 ring-purple-400 bg-purple-50' : ''
      }`}
    >
      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-xl flex-shrink-0 group-hover:bg-purple-100 transition-colors">
        {emoji}
      </div>
      <span className="flex-1 font-semibold text-gray-900 text-base leading-snug">{text}</span>
      <svg className="w-5 h-5 text-gray-300 group-hover:text-purple-500 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  )
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      marginTop: 20, display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '8px 18px', borderRadius: 99,
      background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.25)',
      color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
    }}>
      ← Back
    </button>
  )
}

// ── State Picker ──────────────────────────────────────────────────────────────

type PanelState = 'detail' | 'remindme' | 'notified' | 'remindset' | 'custom'

function StatePicker({
  initialName,
  onConfirm,
  onBack,
}: {
  initialName: string
  onConfirm: (name: string, code: string, goalDays: string) => void
  onBack: () => void
}) {
  const [search, setSearch]       = useState('')
  const [picked, setPicked]       = useState(initialName)
  const [panel, setPanel]         = useState<PanelState>('detail')
  const [notifyEmail, setNotifyEmail] = useState('')
  // Custom requirements form
  const [customDays, setCustomDays]         = useState('180')
  const [customSubjects, setCustomSubjects] = useState('')
  const [customTesting, setCustomTesting]   = useState('')
  const [customNOI, setCustomNOI]           = useState(false)
  const [customPortfolio, setCustomPortfolio] = useState(false)
  const [customExtras, setCustomExtras]     = useState<string[]>([])
  const [customNewExtra, setCustomNewExtra] = useState('')
  const [noiOpen, setNoiOpen]               = useState(false)
  const [portfolioOpen, setPortfolioOpen]   = useState(false)

  const filtered      = ALL_STATES.filter(s => s.toLowerCase().includes(search.toLowerCase()))
  const isSupported   = SUPPORTED_NAMES.includes(picked)
  const isUnsupported = !!picked && !isSupported
  const stateData     = SUPPORTED_STATES[picked]

  function pick(name: string) {
    setPicked(name)
    setSearch('')
    setPanel('detail')
  }

  return (
    <div>
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">🗺️</div>
        <h1 className="text-4xl font-black mb-3" style={{ color: '#c4b5fd' }}>Where do you homeschool?</h1>
        <ScoutBubble tip="Every state has different homeschool laws — some require nothing at all, others require annual testing and portfolio reviews. Knowing your state's requirements upfront means you won't get a nasty surprise at the end of the year." />
      </div>

      <div className="flex gap-5 items-start">

        {/* LEFT — search + list */}
        <div className="w-64 flex-shrink-0">
          <div className="relative mb-2">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search your state..."
              className="w-full pl-9 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-sm text-gray-900 focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-auto" style={{ maxHeight: 340 }}>
            {filtered.map(name => (
              <button
                key={name}
                onClick={() => pick(name)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors hover:bg-purple-50 hover:text-purple-700 ${
                  picked === name ? 'bg-purple-50 text-purple-700 font-bold' : 'text-gray-700'
                }`}
              >
                <span>{name}</span>
                {SUPPORTED_NAMES.includes(name) && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex-shrink-0 ml-2">✓</span>
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            <span className="bg-green-100 text-green-700 rounded-full px-2 py-0.5 font-bold text-xs">✓</span>{' '}
            {SUPPORTED_NAMES.length} of 50 states fully supported
          </p>
        </div>

        {/* RIGHT — detail panel */}
        <div className="flex-1 min-w-0">

          {/* Empty */}
          {!picked && (
            <div className="bg-white rounded-2xl p-10 border border-gray-200 text-center">
              <div className="text-5xl mb-4">🗺️</div>
              <h3 className="text-lg font-black text-gray-900 mb-2">Select your state to see requirements</h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-4">
                We'll show you exactly what's required and set up your compliance tracking automatically.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {['Texas — Easy 🤠', 'North Carolina — Moderate', 'New York — Strict 🗽'].map(s => (
                  <span key={s} className="bg-purple-100 text-purple-700 rounded-full px-3 py-1 text-xs font-semibold">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Supported state — detail */}
          {isSupported && panel === 'detail' && stateData && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="bg-gradient-to-br from-purple-700 via-purple-600 to-pink-500 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-purple-200 mb-1">✓ Fully Supported</p>
                    <h3 className="text-2xl font-black text-white mb-1">{picked}</h3>
                    <p className="text-sm text-purple-100 italic leading-relaxed">{stateData.note}</p>
                  </div>
                  <span
                    className="text-xs font-bold px-3 py-1.5 rounded-full text-white flex-shrink-0"
                    style={{ background: stateData.diffColor }}
                  >
                    {stateData.difficulty}
                  </span>
                </div>
              </div>
              <div className="p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-purple-600 mb-3">What {picked} requires</p>
                <div className="space-y-3 mb-4">
                  {stateData.reqs.map(r => (
                    <div key={r.label} className="flex gap-3 items-start pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                      <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-base flex-shrink-0">{r.icon}</div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 mb-0.5">{r.label}</p>
                        <p className="text-xs text-gray-500 leading-relaxed">{r.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-green-50 rounded-xl p-3 flex gap-3 items-start mb-4">
                  <span className="text-lg flex-shrink-0">🤖</span>
                  <p className="text-xs text-green-800 leading-relaxed">
                    <strong>HomeschoolReady will auto-populate your compliance goals</strong> based on these requirements when you save this selection.
                  </p>
                </div>
                <button
                  onClick={() => onConfirm(picked, stateData.code, stateData.goalDays)}
                  className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all"
                >
                  Set {picked} as my state & auto-setup compliance →
                </button>
                <button
                  onClick={() => setPanel('remindme')}
                  className="w-full py-3 mt-2 border-2 border-gray-200 rounded-xl text-gray-600 font-bold text-sm hover:bg-gray-50 transition-all"
                >
                  Skip — remind me later
                </button>
              </div>
            </div>
          )}

          {/* Unsupported state */}
          {isUnsupported && panel === 'detail' && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="bg-gradient-to-br from-indigo-950 to-purple-900 p-6">
                <p className="text-xs font-bold uppercase tracking-widest text-purple-300 mb-1">Not yet available</p>
                <h3 className="text-2xl font-black text-white mb-1">{picked}</h3>
                <p className="text-sm text-purple-200 leading-relaxed">
                  We're not in {picked} yet — but it's on our roadmap. You can still use HomeschoolReady for everything else.
                </p>
              </div>
              <div className="p-5">
                {/* What you can still do */}
                <div className="bg-purple-50 rounded-xl p-4 mb-5">
                  <p className="text-sm font-bold text-gray-800 mb-3">What you can still do right now:</p>
                  {['Copilot lesson generation', 'Teaching schedule & planning', 'Student progress tracking', 'Co-teacher collaboration', 'Transcript generation'].map(f => (
                    <div key={f} className="flex gap-2 items-center text-sm text-gray-600 mb-1.5">
                      <span className="text-purple-600 font-bold">✓</span>{f}
                    </div>
                  ))}
                </div>

                {/* Notify me */}
                <div className="mb-4">
                  <p className="text-sm font-bold text-gray-800 mb-2">
                    📬 Notify me when {picked} launches
                  </p>
                  <input
                    type="email"
                    value={notifyEmail}
                    onChange={e => setNotifyEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 text-sm focus:border-purple-500 focus:outline-none mb-2"
                  />
                  <button
                    onClick={() => setPanel('notified')}
                    disabled={!notifyEmail.includes('@')}
                    className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-40 transition-all"
                  >
                    Notify me when {picked} is ready
                  </button>
                </div>

                {/* OR divider */}
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs font-bold text-gray-400">OR</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                {/* Add your own requirements */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-3">
                  <p className="text-sm font-bold text-yellow-900 mb-1">
                    📋 Add {picked}'s requirements yourself
                  </p>
                  <p className="text-xs text-yellow-800 leading-relaxed mb-3">
                    We don't have {picked}'s laws yet — but you can enter them manually and we'll track your progress. You're responsible for verifying accuracy with your state's Department of Education or{' '}
                    <a href="https://hslda.org" target="_blank" rel="noopener noreferrer" className="font-bold underline text-yellow-900 hover:text-yellow-700">HSLDA.org</a>.
                  </p>
                  <button
                    onClick={() => setPanel('custom')}
                    className="px-4 py-2 bg-yellow-400 text-yellow-900 rounded-xl font-bold text-sm hover:bg-yellow-300 transition-all"
                  >
                    Enter {picked}'s requirements →
                  </button>
                </div>

                {/* Skip */}
                <button
                  onClick={() => setPanel('remindme')}
                  className="w-full py-3 border-2 border-purple-300 text-purple-700 rounded-xl font-bold text-sm hover:bg-purple-50 transition-all"
                >
                  Skip for now — remind me later
                </button>
              </div>
            </div>
          )}

          {/* Unsupported — notified */}
          {isUnsupported && panel === 'notified' && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
              <div className="text-5xl mb-4">📬</div>
              <h3 className="text-2xl font-black text-gray-900 mb-3">You're on the list!</h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                We'll email you the moment <strong>{picked}</strong> compliance launches.
                Everything else in HomeschoolReady is ready to go now.
              </p>
              <button
                onClick={() => onConfirm(picked, 'OTHER', '180')}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all"
              >
                Continue to next step →
              </button>
            </div>
          )}

          {/* Custom requirements form */}
          {panel === 'custom' && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              {/* Header */}
              <div className="bg-gradient-to-br from-amber-700 to-orange-500 p-6">
                <p className="text-xs font-bold uppercase tracking-widest text-orange-200 mb-1">Custom Setup</p>
                <h3 className="text-2xl font-black text-white mb-2">{picked} — Enter Requirements</h3>
                <p className="text-xs text-orange-100 leading-relaxed">
                  HomeschoolReady is not a legal advisor. Verify all requirements at{' '}
                  <a href="https://hslda.org" target="_blank" rel="noopener noreferrer" className="font-bold underline text-yellow-300 hover:text-yellow-200">HSLDA.org</a>{' '}
                  or your state's Dept of Education before relying on them.
                </p>
              </div>

              <div className="p-5 space-y-5">
                {/* Teaching days */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-sm font-bold text-gray-800">📅 Required teaching days per year</label>
                    <span className="text-xs font-bold px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full border border-yellow-300">💡 Recommended</span>
                  </div>
                  <input
                    type="number"
                    value={customDays}
                    onChange={e => setCustomDays(e.target.value)}
                    placeholder="e.g. 180"
                    className="w-full px-4 py-3 bg-purple-50 border-2 border-gray-200 rounded-xl text-gray-900 text-sm focus:border-purple-500 focus:outline-none"
                  />
                  {!customDays && (
                    <p className="text-xs text-yellow-700 mt-1">⚡ Teaching days drives your attendance tracking — strongly recommended.</p>
                  )}
                </div>

                {/* Required subjects */}
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    📚 Required subjects <span className="font-normal text-gray-400">(comma separated)</span>
                  </label>
                  <input
                    type="text"
                    value={customSubjects}
                    onChange={e => setCustomSubjects(e.target.value)}
                    placeholder="e.g. Math, English, Science, History"
                    className="w-full px-4 py-3 bg-purple-50 border-2 border-gray-200 rounded-xl text-gray-900 text-sm focus:border-purple-500 focus:outline-none"
                  />
                </div>

                {/* Assessment */}
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    📊 Assessment or testing requirement
                  </label>
                  <input
                    type="text"
                    value={customTesting}
                    onChange={e => setCustomTesting(e.target.value)}
                    placeholder="e.g. Annual standardized test in grades 3, 5, 8"
                    className="w-full px-4 py-3 bg-purple-50 border-2 border-gray-200 rounded-xl text-gray-900 text-sm focus:border-purple-500 focus:outline-none"
                  />
                </div>

                {/* NOI + Portfolio toggles */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <button
                      onClick={() => setCustomNOI(!customNOI)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                        customNOI ? 'border-purple-500 bg-purple-50' : 'border-gray-200 bg-gray-50 hover:border-purple-300'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                        customNOI ? 'bg-purple-600 border-purple-600' : 'bg-white border-gray-300'
                      }`}>
                        {customNOI && <span className="text-white text-xs font-black">✓</span>}
                      </div>
                      <span className={`text-sm font-bold ${customNOI ? 'text-purple-700' : 'text-gray-700'}`}>
                        📋 Notice of Intent required
                      </span>
                    </button>
                    <button
                      onClick={() => setNoiOpen(!noiOpen)}
                      className="text-xs text-purple-600 hover:text-purple-800 font-semibold mt-1 ml-1"
                    >
                      {noiOpen ? '▲ Hide' : '▼ What is this?'}
                    </button>
                    {noiOpen && (
                      <div className="mt-2 bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 leading-relaxed">
                        A Notice of Intent (NOI) is a formal letter you send to your local school district or state education office to notify them you're homeschooling. Some states require this annually — others don't require it at all. Think of it as officially registering your homeschool each year.
                      </div>
                    )}
                  </div>

                  <div>
                    <button
                      onClick={() => setCustomPortfolio(!customPortfolio)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                        customPortfolio ? 'border-purple-500 bg-purple-50' : 'border-gray-200 bg-gray-50 hover:border-purple-300'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                        customPortfolio ? 'bg-purple-600 border-purple-600' : 'bg-white border-gray-300'
                      }`}>
                        {customPortfolio && <span className="text-white text-xs font-black">✓</span>}
                      </div>
                      <span className={`text-sm font-bold ${customPortfolio ? 'text-purple-700' : 'text-gray-700'}`}>
                        📁 Portfolio required
                      </span>
                    </button>
                    <button
                      onClick={() => setPortfolioOpen(!portfolioOpen)}
                      className="text-xs text-purple-600 hover:text-purple-800 font-semibold mt-1 ml-1"
                    >
                      {portfolioOpen ? '▲ Hide' : '▼ What is this?'}
                    </button>
                    {portfolioOpen && (
                      <div className="mt-2 bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 leading-relaxed">
                        A homeschool portfolio is a collection of your child's work throughout the year — writing samples, art, math worksheets, project photos, and reading logs. Some states require you to submit it for review by a certified teacher or school official to show educational progress.
                      </div>
                    )}
                  </div>
                </div>

                {/* Freeform extras */}
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    + Any other requirements? <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={customNewExtra}
                      onChange={e => setCustomNewExtra(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && customNewExtra.trim()) {
                          setCustomExtras(prev => [...prev, customNewExtra.trim()])
                          setCustomNewExtra('')
                        }
                      }}
                      placeholder="e.g. Annual immunization records submission"
                      className="flex-1 px-4 py-3 bg-purple-50 border-2 border-gray-200 rounded-xl text-gray-900 text-sm focus:border-purple-500 focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        if (customNewExtra.trim()) {
                          setCustomExtras(prev => [...prev, customNewExtra.trim()])
                          setCustomNewExtra('')
                        }
                      }}
                      className="w-12 h-12 bg-purple-600 text-white rounded-xl font-black text-xl hover:bg-purple-700 transition-colors flex items-center justify-center flex-shrink-0"
                    >
                      +
                    </button>
                  </div>
                  {customExtras.map((ex, i) => (
                    <div key={i} className="flex items-center justify-between bg-purple-50 rounded-xl px-3 py-2 mb-1.5">
                      <span className="text-sm text-purple-700">📌 {ex}</span>
                      <button
                        onClick={() => setCustomExtras(prev => prev.filter((_, j) => j !== i))}
                        className="text-pink-500 font-black text-base hover:text-pink-700 ml-2"
                      >✕</button>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => onConfirm(picked, 'OTHER', customDays || '180')}
                    disabled={!customDays}
                    className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-2xl font-bold text-sm hover:opacity-90 disabled:opacity-40 transition-all"
                  >
                    Save & start tracking {picked} →
                  </button>
                  <button
                    onClick={() => setPanel('detail')}
                    className="px-6 py-4 border-2 border-purple-300 text-purple-700 rounded-2xl font-bold text-sm hover:bg-purple-50 transition-all"
                  >
                    ← Back
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Remind me later — confirmation */}
          {panel === 'remindme' && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
              <div className="text-5xl mb-4">👍</div>
              <h3 className="text-2xl font-black text-gray-900 mb-3">All set — we'll remind you</h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-5">
                You'll see a nudge on your dashboard to finish setting up{' '}
                <strong>{picked || 'your state'}</strong> compliance.
              </p>
              <div className="bg-purple-50 rounded-xl p-4 mb-5 text-sm text-purple-700 leading-relaxed">
                💡 You can set this up anytime from{' '}
                <strong>Dashboard → Complete your setup</strong> or{' '}
                <strong>Settings → School → Compliance</strong>
              </div>
              <button
                onClick={() => onConfirm(picked, 'OTHER', '180')}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all mb-2"
              >
                Continue to next step →
              </button>
              <button
                onClick={() => setPanel('detail')}
                className="w-full py-3 border-2 border-gray-200 rounded-xl text-gray-600 font-bold text-sm hover:bg-gray-50 transition-all"
              >
                ← Actually, let me set it up now
              </button>
            </div>
          )}
        </div>
      </div>

      <BackButton onClick={onBack} />
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function OnboardingInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isPreview = searchParams.get('preview') === 'true'
  const [user, setUser]             = useState<any>(null)
  const [step, setStep]             = useState(0)
  const [saving, setSaving]         = useState(false)
  const [ageConfirmed, setAgeConfirmed]   = useState(false)
  const [tosConfirmed, setTosConfirmed]   = useState(false)
  const [agreementSaving, setAgreementSaving] = useState(false)

  // Step 1 has three sub-steps: school name → state picker → school year
  const [step1Sub, setStep1Sub] = useState<'name' | 'state' | 'school_year'>('name')

  // Step 1 data
  const [schoolName, setSchoolName]               = useState('')
  const [selectedState, setSelectedState]         = useState('')       // code e.g. 'NC'
  const [selectedStateName, setSelectedStateName] = useState('')       // full name
  const [schoolYearStart, setSchoolYearStart]     = useState('2025-08-01')
  const [schoolYearEnd,   setSchoolYearEnd]       = useState('2026-05-31')
  const [annualGoal, setAnnualGoal]               = useState('180')

  // Step 2 data
  const [quizQuestion, setQuizQuestion]     = useState(1)
  const [quizAnswers, setQuizAnswers]       = useState<Record<number, StyleScores>>({})
  const [teachingStyle, setTeachingStyle]   = useState('')
  const [showStyleBrowser, setShowStyleBrowser] = useState(false)

  // Step 3 — Curriculum
  const [curriculumSub, setCurriculumSub]   = useState<'choice' | 'has_one' | 'suggestions'>('choice')
  const [curriculumName, setCurriculumName] = useState('')
  const [curriculumLabel, setCurriculumLabel] = useState('Exploring options') // what shows in summary

  // Step 4 — First child
  const [firstName, setFirstName] = useState('')
  const [nickname, setNickname]   = useState('')
  const [age, setAge]             = useState('')
  const [grade, setGrade]         = useState('')
  const [learningStyles, setLearningStyles] = useState<string[]>([])
  const [currentHook, setCurrentHook]       = useState('')

  // Learning style quiz
  const [showLsQuiz, setShowLsQuiz]         = useState(false)
  const [lsQuizStep, setLsQuizStep]         = useState(0)
  const [lsQuizScores, setLsQuizScores]     = useState<Record<string, number>>({})

  const toggleStyle = (value: string) => {
    setLearningStyles(prev =>
      prev.includes(value) ? prev.filter(s => s !== value) : [...prev, value]
    )
  }
  const [kidId, setKidId]         = useState<string | null>(null)

  // Step 5 — Subjects
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(DEFAULT_SUBJECTS)
  const [schoolDaysPerWeek, setSchoolDaysPerWeek] = useState<number | null>(5)
  const [customSubjectInput, setCustomSubjectInput] = useState('')
  const [subjectsSaving, setSubjectsSaving] = useState(false)

  const toggleOnboardingSubject = (name: string) => {
    setSelectedSubjects(prev =>
      prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]
    )
  }

  // ── Browser back button interception ─────────────────────────────────────
  const navRef = useRef({ step, step1Sub, quizQuestion, curriculumSub })

  useEffect(() => {
    navRef.current = { step, step1Sub, quizQuestion, curriculumSub }
    window.history.pushState({ onboarding: true }, '')
  }, [step, step1Sub, quizQuestion, curriculumSub])

  const goBack = () => {
    const nav = navRef.current
    if (nav.step === 1) {
      if (nav.step1Sub === 'state') setStep1Sub('name')
      else if (nav.step1Sub === 'school_year') setStep1Sub('state')
    } else if (nav.step === 2) {
      if (nav.quizQuestion === 1) { setStep(1); setStep1Sub('school_year') }
      else setQuizQuestion(nav.quizQuestion - 1)
    } else if (nav.step === 3) {
      if (nav.curriculumSub !== 'choice') setCurriculumSub('choice')
      else { setStep(2); setQuizQuestion(4) }
    } else if (nav.step === 4) {
      setStep(3)
    } else if (nav.step === 5) {
      setStep(4)
    }
  }

  useEffect(() => {
    window.addEventListener('popstate', goBack)
    return () => window.removeEventListener('popstate', goBack)
  }, [])

  const saveSubjects = async () => {
    if (!orgId || !kidId || selectedSubjects.length === 0) { setStep(6); return }
    setSubjectsSaving(true)
    const allSubjectData = ONBOARDING_SUBJECTS.reduce(
      (acc, s) => { acc[s.name] = s; return acc },
      {} as Record<string, { emoji: string; color: string }>
    )
    const rows = selectedSubjects.map(name => ({
      organization_id: orgId,
      kid_id: kidId,
      name,
      weekly_frequency: schoolDaysPerWeek,
      color: allSubjectData[name]?.color || '#7c3aed',
      emoji: allSubjectData[name]?.emoji || '📚',
    }))
    await supabase.from('subjects').insert(rows)
    setSubjectsSaving(false)
    setStep(6)
  }

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      // ── 1. Agreement gate — must agree before onboarding ──────────────────
      const { data: agreement } = await supabase
        .from('user_agreements')
        .select('age_confirmed, tos_confirmed')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!agreement || !agreement.age_confirmed || !agreement.tos_confirmed) {
        router.replace('/agree')
        return
      }

      // ── 2. Already completed onboarding → dashboard ────────────────────────
      const { data: profile } = await supabase
        .from('user_profiles').select('onboarding_completed_at')
        .eq('user_id', user.id).maybeSingle()

      if (profile?.onboarding_completed_at && !isPreview) { router.push('/dashboard'); return }

      // ── 3. Has an existing org → treat as completed, redirect to dashboard ─
      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (userOrg?.organization_id && !isPreview) {
        const { data: kids } = await supabase
          .from('kids').select('id').eq('user_id', user.id).limit(1)

        if (kids && kids.length > 0) {
          await Promise.all([
            supabase.from('user_profiles')
              .update({ onboarding_completed_at: new Date().toISOString() })
              .eq('user_id', user.id),
            supabase.from('organizations')
              .update({ onboarding_completed: true, updated_at: new Date().toISOString() })
              .eq('user_id', user.id),
          ])
          router.push('/dashboard')
          return
        }

        // Org exists but no kids yet — still in onboarding, rehydrate orgId
        setOrgId(userOrg.organization_id)
      }

      // ── 4. Proceed with onboarding ─────────────────────────────────────────
      setUser(user)
      setStep(1)
            }
            getUser()
          }, [])

  const [orgId, setOrgId] = useState<string | null>(null)

  const completeOnboarding = async (destination = '/dashboard') => {
    if (!user) return
    if (isPreview) { router.push('/dashboard'); return }
    // Auto-set home layout based on teaching style chosen during onboarding
    const structuredStyles = ['traditional', 'classical', 'charlotte_mason']
    const homeStyle: 'structured' | 'flexible' = structuredStyles.includes(teachingStyle) ? 'structured' : 'flexible'
    const pins = homeStyle === 'structured' ? DEFAULT_STRUCTURED : DEFAULT_FLEXIBLE

    await Promise.all([
      supabase.from('user_profiles')
        .upsert({
          user_id: user.id,
          onboarding_completed_at: new Date().toISOString(),
          homeschool_style: homeStyle,
          pinned_features: pins,
        }, { onConflict: 'user_id' }),
      supabase.from('organizations')
        .update({ onboarding_completed: true, updated_at: new Date().toISOString() })
        .eq('user_id', user.id),
    ])

    // Dashboard detects new users via welcome_shown_at being null in DB — no localStorage needed

    router.push(destination)
  }

  // ── State confirmed → save + advance to step 2 ────────────────────────────
  const handleStateConfirmed = async (stateName: string, stateCode: string, goalDays: string) => {
    if (saving) return
    setSaving(true)
  
    let resolvedOrgId = orgId
  
    // Create org if it doesn't exist yet
    if (!resolvedOrgId) {
      if (isPreview) {
        // In preview mode, reuse the existing org rather than creating a new one
        const { data: existingOrg } = await supabase
          .from('organizations')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle()
        if (existingOrg) {
          resolvedOrgId = existingOrg.id
          setOrgId(resolvedOrgId)
        }
      } else {
        const { data: newOrg, error: orgError } = await supabase
          .from('organizations')
          .insert({ user_id: user.id, name: schoolName.trim() || 'My Homeschool' })
          .select('id')
          .single()

        if (orgError || !newOrg) {
          console.error('Failed to create organization:', orgError)
          setSaving(false)
          return
        }

        await supabase.from('user_organizations').insert({
          user_id: user.id,
          organization_id: newOrg.id,
          role: 'admin',
        })

        resolvedOrgId = newOrg.id
        setOrgId(resolvedOrgId)
      }
    }

    setSelectedStateName(stateName)
    setSelectedState(stateCode)
    setAnnualGoal(goalDays)

    await supabase.from('organizations').update({
      ...(schoolName.trim() ? { name: schoolName.trim() } : {}),
      state: stateCode,
      updated_at: new Date().toISOString(),
    }).eq('user_id', user.id)

    setSaving(false)
    setStep1Sub('school_year')
  }

  // ── School year confirmed → save + advance to step 2 ─────────────────────
  const handleSchoolYearConfirmed = async (startDate: string, endDate: string) => {
    if (saving || !orgId) return
    setSaving(true)
    setSchoolYearStart(startDate)
    setSchoolYearEnd(endDate)

    await supabase.from('school_year_settings').upsert({
      organization_id: orgId,
      user_id: user.id,
      state: selectedState,
      school_year_start: startDate,
      school_year_end: endDate || null,
      annual_goal_value: parseInt(annualGoal) || 180,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'organization_id' })

    setSaving(false)
    setStep(2)
    setQuizQuestion(1)
  }

  // ── Quiz answer → result card after Q3, then step 3 ─────────────────────
  const handleQuizAnswer = async (questionId: number, scores: StyleScores) => {
    const newAnswers = { ...quizAnswers, [questionId]: scores }
    setQuizAnswers(newAnswers)
    if (questionId < 3) {
      setTimeout(() => setQuizQuestion(questionId + 1), 180)
    } else {
      const style = calculateStyle(newAnswers)
      setTeachingStyle(style)
      await supabase.from('organizations')
        .update({ teaching_style: style, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
      // quizQuestion 4 = result card
      setTimeout(() => setQuizQuestion(4), 180)
    }
  }

  // ── Save first child → completion screen (step 5) ───────────────────────
  const saveChild = async () => {
    if (!firstName.trim() || saving || !orgId) return
    setSaving(true)
    const displayName = nickname.trim() || firstName.trim()
    const { data, error } = await supabase.from('kids').insert({
      organization_id: orgId,
      user_id: user.id,
      firstname: firstName.trim(),
      lastname: '',
      displayname: displayName,
      age: age ? parseInt(age) : null,
      grade: grade || null,
      learning_style: learningStyles.length > 0 ? learningStyles.join(', ') : null, // ← NEW
      current_hook: currentHook.trim() || null, // ← NEW
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).select().single()
    if (!error && data) setKidId(data.id)
    setSaving(false)
    setStep(5)
  }

  if (!user) return null

  // ── Step 0 — Agreements (full-page, no nav/progress bar) ──────────────────
  if (step === 0) {
    const canProceed = ageConfirmed && tosConfirmed

    const handleAgree = async () => {
      if (!canProceed || agreementSaving) return
      setAgreementSaving(true)
      await supabase.from('user_agreements').upsert({
        user_id: user.id,
        age_confirmed: true,
        tos_confirmed: true,
        agreed_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      setAgreementSaving(false)
      setStep(1)
    }

    return (
      <div style={{ minHeight: '100vh', background: '#3d3a52', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontFamily: "'Nunito', sans-serif", position: 'relative' }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');`}</style>
        <div style={{ background: '#fff', borderRadius: 28, boxShadow: '0 24px 64px rgba(124,58,237,0.12)', padding: '48px 40px', maxWidth: 520, width: '100%' }}>

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏡</div>
            <div style={{ marginBottom: 6 }}>
              <span style={{ fontWeight: 900, fontSize: 22, color: '#4f46e5' }}>Homeschool</span>
              <span style={{ fontWeight: 900, fontSize: 22, color: '#a855f7' }}>Ready</span>
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1e1b4b', margin: '0 0 8px' }}>
              Before we get started
            </h1>
            <p style={{ fontSize: 14, color: '#6b7280', margin: 0, lineHeight: 1.6 }}>
              Please confirm the following to continue.
            </p>
          </div>

          {/* Checkboxes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 32 }}>

            {/* Age confirmation */}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 14, cursor: 'pointer', background: ageConfirmed ? '#f5f3ff' : '#f9fafb', border: `2px solid ${ageConfirmed ? '#7c3aed' : '#e5e7eb'}`, borderRadius: 14, padding: '16px 18px', transition: 'all 0.15s' }}>
              <div
                onClick={() => setAgeConfirmed(!ageConfirmed)}
                style={{
                  width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1,
                  background: ageConfirmed ? '#7c3aed' : '#fff',
                  border: `2px solid ${ageConfirmed ? '#7c3aed' : '#d1d5db'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, color: '#fff', fontWeight: 800, cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {ageConfirmed ? '✓' : ''}
              </div>
              <div onClick={() => setAgeConfirmed(!ageConfirmed)} style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 3 }}>
                  I am 18 years of age or older
                </div>
                <div style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.5 }}>
                  HomeschoolReady is intended for adults managing a child's education. You must be at least 18 to create an account.
                </div>
              </div>
            </label>

            {/* ToS confirmation */}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 14, cursor: 'pointer', background: tosConfirmed ? '#f5f3ff' : '#f9fafb', border: `2px solid ${tosConfirmed ? '#7c3aed' : '#e5e7eb'}`, borderRadius: 14, padding: '16px 18px', transition: 'all 0.15s' }}>
              <div
                onClick={() => setTosConfirmed(!tosConfirmed)}
                style={{
                  width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1,
                  background: tosConfirmed ? '#7c3aed' : '#fff',
                  border: `2px solid ${tosConfirmed ? '#7c3aed' : '#d1d5db'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, color: '#fff', fontWeight: 800, cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {tosConfirmed ? '✓' : ''}
              </div>
              <div onClick={() => setTosConfirmed(!tosConfirmed)} style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 3 }}>
                  I agree to the Terms of Service & Privacy Policy
                </div>
                <div style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.5 }}>
                  By continuing, you agree to our{' '}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: '#7c3aed', fontWeight: 700, textDecoration: 'none' }} onClick={e => e.stopPropagation()}>
                    Terms of Service
                  </a>{' '}and{' '}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#7c3aed', fontWeight: 700, textDecoration: 'none' }} onClick={e => e.stopPropagation()}>
                    Privacy Policy
                  </a>.
                </div>
              </div>
            </label>
          </div>

          {/* CTA */}
          <button
            onClick={handleAgree}
            disabled={!canProceed || agreementSaving}
            style={{
              width: '100%', padding: '15px 0', borderRadius: 14, border: 'none',
              background: canProceed ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : '#e5e7eb',
              color: canProceed ? '#fff' : '#9ca3af',
              fontSize: 15, fontWeight: 800, cursor: canProceed ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s', fontFamily: "'Nunito', sans-serif",
              boxShadow: canProceed ? '0 4px 20px rgba(124,58,237,0.3)' : 'none',
            }}
          >
            {agreementSaving ? 'Just a moment…' : 'Get Started →'}
          </button>

          <p style={{ textAlign: 'center', fontSize: 11, color: '#d1d5db', marginTop: 20, lineHeight: 1.5 }}>
            Your agreement is recorded with a timestamp for your protection. We never sell or share your personal data.
          </p>
        </div>
      </div>
    )
  }

  const isStatePicker = step === 1 && step1Sub === 'state'

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#3d3a52', position: 'relative' }}>

      {/* Teaching Style Browser Modal */}
      {showStyleBrowser && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-60 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl my-8">
            {/* Header */}
            <div className="sticky top-0 bg-white rounded-t-3xl border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg font-black text-gray-900">Teaching Style Guide</h2>
                <p className="text-xs text-gray-400">Pick one that feels like you, or retake the quiz</p>
              </div>
              <button
                onClick={() => setShowStyleBrowser(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Style cards */}
            <div className="p-5 space-y-3">
              {Object.entries(STYLE_RESULTS).map(([key, style]) => {
                const isCurrent = key === teachingStyle
                return (
                  <div
                    key={key}
                    className={`rounded-2xl border-2 overflow-hidden transition-all ${
                      isCurrent ? 'border-purple-500 shadow-md' : 'border-gray-100 hover:border-purple-200'
                    }`}
                  >
                    {/* Style header strip */}
                    <div className={`bg-gradient-to-r ${style.gradient} px-4 py-3 flex items-center gap-3`}>
                      <span className="text-2xl">{style.emoji}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-white text-base">{style.name}</span>
                          {isCurrent && (
                            <span className="text-xs font-bold px-2 py-0.5 bg-white bg-opacity-30 text-white rounded-full">
                              Your result
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-white opacity-80 italic leading-tight">{style.tagline}</p>
                      </div>
                    </div>

                    {/* Style body */}
                    <div className="px-4 py-3 bg-white">
                      <p className="text-sm text-gray-500 leading-relaxed mb-3">{style.description}</p>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {style.traits.map(t => (
                          <span key={t} className="text-xs px-3 py-1 bg-purple-50 text-purple-700 rounded-full font-semibold">✓ {t}</span>
                        ))}
                      </div>
                      {!isCurrent && (
                        <button
                          onClick={async () => {
                            setTeachingStyle(key)
                            await supabase.from('organizations')
                              .update({ teaching_style: key, updated_at: new Date().toISOString() })
                              .eq('user_id', user.id)
                            setShowStyleBrowser(false)
                          }}
                          className={`px-4 py-2 bg-gradient-to-r ${style.gradient} text-white rounded-xl font-bold text-xs hover:opacity-90 transition-all`}
                        >
                          Switch to {style.name}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white rounded-b-3xl border-t border-gray-100 px-6 py-4 flex gap-3">
              <button
                onClick={() => { setShowStyleBrowser(false); setQuizAnswers({}); setQuizQuestion(1) }}
                className="flex-1 py-3 border-2 border-purple-300 text-purple-700 rounded-2xl font-bold text-sm hover:bg-purple-50 transition-all"
              >
                Retake the quiz instead
              </button>
              <button
                onClick={() => setShowStyleBrowser(false)}
                className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold text-sm hover:opacity-90 transition-all"
              >
                Keep {STYLE_RESULTS[teachingStyle]?.name || 'my style'}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <span className="font-black text-xl text-indigo-700 tracking-tight">Homeschool</span>
            <span className="font-black text-xl text-purple-500 tracking-tight">Ready</span>
          </div>
        </div>
      </div>

      {/* Main content — wider container on state picker */}
      <div className={`mx-auto px-6 py-10 ${isStatePicker ? 'max-w-4xl' : 'max-w-2xl'}`}>
        <StepIndicator currentStep={step} onBack={step > 1 ? goBack : undefined} />

        {/* ══════════════════════════════════════════════════════
            STEP 1a — School Name
        ══════════════════════════════════════════════════════ */}
        {step === 1 && step1Sub === 'name' && (
          <div>
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🏠</div>
              <h1 className="text-4xl font-black mb-3" style={{ color: '#c4b5fd' }}>Let's set up your school</h1>
              <p className="text-lg" style={{ color: 'rgba(255,255,255,0.75)' }}>Every great homeschool starts with a home base.</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  What would you like to call your homeschool?
                </label>
                <ScoutBubble tip="Many families give their school a name — like 'The Johnson Academy' or 'Sunrise Learning Co.' It appears on compliance reports and transcripts, and gives your kids something to be proud of." />
                <input
                  type="text"
                  value={schoolName}
                  onChange={e => setSchoolName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && schoolName.trim() && setStep1Sub('state')}
                  placeholder="e.g. The Johnson Academy, Sunrise Learning Co..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-purple-500 focus:outline-none text-base"
                  autoFocus
                />
                <p className="text-xs text-gray-400 mt-1.5">You can always change this in Settings</p>
              </div>
              <button
                onClick={() => setStep1Sub('state')}
                disabled={!schoolName.trim()}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold text-base hover:opacity-90 disabled:opacity-40 transition-all"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            STEP 1b — State Picker
        ══════════════════════════════════════════════════════ */}
        {step === 1 && step1Sub === 'state' && (
          <StatePicker
            initialName={selectedStateName}
            onConfirm={handleStateConfirmed}
            onBack={() => setStep1Sub('name')}
          />
        )}

        {/* ══════════════════════════════════════════════════════
            STEP 1c — School Year
        ══════════════════════════════════════════════════════ */}
        {step === 1 && step1Sub === 'school_year' && (
          <div>
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">📅</div>
              <h1 className="text-4xl font-black mb-3" style={{ color: '#c4b5fd' }}>When does your school year run?</h1>
              <p className="text-lg" style={{ color: 'rgba(255,255,255,0.75)' }}>This helps us track attendance, compliance, and progress.</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">School year start</label>
                <input
                  type="date"
                  value={schoolYearStart}
                  onChange={e => setSchoolYearStart(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-purple-500 focus:outline-none text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">School year end <span className="text-gray-400 font-normal">(optional)</span></label>
                <input
                  type="date"
                  value={schoolYearEnd}
                  onChange={e => setSchoolYearEnd(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-purple-500 focus:outline-none text-base"
                />
              </div>
              <p className="text-xs text-gray-400">You can always update these dates in Profile → School Setup.</p>
              <button
                onClick={() => handleSchoolYearConfirmed(schoolYearStart, schoolYearEnd)}
                disabled={!schoolYearStart || saving}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold text-base hover:opacity-90 disabled:opacity-40 transition-all"
              >
                {saving ? 'Saving…' : 'Continue →'}
              </button>
            </div>
            <BackButton onClick={() => setStep1Sub('state')} />
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            STEP 2 — Teaching Style Quiz
        ══════════════════════════════════════════════════════ */}
        {step === 2 && quizQuestion <= 3 && (() => {
          const q = QUIZ_QUESTIONS[quizQuestion - 1]
          return (
            <div>
              <div className="mb-8">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-6" style={{ background: 'rgba(255,255,255,0.15)', color: '#c4b5fd', border: '1.5px solid rgba(196,181,253,0.4)' }}>
                  {q.emoji} QUESTION {quizQuestion} OF 3
                </span>
                <h1 className="text-4xl font-black mb-2 leading-tight" style={{ color: '#c4b5fd' }}>{q.question}</h1>
                <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.65)' }}>Your answers help Scout generate personalized lessons and activities for your family.</p>
                <ScoutBubble tip={q.tip} />
              </div>
              <div className="space-y-3">
                {q.answers.map(answer => (
                  <AnswerRow
                    key={answer.id}
                    emoji={answer.emoji}
                    text={answer.text}
                    onClick={() => handleQuizAnswer(quizQuestion, answer.scores)}
                  />
                ))}
              </div>
              <BackButton onClick={() => {
                if (quizQuestion === 1) { setStep(1); setStep1Sub('school_year') }
                else setQuizQuestion(quizQuestion - 1)
              }} />
            </div>
          )
        })()}

        {/* ══════════════════════════════════════════════════════
            STEP 2 — Teaching Style Result Card
        ══════════════════════════════════════════════════════ */}
        {step === 2 && quizQuestion === 4 && (() => {
          const result = STYLE_RESULTS[teachingStyle] || STYLE_RESULTS['eclectic']
          return (
            <div>
              {/* Result card */}
              <div className="bg-white rounded-3xl overflow-hidden shadow-lg border border-gray-100">
                <div className={`bg-gradient-to-br ${result.gradient} p-10 text-center`}>
                  <div className="text-5xl mb-4">{result.emoji}</div>
                  <p className="text-xs font-bold uppercase tracking-widest text-white opacity-70 mb-2">
                    {schoolName ? `${schoolName} · ` : ''}Your Teaching Style
                  </p>
                  <h1 className="text-5xl font-black text-white mb-3" style={{ fontFamily: 'Georgia, serif' }}>
                    {result.name}
                  </h1>
                  <p className="text-lg text-white opacity-90 italic leading-relaxed">{result.tagline}</p>
                </div>

                <div className="p-8">
                  <p className="text-gray-600 text-base leading-relaxed mb-5">{result.description}</p>
                  <div className="flex flex-wrap gap-2 mb-8">
                    {result.traits.map(trait => (
                      <span key={trait} className="px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
                        ✓ {trait}
                      </span>
                    ))}
                  </div>

                  {/* Curriculum suggestions */}
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-gray-800 mb-2">
                      If you don't have a curriculum, here are some suggestions that align with your school's teaching style.
                    </p>
                    <div className="flex items-start gap-2 p-3 bg-purple-50 rounded-xl border border-purple-100">
                      <svg className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-xs text-purple-700 leading-relaxed">
                        These choices shown are places where you can obtain curriculum that aligns with your school's teaching style. Note: HomeschoolReady does not provide curriculum.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 mb-8">
                    {result.curriculum.map(c => (
                      <a
                        key={c.name}
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-3 p-4 rounded-2xl border-2 border-gray-100 hover:border-purple-200 hover:bg-purple-50 transition-all group"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-bold text-gray-900 text-sm">{c.name}</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              c.type === 'free' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'
                            }`}>
                              {c.type === 'free' ? '✓ Free' : 'Paid'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 leading-relaxed">{c.desc}</p>
                        </div>
                        <svg className="w-4 h-4 text-gray-300 group-hover:text-purple-500 flex-shrink-0 mt-1 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    ))}
                    <p className="text-xs text-gray-400 pt-1">💡 More resources available in the <strong>Resources</strong> section after setup.</p>
                  </div>

                  {/* Actions */}
                  <button
                    onClick={() => setStep(3)}
                    className="w-full py-4 text-white rounded-2xl font-bold text-base hover:opacity-90 transition-all"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
                  >
                    Continue →
                  </button>
                  <button
                    onClick={() => setShowStyleBrowser(true)}
                    className="w-full py-3 border-2 border-purple-200 text-purple-600 rounded-2xl font-semibold text-sm hover:bg-purple-50 transition-all mt-3"
                  >
                    Explore other teaching styles
                  </button>
                </div>
              </div>
            </div>
          )
        })()}

        {/* ══════════════════════════════════════════════════════
            STEP 4 — Your Child
        ══════════════════════════════════════════════════════ */}
      {step === 4 && (
  <div>
    <div className="text-center mb-8">
      <div className="text-6xl mb-4">🧒</div>
      <h1 className="text-4xl font-black mb-3 leading-tight" style={{ color: '#c4b5fd' }}>
        Now let's add your first student
      </h1>
      <p className="text-lg" style={{ color: 'rgba(255,255,255,0.75)' }}>
        This is the heart of it all. You can add more kids after setup.
      </p>
    </div>

    <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">

      {/* Name */}
      <div>
        <label className="block text-sm font-bold text-gray-800 mb-2">
          Child's first name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={firstName}
          onChange={e => setFirstName(e.target.value)}
          placeholder="e.g. Emma"
          autoFocus
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-purple-500 focus:outline-none"
        />
      </div>

      {/* Nickname */}
      <div>
        <label className="block text-sm font-bold text-gray-800 mb-1">
          Nickname{' '}
          <span className="font-normal text-gray-400">
            (optional) — how you'd like to see them in the app
          </span>
        </label>
        <input
          type="text"
          value={nickname}
          onChange={e => setNickname(e.target.value)}
          placeholder="e.g. Em, Bug, Buddy..."
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-purple-500 focus:outline-none"
        />
      </div>

      {/* Age + Grade */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-gray-800 mb-2">Age</label>
          <input
            type="number"
            value={age}
            onChange={e => setAge(e.target.value)}
            placeholder="e.g. 8"
            min="3"
            max="18"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-purple-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-800 mb-2">
            Current grade level
          </label>
          <select
            value={grade}
            onChange={e => setGrade(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-purple-500 focus:outline-none"
          >
            <option value="">Select grade...</option>
            {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>

      {/* Learning Style — multi-select */}
      <div>
        <label className="block text-sm font-bold text-gray-800 mb-1">
          How does {firstName.trim() || 'your child'} learn best?{' '}
          <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-purple-600 font-semibold mb-2">
          ✨ Select all that apply — this powers Scout lesson personalization
        </p>
        <div className="grid grid-cols-2 gap-2">
          {LEARNING_STYLES.map(style => {
            const selected = learningStyles.includes(style.value)
            return (
              <button
                key={style.value}
                type="button"
                onClick={() => toggleStyle(style.value)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-left text-sm font-semibold transition-all ${
                  selected
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-purple-300'
                }`}
              >
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                  selected ? 'bg-purple-600 border-purple-600' : 'border-gray-300'
                }`}>
                  {selected && <span className="text-white text-xs font-black">✓</span>}
                </div>
                {style.label}
              </button>
            )
          })}
        </div>
        {learningStyles.length > 1 && (
          <p className="text-xs text-purple-600 font-semibold mt-2">
            ✓ Multimodal learner — Scout will blend these styles
          </p>
        )}

        {/* Not sure? Quiz trigger */}
        {!showLsQuiz && (
          <button
            type="button"
            onClick={() => { setShowLsQuiz(true); setLsQuizStep(0); setLsQuizScores({}) }}
            className="mt-3 text-xs text-purple-600 font-semibold hover:text-purple-800 underline underline-offset-2 transition-colors"
          >
            Not sure? Take a quick quiz to find out →
          </button>
        )}

        {/* Learning style mini-quiz */}
        {showLsQuiz && lsQuizStep < LS_QUIZ.length && (
          <div className="mt-4 bg-purple-50 border-2 border-purple-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-purple-600 uppercase tracking-wide">
                Question {lsQuizStep + 1} of {LS_QUIZ.length}
              </span>
              <button
                type="button"
                onClick={() => setShowLsQuiz(false)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none font-bold"
              >×</button>
            </div>
            <p className="text-sm font-bold text-gray-800 mb-3 leading-snug">
              {LS_QUIZ[lsQuizStep].q}
            </p>
            <div className="space-y-2">
              {LS_QUIZ[lsQuizStep].answers.map(a => (
                <button
                  key={a.style}
                  type="button"
                  onClick={() => {
                    const newScores = { ...lsQuizScores, [a.style]: (lsQuizScores[a.style] || 0) + 1 }
                    setLsQuizScores(newScores)
                    if (lsQuizStep + 1 < LS_QUIZ.length) {
                      setLsQuizStep(lsQuizStep + 1)
                    } else {
                      // Quiz complete — find top style(s) and auto-select
                      const maxScore = Math.max(...Object.values(newScores))
                      const topStyles = Object.entries(newScores)
                        .filter(([, v]) => v === maxScore)
                        .map(([k]) => k)
                      topStyles.forEach(s => {
                        if (!learningStyles.includes(s)) toggleStyle(s)
                      })
                      setLsQuizStep(LS_QUIZ.length) // advance to result screen
                    }
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 bg-white rounded-xl border border-gray-200 text-left text-sm font-semibold text-gray-700 hover:border-purple-400 hover:bg-purple-50 transition-all"
                >
                  <span className="text-base">{a.emoji}</span>
                  {a.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quiz result */}
        {showLsQuiz && lsQuizStep >= LS_QUIZ.length && (() => {
          const maxScore = Math.max(...Object.values(lsQuizScores))
          const topStyles = Object.entries(lsQuizScores)
            .filter(([, v]) => v === maxScore).map(([k]) => k)
          return (
            <div className="mt-4 bg-green-50 border-2 border-green-200 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-black text-green-800 mb-1">
                    {topStyles.length > 1 ? '🌟 Multimodal Learner!' : `${LS_STYLE_LABELS[topStyles[0]]?.emoji} ${LS_STYLE_LABELS[topStyles[0]]?.label}!`}
                  </p>
                  <p className="text-xs text-green-700 leading-relaxed">
                    {topStyles.length > 1
                      ? `${firstName.trim() || 'Your child'} blends multiple styles — we've selected them all for you.`
                      : LS_STYLE_LABELS[topStyles[0]]?.desc}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setShowLsQuiz(false) }}
                  className="text-green-500 hover:text-green-700 text-lg leading-none font-bold flex-shrink-0"
                >×</button>
              </div>
              <button
                type="button"
                onClick={() => { setShowLsQuiz(false); setLsQuizStep(0); setLsQuizScores({}) }}
                className="mt-3 text-xs text-green-700 font-semibold underline underline-offset-2 hover:text-green-900"
              >
                Retake quiz
              </button>
            </div>
          )
        })()}
      </div>

      {/* Current Hook — NEW */}
      <div>
        <label className="block text-sm font-bold text-gray-800 mb-1">
          What are they into right now?{' '}
          <span className="font-normal text-gray-400">(optional)</span>
        </label>
        <p className="text-xs text-gray-400 mb-2">
          Copilot will weave their interests into lessons to make them more engaging
        </p>
        <input
          type="text"
          value={currentHook}
          onChange={e => setCurrentHook(e.target.value)}
          placeholder="e.g. Minecraft, Dinosaurs, Drawing animals, Space..."
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-purple-500 focus:outline-none"
        />
      </div>

      <ScoutBubble tip="In homeschooling, grade levels are flexible. Many families teach to their child's actual ability level rather than their age — so a 9-year-old might do 5th grade math and 3rd grade reading. You can always adjust this later." />

      <div className="flex gap-3 pt-1">
        <button
          onClick={() => setStep(3)}
          style={{ padding: '10px 20px', borderRadius: 99, background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >
          ← Back
        </button>
        <button
          onClick={saveChild}
          disabled={!firstName.trim() || learningStyles.length === 0 || saving}
          className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-40 transition-all"
        >
          {saving ? 'Saving...' : 'Complete Setup →'}
        </button>
      </div>

    </div>
  </div>
)}

        {/* ══════════════════════════════════════════════════════
            STEP 3 — Curriculum
        ══════════════════════════════════════════════════════ */}
        {step === 3 && curriculumSub === 'choice' && (
          <div>
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">📚</div>
              <h1 className="text-4xl font-black mb-3" style={{ color: '#c4b5fd' }}>Do you have a curriculum?</h1>
              <p className="text-lg" style={{ color: 'rgba(255,255,255,0.75)' }}>No pressure — many families start without one and figure it out as they go.</p>
              <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.55)' }}>This helps Scout create more relevant lessons and activities for your family.</p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => setCurriculumSub('has_one')}
                className="w-full flex items-center gap-4 p-5 bg-white rounded-2xl text-left shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-xl flex-shrink-0 group-hover:bg-purple-100 transition-colors">✅</div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-base">Yes, I already have one</p>
                  <p className="text-sm text-gray-400">Tell us what you're using</p>
                </div>
                <svg className="w-5 h-5 text-gray-300 group-hover:text-purple-500 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>

              <button
                onClick={() => setCurriculumSub('suggestions')}
                className="w-full flex items-center gap-4 p-5 bg-white rounded-2xl text-left shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-xl flex-shrink-0 group-hover:bg-purple-100 transition-colors">🔍</div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-base">Not yet — show me suggestions</p>
                  <p className="text-sm text-gray-400">Based on your {STYLE_RESULTS[teachingStyle]?.name || 'teaching'} style</p>
                </div>
                <svg className="w-5 h-5 text-gray-300 group-hover:text-purple-500 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>

              <button
                onClick={() => { setCurriculumLabel('Exploring options'); setStep(4) }}
                className="w-full flex items-center gap-4 p-5 bg-white rounded-2xl text-left shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-xl flex-shrink-0 group-hover:bg-purple-100 transition-colors">⏭️</div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-base">I'll figure it out later</p>
                  <p className="text-sm text-gray-400">You can always add this in Resources</p>
                </div>
                <svg className="w-5 h-5 text-gray-300 group-hover:text-purple-500 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
            <BackButton onClick={() => { setStep(2); setQuizQuestion(4) }} />
          </div>
        )}

        {/* Curriculum — has one, enter name */}
        {step === 3 && curriculumSub === 'has_one' && (
          <div>
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">✅</div>
              <h1 className="text-4xl font-black mb-3" style={{ color: '#c4b5fd' }}>What curriculum are you using?</h1>
              <p className="text-lg" style={{ color: 'rgba(255,255,255,0.75)' }}>We'll note it in your profile for reports and resources.</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
              <input
                type="text"
                value={curriculumName}
                onChange={e => setCurriculumName(e.target.value)}
                placeholder="e.g. Abeka, Saxon Math, Khan Academy, My own mix..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-purple-500 focus:outline-none text-base"
                autoFocus
              />
              <div className="bg-purple-50 rounded-xl p-4 text-sm text-purple-700 leading-relaxed">
                <p className="font-bold mb-1">📥 Want to bring your curriculum into HomeschoolReady?</p>
                <p className="text-xs text-purple-600">After setup you can <strong>import lessons from a PDF</strong> or <strong>create your own lesson plan</strong> from scratch — under <strong>Lessons → Add Lesson</strong>. Our Copilot Assistant can also generate lessons based on your curriculum and teaching style.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setCurriculumSub('choice')} style={{ padding: '10px 20px', borderRadius: 99, background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>← Back</button>
                <button
                  onClick={() => { setCurriculumLabel(curriculumName.trim() || 'Custom'); setStep(4) }}
                  disabled={!curriculumName.trim()}
                  className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-40 transition-all"
                >
                  Continue →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Curriculum — suggestions */}
        {step === 3 && curriculumSub === 'suggestions' && (() => {
          const result = STYLE_RESULTS[teachingStyle] || STYLE_RESULTS['eclectic']
          return (
            <div>
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">🔍</div>
                <h1 className="text-4xl font-black mb-3" style={{ color: '#c4b5fd' }}>Curriculum ideas for you</h1>
                <p className="text-lg" style={{ color: 'rgba(255,255,255,0.75)' }}>No pressure — many families start without one and figure it out as they go.</p>
              </div>

              {/* Disclaimer banner */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-3 mb-4 flex gap-2 items-start">
                <span className="text-base flex-shrink-0 mt-0.5">🔗</span>
                <p className="text-xs text-yellow-800 leading-relaxed">
                  These are <strong>external resources</strong> — "Learn more" opens the provider's website in a new tab.
                  HomeschoolReady doesn't pull in or integrate with any curriculum. You stay in full control.
                  If you already have a curriculum picked, use <strong>← Change</strong> to record it.
                </p>
              </div>

              <div className="mb-2 flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-purple-600">
                    Suggested for {result.name}
                  </p>
                  <p className="text-sm text-gray-400">Mix of free and paid — clearly labeled</p>
                </div>
                <button onClick={() => setCurriculumSub('choice')} className="text-sm text-gray-500 hover:text-gray-800 font-semibold flex-shrink-0 ml-4">← Change</button>
              </div>

              <div className="space-y-3 mb-4">
                {result.curriculum.map(c => (
                  <div key={c.name} className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-black text-gray-900 text-base">{c.name}</h3>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ml-3 ${
                        c.type === 'free' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {c.type === 'free' ? 'FREE' : 'PAID'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 leading-relaxed mb-3">{c.desc}</p>
                    <a href={c.url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-bold text-purple-600 border border-purple-300 rounded-xl px-4 py-2 hover:bg-purple-50 transition-all">
                      Visit website →
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </a>
                  </div>
                ))}
              </div>

              <div className="bg-purple-50 rounded-2xl p-4 mb-5 text-sm text-purple-700 leading-relaxed">
                💡 You don't need to decide today. These suggestions will always be available in <strong>Resources → Teaching Styles</strong>.
              </div>

              <button
                onClick={() => { setCurriculumLabel('Exploring options'); setStep(4) }}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold text-base hover:opacity-90 transition-all"
              >
                Continue →
              </button>
            </div>
          )
        })()}

        {/* ══════════════════════════════════════════════════════
            STEP 5 — Subjects
        ══════════════════════════════════════════════════════ */}
        {step === 5 && (
          <div>
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">📚</div>
              <h1 className="text-4xl font-black mb-3" style={{ color: '#c4b5fd' }}>What will you be teaching?</h1>
              <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>
                We've pre-selected the most common subjects. Tap to deselect any you won't cover, or add your own.
              </p>
            </div>

            {/* Subject chips */}
            <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
              <p className="text-xs font-bold uppercase tracking-widest text-purple-600 mb-4">Select subjects</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {ONBOARDING_SUBJECTS.map(s => {
                  const on = selectedSubjects.includes(s.name)
                  return (
                    <button
                      key={s.name}
                      onClick={() => toggleOnboardingSubject(s.name)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all border-2"
                      style={{
                        borderColor: on ? s.color : '#e5e7eb',
                        background: on ? s.color + '18' : '#f9fafb',
                        color: on ? s.color : '#6b7280',
                      }}
                    >
                      <span>{s.emoji}</span> {s.name}
                      {on && <span className="ml-1 text-xs">✓</span>}
                    </button>
                  )
                })}
              </div>

              {/* Custom subject */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customSubjectInput}
                  onChange={e => setCustomSubjectInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && customSubjectInput.trim()) {
                      setSelectedSubjects(prev => [...prev, customSubjectInput.trim()])
                      setCustomSubjectInput('')
                    }
                  }}
                  placeholder="+ Add a custom subject..."
                  className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm text-gray-900 focus:border-purple-400 focus:outline-none"
                />
                <button
                  onClick={() => {
                    if (customSubjectInput.trim()) {
                      setSelectedSubjects(prev => [...prev, customSubjectInput.trim()])
                      setCustomSubjectInput('')
                    }
                  }}
                  className="w-10 h-10 bg-purple-600 text-white rounded-xl font-black text-lg hover:bg-purple-700 transition-colors flex items-center justify-center"
                >+</button>
              </div>

              {/* Custom subjects added */}
              {selectedSubjects.filter(s => !ONBOARDING_SUBJECTS.find(o => o.name === s)).map(s => (
                <div key={s} className="flex items-center justify-between mt-2 px-3 py-2 bg-purple-50 rounded-xl">
                  <span className="text-sm font-semibold text-purple-700">📚 {s}</span>
                  <button onClick={() => toggleOnboardingSubject(s)} className="text-pink-500 font-black text-base hover:text-pink-700">✕</button>
                </div>
              ))}
            </div>

            {/* School days per week */}
            <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
              <p className="text-xs font-bold uppercase tracking-widest text-purple-600 mb-1">How many days a week do you typically school?</p>
              <p className="text-xs text-gray-400 mb-4">This sets the weekly target for all subjects — you can adjust each one individually later.</p>
              <div className="flex gap-2 flex-wrap">
                {[3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => setSchoolDaysPerWeek(schoolDaysPerWeek === n ? null : n)}
                    className="flex flex-col items-center justify-center w-14 h-14 rounded-xl border-2 font-black text-sm transition-all"
                    style={{
                      borderColor: schoolDaysPerWeek === n ? '#7c3aed' : '#e5e7eb',
                      background: schoolDaysPerWeek === n ? '#ede9fe' : '#f9fafb',
                      color: schoolDaysPerWeek === n ? '#7c3aed' : '#374151',
                    }}
                  >
                    <span className="text-base">{n}×</span>
                    <span className="text-xs font-semibold opacity-60">/wk</span>
                  </button>
                ))}
                <button
                  onClick={() => setSchoolDaysPerWeek(null)}
                  className="px-4 h-14 rounded-xl border-2 font-bold text-sm transition-all"
                  style={{
                    borderColor: schoolDaysPerWeek === null ? '#7c3aed' : '#e5e7eb',
                    background: schoolDaysPerWeek === null ? '#ede9fe' : '#f9fafb',
                    color: schoolDaysPerWeek === null ? '#7c3aed' : '#374151',
                  }}
                >Flexible</button>
              </div>
            </div>

            <button
              onClick={saveSubjects}
              disabled={subjectsSaving || selectedSubjects.length === 0}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold text-base hover:opacity-90 disabled:opacity-40 transition-all mb-3"
            >
              {subjectsSaving ? 'Saving…' : `Save ${selectedSubjects.length} subject${selectedSubjects.length !== 1 ? 's' : ''} & continue →`}
            </button>
            <button
              onClick={() => setStep(6)}
              className="w-full py-3 text-sm text-gray-400 hover:text-gray-600 font-semibold transition-colors"
            >
              Skip for now — I'll set this up in the Subjects tab
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            STEP 6 — Completion / Summary
        ══════════════════════════════════════════════════════ */}
        {step === 6 && (
          <div>
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🎉</div>
              <h1 className="text-4xl font-black mb-4 leading-tight" style={{ color: '#c4b5fd' }}>
                {schoolName ? `${schoolName} is ready!` : "You're all set!"}
              </h1>
              <p className="text-lg leading-relaxed" style={{ color: 'rgba(255,255,255,0.85)' }}>
                You've set up <strong>{schoolName || 'your school'}</strong>, discovered your{' '}
                <strong>{STYLE_RESULTS[teachingStyle]?.name || 'teaching'}</strong> teaching style,
                {' '}and added <strong>{nickname || firstName}</strong> as your first student. That's a great start.
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
              <p className="text-xs font-bold uppercase tracking-widest text-purple-600 mb-5">Your Setup Summary</p>
              <div className="space-y-4">
                {[
                  { icon: '🏡', label: 'School', value: schoolName || '—' },
                  { icon: '🎨', label: 'Teaching style', value: STYLE_RESULTS[teachingStyle]?.name || 'Not set' },
                  { icon: '🧒', label: 'First student', value: `${nickname || firstName}${grade ? ` · ${grade}` : ''}${age ? ` · Age ${age}` : ''}` },
                  { icon: '🧠', label: 'Learning style', value: learningStyles.length > 0 ? learningStyles.map(v => LEARNING_STYLES.find(s => s.value === v)?.label).join(', ') : '—' },
                  { icon: '📚', label: 'Curriculum', value: curriculumLabel },
                ].map(row => (
                  <div key={row.label} className="flex items-center gap-4 py-2 border-b border-gray-100 last:border-0">
                    <span className="text-2xl flex-shrink-0">{row.icon}</span>
                    <span className="text-sm text-gray-400 w-32 flex-shrink-0">{row.label}</span>
                    <span className="text-sm font-bold text-gray-900">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => completeOnboarding()}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-2xl font-bold text-lg hover:opacity-90 transition-all"
            >
              Go to my Dashboard →
            </button>

            {/* Add more children reminder */}
            <div className="mt-4 flex items-start gap-3 bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 text-left">
              <span className="text-xl flex-shrink-0">👨‍👩‍👧‍👦</span>
              <p className="text-sm text-purple-800 leading-relaxed">
                <strong>Have more than one child?</strong> Head to{' '}
                <strong>Profile → Children</strong> after setup to add them — each gets their own progress rings, lessons, and records.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingInner />
    </Suspense>
  )
}