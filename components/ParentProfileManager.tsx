'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/src/lib/supabase'

interface ParentProfileManagerProps {
  userId: string
  onNameUpdate?: (name: string) => void
}

export default function ParentProfileManager({ userId, onNameUpdate }: ParentProfileManagerProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [parentName, setParentName] = useState('')
  const [tempName, setTempName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadParentProfile()
  }, [userId])

  const loadParentProfile = async () => {
    try {
      // Try to get from user_profiles table first
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('parent_name')
        .eq('user_id', userId)
        .maybeSingle()

      if (profile?.parent_name) {
        setParentName(profile.parent_name)
        setTempName(profile.parent_name)
        onNameUpdate?.(profile.parent_name)
      } else {
        // Fallback: Check if there's a name in localStorage
        const savedName = localStorage.getItem(`parent_name_${userId}`)
        if (savedName) {
          setParentName(savedName)
          setTempName(savedName)
          onNameUpdate?.(savedName)
        }
      }
    } catch (error) {
      console.error('Error loading parent profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!tempName.trim()) return

    try {
      // Try to upsert to database
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: userId,
          parent_name: tempName.trim(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })

      if (error) {
        console.warn('Database save failed, using localStorage:', error)
        // Fallback to localStorage if table doesn't exist
        localStorage.setItem(`parent_name_${userId}`, tempName.trim())
      }

      setParentName(tempName.trim())
      onNameUpdate?.(tempName.trim())
      setIsEditing(false)
    } catch (error) {
      console.error('Error saving parent name:', error)
      // Still save to localStorage as fallback
      localStorage.setItem(`parent_name_${userId}`, tempName.trim())
      setParentName(tempName.trim())
      onNameUpdate?.(tempName.trim())
      setIsEditing(false)
    }
  }

  if (loading) return null

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={tempName}
          onChange={(e) => setTempName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave()
            if (e.key === 'Escape') {
              setTempName(parentName)
              setIsEditing(false)
            }
          }}
          placeholder="Enter your name"
          className="px-3 py-1 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          autoFocus
        />
        <button
          onClick={handleSave}
          className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 font-medium"
        >
          Save
        </button>
        <button
          onClick={() => {
            setTempName(parentName)
            setIsEditing(false)
          }}
          className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
        >
          Cancel
        </button>
      </div>
    )
  }

  if (!parentName) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className="text-blue-600 hover:text-blue-700 text-sm font-medium underline"
      >
        + Set Your Name
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-600 text-sm">Welcome, <strong className="text-gray-900">{parentName}</strong>!</span>
      <button
        onClick={() => {
          setTempName(parentName)
          setIsEditing(true)
        }}
        className="text-gray-400 hover:text-gray-600 text-xs"
        title="Edit name"
      >
        ✏️
      </button>
    </div>
  )
}