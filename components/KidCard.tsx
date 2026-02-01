// KidCard.tsx - Updated kid card component for sidebar
// Replace the kid card section in your Dashboard with this component
'use client'

import { useState, useEffect, useRef } from 'react'

interface KidCardProps {
  kid: {
    id: string
    displayname: string
    firstname?: string
    lastname?: string
    age?: number
    grade?: string
    photo_url?: string
    current_focus?: string
    todays_vibe?: string
    current_hook?: string 
  }
  isSelected: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
}

export default function KidCard({ kid, isSelected, onSelect, onEdit, onDelete }: KidCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [showVibeModal, setShowVibeModal] = useState(false)
  const [vibeValue, setVibeValue] = useState(kid.todays_vibe || '')
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const updateVibe = async () => {
    const { supabase } = await import('@/src/lib/supabase')
    await supabase
      .from('kids')
      .update({ todays_vibe: vibeValue })
      .eq('id', kid.id)
    
    setShowVibeModal(false)
    // Refresh the page to show updated vibe
    window.location.reload()
  }

  return (
    <div 
      className={`border-2 rounded-lg p-4 transition-all ${
        isSelected 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-200 hover:border-gray-300 bg-white'
      }`}
    >
      {/* Header with photo and menu */}
      <div className="flex items-start justify-between mb-3">
        <div 
          className="flex items-center gap-3 flex-1 cursor-pointer"
          onClick={onSelect}
        >
          {/* Photo */}
          {kid.photo_url ? (
            <img 
              src={kid.photo_url} 
              alt={kid.displayname}
              className="w-16 h-16 rounded-full object-cover ring-2 ring-white shadow-md"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold shadow-md">
              {kid.firstname?.charAt(0) || kid.displayname.charAt(0)}
            </div>
          )}

          {/* Name and Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg text-gray-900 truncate">
              {kid.displayname}
            </h3>
            <p className="text-sm text-gray-600">
              {kid.grade && `Grade ${kid.grade}`}
              {kid.grade && kid.age && ' • '}
              {kid.age && `Age ${kid.age}`}
            </p>
          </div>
        </div>

        {/* Ellipses Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowMenu(!showMenu)
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="More options"
          >
            <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
            </svg>
          </button>

          {/* Dropdown Menu */}
          {showMenu && (
            <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowMenu(false)
                  onEdit()
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Profile
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowMenu(false)
                  onDelete()
                }}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Hook and Today's Vibe - Right under name/grade info */}
      <div className="space-y-1">
        {kid.current_hook && (
          <p className="text-xs text-blue-700 font-medium flex items-center gap-1">
            <span>🎯</span>
            <span>Hook: {kid.current_hook}</span>
          </p>
        )}
        <div className="flex items-center justify-between">
          {kid.todays_vibe ? (
            <p className="text-xs text-purple-700 font-medium flex items-center gap-1">
              <span>😊</span>
              <span>Vibe: {kid.todays_vibe}</span>
            </p>
          ) : (
            <p className="text-xs text-gray-400 italic">No vibe set today</p>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setVibeValue(kid.todays_vibe || '')
              setShowVibeModal(true)
            }}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
            title="Update today's vibe"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Update
          </button>
        </div>
      </div>

      {/* Vibe Update Modal */}
      {showVibeModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowVibeModal(false)}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Today's Vibe 😊</h3>
              <button
                onClick={() => setShowVibeModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-3">
              Update daily to reflect {kid.displayname}'s mood and energy
            </p>
            
            <input
              type="text"
              value={vibeValue}
              onChange={(e) => setVibeValue(e.target.value)}
              placeholder="e.g., Energetic 🎉, Focused 🎯, Tired 😴, Creative ✨"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 mb-4"
              autoFocus
            />
            
            <div className="flex gap-2">
              <button
                onClick={updateVibe}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium"
              >
                Save Vibe
              </button>
              <button
                onClick={() => setShowVibeModal(false)}
                className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-50 text-gray-900"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Current Focus - Optional */}
      {kid.current_focus && (
        <div className="mt-3 bg-blue-50 rounded-lg p-2 border border-blue-200">
          <p className="text-xs font-semibold text-gray-700 mb-1">Current Focus</p>
          <p className="text-sm text-blue-800 font-medium">{kid.current_focus}</p>
        </div>
      )}
    </div>
  )
}