'use client'

import { useState, useRef } from 'react'

// ── Constants ─────────────────────────────────────────────────────────────────

const GRADES = [
  'Pre-K', 'Kindergarten', '1st', '2nd', '3rd', '4th', '5th',
  '6th', '7th', '8th', '9th', '10th', '11th', '12th',
]

const LEARNING_STYLES = [
  { value: 'visual',      label: '🎨 Visual',      desc: 'Learns through images, diagrams, and color' },
  { value: 'aural',       label: '👂 Aural',        desc: 'Learns through listening, discussion, and audio' },
  { value: 'read_write',  label: '📝 Read / Write', desc: 'Learns through reading, note-taking, and text' },
  { value: 'kinesthetic', label: '🤲 Kinesthetic',  desc: 'Learns through doing, building, and moving' },
]

// ── Types ─────────────────────────────────────────────────────────────────────

interface KidData {
  id?: string
  firstname?: string
  lastname?: string
  displayname?: string
  age?: number | null
  grade?: string | null
  photo_url?: string
  learning_style?: string | null
  current_hook?: string | null
  curriculum?: string | null
  photoFile?: File
}

interface KidProfileFormProps {
  kid?: KidData
  onSave: (data: KidData & { photoFile?: File }) => Promise<void>
  onCancel: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function KidProfileForm({ kid, onSave, onCancel }: KidProfileFormProps) {
  const isEditing = !!kid?.id
  const [activeTab, setActiveTab] = useState<'core' | 'learning'>('core')
  const [saving, setSaving] = useState(false)

  // Core Info
  const [firstname, setFirstname]       = useState(kid?.firstname || '')
  const [lastname, setLastname]         = useState(kid?.lastname || '')
  const [displayname, setDisplayname]   = useState(kid?.displayname || '')
  const [age, setAge]                   = useState(kid?.age?.toString() || '')
  const [grade, setGrade]               = useState(kid?.grade || '')
  const [photoFile, setPhotoFile]       = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState(kid?.photo_url || '')
  const fileInputRef                    = useRef<HTMLInputElement>(null)

  // How They Learn
  const [learningStyles, setLearningStyles] = useState<string[]>(
    kid?.learning_style ? kid.learning_style.split(',').map((s: string) => s.trim()) : []
  )
  const [currentHook, setCurrentHook] = useState(kid?.current_hook || '')
  const [curriculum, setCurriculum] = useState(kid?.curriculum || '')

  const toggleStyle = (value: string) => {
    setLearningStyles(prev =>
      prev.includes(value) ? prev.filter(s => s !== value) : [...prev, value]
    )
  }

  // ── Photo handler ─────────────────────────────────────────────────────────
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = ev => setPhotoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  // ── Validation ────────────────────────────────────────────────────────────
  const coreComplete     = firstname.trim().length > 0
  const learningComplete = learningStyles.length > 0
  const canSave          = coreComplete && learningComplete

  const tabStatus = {
    core:     coreComplete,
    learning: learningComplete,
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!canSave || saving) return
    setSaving(true)
    try {
      await onSave({
        id: kid?.id,
        firstname: firstname.trim(),
        lastname: lastname.trim(),
        displayname: displayname.trim() || firstname.trim(),
        age: age ? parseInt(age) : null,
        grade: grade || null,
        learning_style: learningStyles.length > 0 ? learningStyles.join(', ') : null,
        current_hook: currentHook.trim() || null,
        curriculum: curriculum || null,
        photoFile: photoFile || undefined,
      })
    } finally {
      setSaving(false)
    }
  }

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const TABS = [
    { id: 'core' as const,     label: 'Core Info',       done: tabStatus.core },
    { id: 'learning' as const, label: 'How They Learn',  done: tabStatus.learning },
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] px-4 pt-4 pb-24">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full flex flex-col overflow-hidden" style={{ maxHeight: 'calc(100vh - 104px)' }}>

