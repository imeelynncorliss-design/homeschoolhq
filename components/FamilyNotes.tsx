'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/src/lib/supabase'

interface FamilyNotesProps {
  onClose: () => void
}

export default function FamilyNotes({ onClose }: FamilyNotesProps) {
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [noteId, setNoteId] = useState<string | null>(null)

  useEffect(() => {
    loadNotes()
  }, [])

  const loadNotes = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      const { data, error } = await supabase
        .from('family_notes')
        .select('*')
        .eq('user_id', user.id)
        .single()
      
      if (data) {
        setNotes(data.note_text || '')
        setNoteId(data.id)
      }
    }
    setLoading(false)
  }

  const saveNotes = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      if (noteId) {
        // Update existing note
        await supabase
          .from('family_notes')
          .update({ 
            note_text: notes,
            updated_at: new Date().toISOString()
          })
          .eq('id', noteId)
      } else {
        // Create new note
        const { data } = await supabase
          .from('family_notes')
          .insert([{
            user_id: user.id,
            note_text: notes
          }])
          .select()
          .single()
        
        if (data) {
          setNoteId(data.id)
        }
      }
    }
    setSaving(false)
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Family Notes</h2>
            <p className="text-sm text-gray-600 mt-1">
              General notes, to-dos, and reminders for the whole family
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-600">Loading notes...</div>
        ) : (
          <>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-96 px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Add your family notes, to-do lists, reminders, or anything else here...

Examples:
• Weekly meal planning
• Upcoming field trips
• Books to order from library
• Extracurricular schedules
• Family goals for the year"
            />
            
            <div className="flex justify-between items-center mt-4">
              <p className="text-sm text-gray-500">
                {notes.length > 0 ? `${notes.length} characters` : 'Start typing...'}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-200 text-gray-900 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await saveNotes()
                    onClose()
                  }}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Notes'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}