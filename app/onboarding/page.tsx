'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/src/lib/supabase'
import { CANONICAL_SUBJECTS } from '@/src/constants/subjects'

const SUPPORTED_STATES = [
  { code: 'CA', name: 'California' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'NY', name: 'New York' },
  { code: 'OH', name: 'Ohio' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'TX', name: 'Texas' },
  { code: 'VA', name: 'Virginia' },
  { code: 'OTHER', name: 'Other / Not Listed' },
]

const GRADES = [
  'Pre-K', 'Kindergarten', '1st', '2nd', '3rd', '4th', '5th',
  '6th', '7th', '8th', '9th', '10th', '11th', '12th'
]

const STEP_COUNT = 3

export default function OnboardingPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [showSkipWarning, setShowSkipWarning] = useState(false)

  // Step 1 — School setup
  const [selectedState, setSelectedState] = useState('')
  const [schoolYearStart, setSchoolYearStart] = useState('2025-08-01')
  const [annualGoal, setAnnualGoal] = useState('180')

  // Step 2 — First child
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [age, setAge] = useState('')
  const [grade, setGrade] = useState('')
  const [kidId, setKidId] = useState<string | null>(null)

  // Step 3 — First lesson (manual)
  const [lessonMode, setLessonMode] = useState<'manual' | 'import' | null>(null)
  const [lessonSubject, setLessonSubject] = useState('')
  const [lessonTitle, setLessonTitle] = useState('')
  const [lessonDescription, setLessonDescription] = useState('')

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      // If already onboarded, skip to calendar
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('onboarding_completed_at')
        .eq('user_id', user.id)
        .maybeSingle()

      if (profile?.onboarding_completed_at) {
        router.push('/calendar')
        return
      }

      setUser(user)
    }
    getUser()
  }, [])

  const orgId = user?.id // organization_id = user.id for new users

  const completeOnboarding = async (destination = '/calendar') => {
    if (!user) return
    await supabase
      .from('user_profiles')
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq('user_id', user.id)
    router.push(destination)
  }

  // ── STEP 1: Save school year settings ───────────────────────────────────
  const saveStep1 = async () => {
    if (!selectedState) return
    setSaving(true)
    await supabase
      .from('school_year_settings')
      .upsert({
        organization_id: orgId,
        user_id: user.id,
        state: selectedState,
        start_date: schoolYearStart,
        annual_goal_value: parseInt(annualGoal) || 180,
        updated_at: new Date().toISOString()
      }, { onConflict: 'organization_id' })
    setSaving(false)
    setStep(2)
  }

  // ── STEP 2: Save first child ─────────────────────────────────────────────
  const saveStep2 = async () => {
    if (!firstName.trim()) return
    setSaving(true)
    const { data, error } = await supabase
      .from('kids')
      .insert({
        organization_id: orgId,
        user_id: user.id,
        firstname: firstName.trim(),
        lastname: lastName.trim(),
        displayname: firstName.trim(),
        age: age ? parseInt(age) : null,
        grade: grade || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (!error && data) setKidId(data.id)
    setSaving(false)
    setStep(3)
  }

  // ── STEP 3: Save manual lesson ───────────────────────────────────────────
  const saveStep3Manual = async () => {
    if (!lessonSubject || !lessonTitle || !kidId) return
    setSaving(true)
    await supabase
      .from('lessons')
      .insert({
        organization_id: orgId,
        user_id: user.id,
        kid_id: kidId,
        subject: lessonSubject,
        title: lessonTitle,
        description: lessonDescription || null,
        status: 'not_started',
        duration_minutes: 30,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    setSaving(false)
    await completeOnboarding()
  }

  const progress = ((step - 1) / STEP_COUNT) * 100

  const stepLabels = ['Your School', 'Your Child', 'First Lesson']

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-pink-900 flex items-center justify-center p-4">

      {/* Skip Warning Modal */}
      {showSkipWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
            <div className="text-4xl mb-3">⏱️</div>
            <h3 className="text-lg font-black text-gray-900 mb-2">Skip Setup?</h3>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              This 3-step setup takes less than 3 minutes and saves you hours later —
              it seeds your compliance tracking, adds your child, and creates your first lesson automatically.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSkipWarning(false)}
                className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 text-sm"
              >
                Keep Going
              </button>
              <button
                onClick={completeOnboarding}
                className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-xl font-semibold hover:bg-gray-900 text-sm"
              >
                Skip Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Card */}
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-white font-black text-xl tracking-tight">Homeschool</span>
              <span className="text-purple-200 font-black text-xl tracking-tight">Ready</span>
            </div>
            <span className="text-purple-200 text-sm font-medium">Step {step} of {STEP_COUNT}</span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-purple-800 bg-opacity-50 rounded-full h-2 mb-4">
            <div
              className="bg-white rounded-full h-2 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Step pills */}
          <div className="flex gap-2">
            {stepLabels.map((label, i) => (
              <div
                key={i}
                className={`flex-1 text-center text-xs font-bold py-1 rounded-full transition-all ${
                  i + 1 === step
                    ? 'bg-white text-purple-700'
                    : i + 1 < step
                    ? 'bg-purple-500 text-white'
                    : 'bg-purple-800 bg-opacity-50 text-purple-300'
                }`}
              >
                {i + 1 < step ? '✓ ' : ''}{label}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="px-8 py-6">

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-black text-gray-900 mb-1">Let's set up your school</h2>
                <p className="text-sm text-gray-500">
                  This seeds your compliance tracking automatically — no manual setup needed later.
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Your state <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedState}
                  onChange={e => setSelectedState(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-purple-500 focus:outline-none"
                >
                  <option value="">Select your state...</option>
                  {SUPPORTED_STATES.map(s => (
                    <option key={s.code} value={s.code}>{s.name}</option>
                  ))}
                </select>
                {selectedState && selectedState !== 'OTHER' && (
                  <p className="text-xs text-green-600 mt-1 font-medium">
                    ✓ We'll auto-configure {SUPPORTED_STATES.find(s => s.code === selectedState)?.name}'s compliance requirements for you
                  </p>
                )}
                {selectedState === 'OTHER' && (
                  <p className="text-xs text-amber-600 mt-1 font-medium">
                    ⚠ You can manually configure your state requirements in the Control Center
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">School year start date</label>
                <input
                  type="date"
                  value={schoolYearStart}
                  onChange={e => setSchoolYearStart(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Annual teaching goal
                  <span className="text-gray-400 font-normal ml-1">(days per year)</span>
                </label>
                <div className="flex gap-2">
                  {['160', '180', '200'].map(days => (
                    <button
                      key={days}
                      onClick={() => setAnnualGoal(days)}
                      className={`flex-1 py-2 rounded-xl border-2 text-sm font-bold transition-all ${
                        annualGoal === days
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {days} days
                    </button>
                  ))}
                  <input
                    type="number"
                    value={annualGoal}
                    onChange={e => setAnnualGoal(e.target.value)}
                    className="w-20 px-3 py-2 border-2 border-gray-200 rounded-xl text-gray-900 text-center text-sm focus:border-purple-500 focus:outline-none"
                    min="1"
                    placeholder="Custom"
                  />
                </div>
              </div>

              <button
                onClick={saveStep1}
                disabled={!selectedState || saving}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-40 transition-all"
              >
                {saving ? 'Saving...' : 'Continue →'}
              </button>
            </div>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-black text-gray-900 mb-1">Add your first child</h2>
                <p className="text-sm text-gray-500">Just the basics — you can add more detail to their profile later.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    First name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="e.g. Emma"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-purple-500 focus:outline-none"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Last name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Age</label>
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
                  <label className="block text-sm font-bold text-gray-700 mb-2">Grade</label>
                  <select
                    value={grade}
                    onChange={e => setGrade(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-purple-500 focus:outline-none"
                  >
                    <option value="">Select...</option>
                    {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="px-5 py-3 border-2 border-gray-200 rounded-xl text-gray-600 font-bold text-sm hover:bg-gray-50"
                >
                  ← Back
                </button>
                <button
                  onClick={saveStep2}
                  disabled={!firstName.trim() || saving}
                  className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-40 transition-all"
                >
                  {saving ? 'Saving...' : 'Continue →'}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3 ── */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-black text-gray-900 mb-1">Add your first lesson</h2>
                <p className="text-sm text-gray-500">
                  Give {firstName} a win on day one. How would you like to get started?
                </p>
              </div>

              {/* Mode selector */}
              {!lessonMode && (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setLessonMode('manual')}
                    className="p-5 border-2 border-gray-200 rounded-2xl text-left hover:border-purple-400 hover:bg-purple-50 transition-all group"
                  >
                    <div className="text-3xl mb-2">✏️</div>
                    <div className="font-black text-gray-900 text-sm mb-1">Add manually</div>
                    <div className="text-xs text-gray-500 leading-relaxed">
                      Type in a subject and lesson title. Best if you already know what you're teaching this week.
                    </div>
                  </button>
                  <button
                    onClick={() => completeOnboarding('/lessons')}
                    className="p-5 border-2 border-gray-200 rounded-2xl text-left hover:border-indigo-400 hover:bg-indigo-50 transition-all group"
                  >
                    <div className="text-3xl mb-2">📥</div>
                    <div className="font-black text-gray-900 text-sm mb-1">Import curriculum</div>
                    <div className="text-xs text-gray-500 leading-relaxed">
                      Upload a PDF of your curriculum and we'll parse lessons automatically. Best for structured programs.
                    </div>
                    <div className="text-xs text-indigo-500 font-bold mt-2">Opens Import tool →</div>
                  </button>
                </div>
              )}

              {/* Manual lesson form */}
              {lessonMode === 'manual' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Subject <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={lessonSubject}
                      onChange={e => setLessonSubject(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-purple-500 focus:outline-none"
                    >
                      <option value="">Choose a subject...</option>
                      {CANONICAL_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Lesson title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={lessonTitle}
                      onChange={e => setLessonTitle(e.target.value)}
                      placeholder="e.g. Introduction to Fractions"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-purple-500 focus:outline-none"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Notes <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <textarea
                      value={lessonDescription}
                      onChange={e => setLessonDescription(e.target.value)}
                      placeholder="Any notes about this lesson..."
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-purple-500 focus:outline-none resize-none"
                      rows={2}
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setLessonMode(null)}
                      className="px-5 py-3 border-2 border-gray-200 rounded-xl text-gray-600 font-bold text-sm hover:bg-gray-50"
                    >
                      ← Back
                    </button>
                    <button
                      onClick={saveStep3Manual}
                      disabled={!lessonSubject || !lessonTitle || saving}
                      className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-40 transition-all"
                    >
                      {saving ? 'Saving...' : '🚀 Let\'s Go!'}
                    </button>
                  </div>
                </div>
              )}

              {/* Back button when on mode selector */}
              {!lessonMode && (
                <button
                  onClick={() => setStep(2)}
                  className="px-5 py-3 border-2 border-gray-200 rounded-xl text-gray-600 font-bold text-sm hover:bg-gray-50"
                >
                  ← Back
                </button>
              )}
            </div>
          )}
        </div>

        {/* Skip footer */}
        <div className="px-8 pb-6 text-center">
          <button
            onClick={() => setShowSkipWarning(true)}
            className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors"
          >
            Skip setup — I'll do this later
          </button>
        </div>
      </div>
    </div>
  )
}