        {/* Header */}
        <div className="bg-gradient-to-r from-purple-700 to-pink-500 px-6 py-5 flex-shrink-0">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-black text-white">
                {isEditing ? 'Edit Student Profile' : 'Add Your Child'}
              </h2>
              {isEditing && kid?.displayname && (
                <p className="text-purple-200 text-sm mt-0.5">{kid.displayname}</p>
              )}
            </div>
            <button
              onClick={onCancel}
              className="text-white hover:text-purple-200 text-2xl font-light leading-none mt-0.5"
            >
              ×
            </button>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 mt-4">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-purple-700'
                    : 'text-white text-opacity-80 hover:bg-white hover:bg-opacity-20'
                }`}
              >
                {tab.done && activeTab !== tab.id && (
                  <span className="text-yellow-300 text-xs">✓</span>
                )}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* ── Core Info Tab ────────────────────────────────────────────── */}
          {activeTab === 'core' && (
            <>
              {/* Photo */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Student Photo
                </label>
                <div className="flex items-center gap-4">
                  {photoPreview ? (
                    <div className="relative">
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="w-20 h-20 rounded-full object-cover border-4 border-purple-100"
                      />
                      <button
                        onClick={() => { setPhotoPreview(''); setPhotoFile(null) }}
                        className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs font-bold flex items-center justify-center"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-20 h-20 rounded-full border-2 border-dashed border-blue-300 flex flex-col items-center justify-center text-blue-500 hover:bg-blue-50 transition-colors"
                    >
                      <span className="text-2xl">🖼</span>
                      <span className="text-xs font-semibold mt-1">Upload</span>
                    </button>
                  )}
                  {!photoPreview && (
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Upload a photo to personalize<br />the app for your child.
                    </p>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </div>

              {/* First + Last Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={firstname}
                    onChange={e => setFirstname(e.target.value)}
                    placeholder="e.g. Emma"
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-purple-500 focus:outline-none text-sm"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={lastname}
                    onChange={e => setLastname(e.target.value)}
                    placeholder="Last name"
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-purple-500 focus:outline-none text-sm"
                  />
                </div>
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Display Name{' '}
                  <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={displayname}
                  onChange={e => setDisplayname(e.target.value)}
                  placeholder={`e.g. ${firstname || 'Em'}, Bug, Buddy...`}
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-purple-500 focus:outline-none text-sm"
                />
                {firstname && (
                  <p className="text-xs text-gray-400 mt-1">
                    Leave blank to use first name: {firstname}
                  </p>
                )}
              </div>

              {/* Age + Grade */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Age</label>
                  <input
                    type="number"
                    value={age}
                    onChange={e => setAge(e.target.value)}
                    placeholder="e.g. 9"
                    min="3"
                    max="18"
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-purple-500 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Grade</label>
                  <select
                    value={grade}
                    onChange={e => setGrade(e.target.value)}
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-purple-500 focus:outline-none text-sm"
                  >
                    <option value="">Select grade...</option>
                    {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>

              {/* Next tab nudge */}
              {coreComplete && (
                <button
                  onClick={() => setActiveTab('learning')}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all"
                >
                  Next: How They Learn →
                </button>
              )}
            </>
          )}

          {/* ── How They Learn Tab ───────────────────────────────────────── */}
          {activeTab === 'learning' && (
            <>
              {/* Premium callout */}
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex gap-2 items-start">
                <span className="text-base flex-shrink-0">💡</span>
                <p className="text-xs text-purple-700 leading-relaxed">
                  <strong>This powers Copilot lesson generation.</strong> The more accurate this is,
                  the more personalized every generated lesson will be.
                </p>
              </div>

              {/* Learning Style — multi-select */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  How does {displayname || firstname || 'your child'} learn best?{' '}
                  <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-400 mb-3">
                  Select all that apply — Copilot uses this to structure every lesson it generates
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {LEARNING_STYLES.map(style => {
                    const selected = learningStyles.includes(style.value)
                    return (
                      <button
                        key={style.value}
                        type="button"
                        onClick={() => toggleStyle(style.value)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                          selected
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 bg-white hover:border-purple-300'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 transition-all ${
                          selected ? 'bg-purple-600 border-purple-600' : 'bg-white border-gray-300'
                        }`}>
                          {selected && <span className="text-white text-xs font-black">✓</span>}
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-bold ${selected ? 'text-purple-700' : 'text-gray-800'}`}>
                            {style.label}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">{style.desc}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
                {learningStyles.length > 1 && (
                  <p className="text-xs text-purple-600 font-semibold mt-2">
                    ✓ Multimodal learner — Copilot will blend these styles
                  </p>
                )}
              </div>

              {/* Current Hook */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  What are they into right now?{' '}
                  <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <p className="text-xs text-gray-400 mb-2">
                  Scout weaves their current interests into lessons to make them more engaging —
                  update this as their obsessions change
                </p>
                <input
                  type="text"
                  value={currentHook}
                  onChange={e => setCurrentHook(e.target.value)}
                  placeholder="e.g. Minecraft, Dinosaurs, Drawing animals, Space..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-purple-500 focus:outline-none text-sm"
                />
              </div>

              {/* Curriculum */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Curriculum{' '}
                  <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <p className="text-xs text-gray-400 mb-2">
                  Scout aligns lesson structure and terminology with your chosen curriculum
                </p>
                <select
                  value={curriculum}
                  onChange={e => setCurriculum(e.target.value)}
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-purple-500 focus:outline-none text-sm"
                >
                  <option value="">Select curriculum...</option>
                  <optgroup label="All-in-One">
                    {['Sonlight', 'Abeka', 'BJU Press', "My Father's World", 'Classical Conversations', 'Memoria Press', 'Veritas Press', 'Bookshark', 'The Good and the Beautiful'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Math">
                    {['Singapore Math', 'Saxon Math', 'Math-U-See', 'RightStart Math', 'Beast Academy', 'Teaching Textbooks', 'Math Mammoth', 'Life of Fred'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Language Arts">
                    {['All About Reading', 'All About Spelling', 'IEW', 'Brave Writer', 'Shurley English'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Science">
                    {['Apologia', 'Real Science Odyssey'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </optgroup>
                  <optgroup label="History">
                    {['Story of the World', 'Mystery of History', 'Notgrass History'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Other">
                    <option value="Eclectic / Mix">Eclectic / Mix</option>
                    <option value="Custom">Custom / Not Listed</option>
                  </optgroup>
                </select>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-gray-100 px-6 py-4 flex gap-3 bg-gray-50">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 border-2 border-gray-200 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-100 transition-all"
          >
            Cancel
          </button>

          {!canSave && (
            <div className="flex-1 flex items-center">
              <p className="text-xs text-gray-400">
                {!coreComplete && 'Add a first name to continue.'}
                {coreComplete && !learningComplete && (
                  <button
                    onClick={() => setActiveTab('learning')}
                    className="text-purple-600 font-semibold hover:underline"
                  >
                    Select a learning style to save →
                  </button>
                )}
              </p>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-40 transition-all"
          >
            {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Child'}
          </button>
        </div>

      </div>
    </div>
  )
}