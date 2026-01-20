// KidProfileForm.tsx - Comprehensive profile form with 4 tabs
'use client'

import { useState, useEffect } from 'react'
import SubjectPacingManager from './SubjectPacingManager'
import { supabase } from '@/lib/supabase'

interface SubjectProficiency {
  id?: string
  subject: string
  proficiency: 'needs_time' | 'standard' | 'mastery'  // Updated from 'emerging' | 'proficient' | 'mastery'
  notes: string
}

interface KidProfileFormProps {
  kid?: {
    id?: string
    displayname?: string
    firstname?: string
    lastname?: string
    age?: number
    grade?: string
    photo_url?: string
    learning_style?: string
    current_hook?: string
    environmental_needs?: string
    pace_of_learning?: string
    todays_vibe?: string
    current_focus?: string
  }
  onSave: (data: any) => Promise<void>
  onCancel: () => void
}

export default function KidProfileForm({ kid, onSave, onCancel }: KidProfileFormProps) {
  const [activeTab, setActiveTab] = useState<'core' | 'learning' | 'pacing' | 'profile'>('core')
  const [saving, setSaving] = useState(false)

  // Core Info
  const [firstname, setFirstname] = useState(kid?.firstname || '')
  const [lastname, setLastname] = useState(kid?.lastname || '')
  const [displayname, setDisplayname] = useState(kid?.displayname || '')
  const [age, setAge] = useState(kid?.age?.toString() || '')
  const [grade, setGrade] = useState(kid?.grade || '')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(kid?.photo_url || null)

  // Learning Style
  const [learningStyle, setLearningStyle] = useState(kid?.learning_style || '')
  const [paceOfLearning, setPaceOfLearning] = useState(kid?.pace_of_learning || '')
  const [environmentalNeeds, setEnvironmentalNeeds] = useState(kid?.environmental_needs || '')

  // Subject Pacing
  const [subjectProficiencies, setSubjectProficiencies] = useState<SubjectProficiency[]>([])
  const [loadingSubjects, setLoadingSubjects] = useState(false)

  // Profile
  const [currentHook, setCurrentHook] = useState(kid?.current_hook || '')
  const [todaysVibe, setTodaysVibe] = useState(kid?.todays_vibe || '')
  const [currentFocus, setCurrentFocus] = useState(kid?.current_focus || '')

  // Load existing subject proficiencies if editing
  useEffect(() => {
    if (kid?.id) {
      loadSubjectProficiencies()
    }
  }, [kid?.id])

  const loadSubjectProficiencies = async () => {
    if (!kid?.id) return
    
    setLoadingSubjects(true)
    const { data, error } = await supabase
      .from('subject_proficiency')
      .select('*')
      .eq('kid_id', kid.id)
      .order('subject')

    if (data && !error) {
      setSubjectProficiencies(data)
    }
    setLoadingSubjects(false)
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File too large. Maximum size is 5MB.')
        return
      }
      setPhotoFile(file)
      setPhotoPreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      await onSave({
        id: kid?.id,
        firstname,
        lastname,
        displayname: displayname || `${firstname} ${lastname}`.trim() || firstname,
        age: age ? parseInt(age) : null,
        grade,
        photoFile,
        learning_style: learningStyle,
        current_hook: currentHook,
        environmental_needs: environmentalNeeds,
        pace_of_learning: paceOfLearning,
        todays_vibe: todaysVibe,
        current_focus: currentFocus,
        subject_proficiencies: subjectProficiencies
      })
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('Failed to save profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">
                {kid?.id ? 'Edit Student Profile' : 'Add New Student'}
              </h2>
              <p className="text-blue-100 text-sm mt-1">
                {kid?.id ? `${kid.displayname || kid.firstname}` : 'Create a personalized learning profile'}
              </p>
            </div>
            <button
              onClick={onCancel}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('core')}
              className={`flex-1 px-4 py-3 font-medium transition-colors text-sm ${
                activeTab === 'core'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Core Info
            </button>
            <button
              onClick={() => setActiveTab('learning')}
              className={`flex-1 px-4 py-3 font-medium transition-colors text-sm ${
                activeTab === 'learning'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              How They Learn
            </button>
            <button
              onClick={() => setActiveTab('pacing')}
              className={`flex-1 px-4 py-3 font-medium transition-colors text-sm ${
                activeTab === 'pacing'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Subject Pacing
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex-1 px-4 py-3 font-medium transition-colors text-sm ${
                activeTab === 'profile'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Current Focus
            </button>
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-240px)]">
          <div className="p-6">
            {/* CORE INFO TAB */}
            {activeTab === 'core' && (
              <div className="space-y-6">
                {/* Photo Upload */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Student Photo
                  </label>
                  {photoPreview ? (
                    <div className="flex items-center gap-4">
                      <img 
                        src={photoPreview} 
                        alt="Preview"
                        className="w-24 h-24 rounded-full object-cover ring-4 ring-blue-100"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoFile(null)
                          setPhotoPreview(null)
                        }}
                        className="text-sm text-red-600 hover:text-red-700 font-medium"
                      >
                        Remove Photo
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <label className="cursor-pointer bg-blue-50 hover:bg-blue-100 border-2 border-blue-300 border-dashed rounded-lg p-4 text-center transition-colors">
                        <svg className="w-8 h-8 mx-auto text-blue-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm text-blue-600 font-medium">Upload Photo</p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoSelect}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={firstname}
                      onChange={(e) => setFirstname(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900"
                      placeholder="First name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={lastname}
                      onChange={(e) => setLastname(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900"
                      placeholder="Last name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Display Name (optional)
                  </label>
                  <input
                    type="text"
                    value={displayname}
                    onChange={(e) => setDisplayname(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900"
                    placeholder="Nickname or preferred name (defaults to first name)"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Leave blank to use first name: {firstname || 'First Name'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Age
                    </label>
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900"
                      placeholder="Age"
                      min="1"
                      max="25"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Grade
                    </label>
                    <input
                      type="text"
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900"
                      placeholder="K, 1, 2, etc."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* LEARNING STYLE TAB */}
            {activeTab === 'learning' && (
              <div className="space-y-6">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <p className="text-sm text-purple-900">
                    <span className="font-semibold">💡 Premium Feature:</span> This information will power personalized AI lesson generation and recommendations.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Learning Style
                  </label>
                  <select
                    value={learningStyle}
                    onChange={(e) => setLearningStyle(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900"
                  >
                    <option value="">Select learning style...</option>
                    <option value="visual">Visual (learns best by seeing)</option>
                    <option value="auditory">Auditory (learns best by hearing)</option>
                    <option value="kinesthetic">Kinesthetic (learns best by doing)</option>
                    <option value="reading_writing">Reading/Writing (learns best through text)</option>
                    <option value="mixed">Mixed (combination of styles)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Pace of Learning
                  </label>
                  <select
                    value={paceOfLearning}
                    onChange={(e) => setPaceOfLearning(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900"
                  >
                    <option value="">Select pace...</option>
                    <option value="accelerated">Accelerated (moves quickly, grasps concepts fast)</option>
                    <option value="standard">Standard (steady, consistent progress)</option>
                    <option value="deep_dive">Deep Dive (needs time/repetition, prefers mastery)</option>
                    <option value="variable">Variable (depends on subject/interest)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Environmental Needs
                  </label>
                  <textarea
                    value={environmentalNeeds}
                    onChange={(e) => setEnvironmentalNeeds(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900"
                    rows={4}
                    placeholder="e.g., Needs quiet space, works best in morning, prefers background music, needs movement breaks..."
                  />
                </div>
              </div>
            )}

            {/* SUBJECT PACING TAB */}
            {activeTab === 'pacing' && (
              <SubjectPacingManager
                kidId={kid?.id}
                initialSubjects={subjectProficiencies}
                onChange={setSubjectProficiencies}
              />
            )}

            {/* CURRENT FOCUS TAB */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-900">
                    <span className="font-semibold">🎯 Current Context:</span> Track what's happening now to personalize their learning experience.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    The "Hook": What are they loving right now? 🌟
                  </label>
                  <input
                    type="text"
                    value={currentHook}
                    onChange={(e) => setCurrentHook(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900"
                    placeholder="e.g., Dinosaurs, Minecraft, Drawing animals, Space..."
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Use their current interests to make lessons more engaging
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Today's Vibe 😊
                  </label>
                  <input
                    type="text"
                    value={todaysVibe}
                    onChange={(e) => setTodaysVibe(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900"
                    placeholder="e.g., Energetic 🎉, Focused 🎯, Tired 😴, Creative ✨"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Update daily to reflect their mood and energy
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Current Academic Focus
                  </label>
                  <input
                    type="text"
                    value={currentFocus}
                    onChange={(e) => setCurrentFocus(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900"
                    placeholder="e.g., Mastering Addition, Learning to Read, Fractions..."
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    What skill or concept are they working on right now?
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="border-t border-gray-200 p-6 bg-gray-50 flex gap-3 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 border-2 border-gray-300 text-gray-900 rounded-lg hover:bg-gray-100 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !firstname}
             className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-bold shadow-lg transition-colors"
            >
              {saving ? 'Saving...' : kid?.id ? 'Save Changes' : 'Add Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}