'use client'

import { useState } from 'react'
import { supabase } from '@/src/lib/supabase'

interface ChildPhotoUploadProps {
  childId: string
  currentPhotoUrl?: string | null
  onUploadComplete: (photoUrl: string) => void
}

export default function ChildPhotoUpload({ 
  childId, 
  currentPhotoUrl, 
  onUploadComplete 
}: ChildPhotoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [photoUrl, setPhotoUrl] = useState(currentPhotoUrl)


  const uploadPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)

      if (!event.target.files || event.target.files.length === 0) {
        return
      }

      const file = event.target.files[0]
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB')
        return
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('File must be an image')
        return
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${childId}/${Date.now()}.${fileExt}`

      // Delete old photo if exists
      if (photoUrl) {
        const oldPath = photoUrl.split('/').slice(-2).join('/')
        await supabase.storage.from('child-photos').remove([oldPath])
      }

      // Upload new photo
      const { error: uploadError } = await supabase.storage
        .from('child-photos')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('child-photos')
        .getPublicUrl(fileName)

      // Update database
      const { error: updateError } = await supabase
        .from('kids')
        .update({ photo_url: publicUrl })
        .eq('id', childId)

      if (updateError) throw updateError

      setPhotoUrl(publicUrl)
      onUploadComplete(publicUrl)
      
    } catch (error) {
      alert('Error uploading photo')
      console.error(error)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-32 h-32 rounded-full overflow-hidden bg-gray-100">
        {photoUrl ? (
          <img
          src={photoUrl}
          alt="Child photo"
          className="w-full h-full object-cover"
        />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
      
      <label className="cursor-pointer">
        <span className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-block">
          {uploading ? 'Uploading...' : photoUrl ? 'Change Photo' : 'Upload Photo'}
        </span>
        <input
          type="file"
          accept="image/*"
          onChange={uploadPhoto}
          disabled={uploading}
          className="hidden"
        />
      </label>
    </div>
  )
}