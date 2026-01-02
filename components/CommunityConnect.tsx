'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface CommunityConnectProps {
  userId: string
}

interface UserProfile {
  id: string
  full_name: string
  city: string
  state: string
  bio?: string
  interests?: string[]
  kids_count?: number
  looking_for?: string[]
}

export default function CommunityConnect({ userId }: CommunityConnectProps) {
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [nearbyFamilies, setNearbyFamilies] = useState<UserProfile[]>([])
  const [showProfileForm, setShowProfileForm] = useState(false)
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    city: '',
    state: '',
    bio: '',
    interests: '',
    kids_count: '',
    looking_for: [] as string[]
  })

  const lookingForOptions = [
    'Park Days',
    'Field Trips',
    'Co-op Classes',
    'Playdates',
    'Study Groups',
    'Sports Teams',
    'Book Clubs',
    'Art Classes',
    'Music Groups',
    'Science Labs'
  ]

  useEffect(() => {
    loadProfile()
    loadNearbyFamilies()
  }, [userId])

  const loadProfile = async () => {
    const { data } = await supabase
      .from('community_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (data) {
      setUserProfile(data)
      setProfileForm({
        full_name: data.full_name || '',
        city: data.city || '',
        state: data.state || '',
        bio: data.bio || '',
        interests: data.interests?.join(', ') || '',
        kids_count: data.kids_count?.toString() || '',
        looking_for: data.looking_for || []
      })
    }
    setLoading(false)
  }

  const loadNearbyFamilies = async () => {
    // First get user's location
    const { data: myProfile } = await supabase
      .from('community_profiles')
      .select('city, state')
      .eq('user_id', userId)
      .single()

    if (myProfile) {
      // Find families in same city/state
      const { data } = await supabase
        .from('community_profiles')
        .select('*')
        .eq('city', myProfile.city)
        .eq('state', myProfile.state)
        .neq('user_id', userId)
        .limit(20)

      if (data) {
        setNearbyFamilies(data)
      }
    }
  }

  const saveProfile = async () => {
    const profileData = {
      user_id: userId,
      full_name: profileForm.full_name,
      city: profileForm.city,
      state: profileForm.state,
      bio: profileForm.bio,
      interests: profileForm.interests.split(',').map(i => i.trim()).filter(i => i),
      kids_count: profileForm.kids_count ? parseInt(profileForm.kids_count) : null,
      looking_for: profileForm.looking_for
    }

    const { data: existing } = await supabase
      .from('community_profiles')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (existing) {
      await supabase
        .from('community_profiles')
        .update(profileData)
        .eq('user_id', userId)
    } else {
      await supabase
        .from('community_profiles')
        .insert([profileData])
    }

    setShowProfileForm(false)
    loadProfile()
    loadNearbyFamilies()
  }

  const toggleLookingFor = (option: string) => {
    if (profileForm.looking_for.includes(option)) {
      setProfileForm({
        ...profileForm,
        looking_for: profileForm.looking_for.filter(o => o !== option)
      })
    } else {
      setProfileForm({
        ...profileForm,
        looking_for: [...profileForm.looking_for, option]
      })
    }
  }

  const sendConnectionRequest = async (targetUserId: string) => {
    const { error } = await supabase
      .from('connection_requests')
      .insert([{
        from_user_id: userId,
        to_user_id: targetUserId,
        status: 'pending'
      }])

    if (!error) {
      alert('Connection request sent!')
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading community...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Community Connect</h2>
          <p className="text-gray-600">Find and connect with local homeschool families</p>
        </div>
        <button
          onClick={() => setShowProfileForm(!showProfileForm)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          {showProfileForm ? 'Cancel' : userProfile ? 'Edit Profile' : 'Create Profile'}
        </button>
      </div>

      {/* Profile Form */}
      {showProfileForm && (
        <div className="bg-green-50 rounded-lg p-6 border border-green-200">
          <h3 className="font-semibold text-gray-900 mb-4">Your Community Profile</h3>
          
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={profileForm.full_name}
                  onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Children
                </label>
                <input
                  type="number"
                  value={profileForm.kids_count}
                  onChange={(e) => setProfileForm({ ...profileForm, kids_count: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City *
                </label>
                <input
                  type="text"
                  value={profileForm.city}
                  onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State *
                </label>
                <input
                  type="text"
                  value={profileForm.state}
                  onChange={(e) => setProfileForm({ ...profileForm, state: e.target.value })}
                  placeholder="e.g., NC"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bio
              </label>
              <textarea
                value={profileForm.bio}
                onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                placeholder="Tell other families about your homeschool journey..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Interests (comma-separated)
              </label>
              <input
                type="text"
                value={profileForm.interests}
                onChange={(e) => setProfileForm({ ...profileForm, interests: e.target.value })}
                placeholder="Science, Art, Sports, Music..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Looking For (select all that apply)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {lookingForOptions.map(option => (
                  <label
                    key={option}
                    className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                      profileForm.looking_for.includes(option)
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-green-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={profileForm.looking_for.includes(option)}
                      onChange={() => toggleLookingFor(option)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-900">{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={saveProfile}
              className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-semibold"
            >
              Save Profile
            </button>
          </div>
        </div>
      )}

      {/* Your Profile Summary */}
      {userProfile && !showProfileForm && (
        <div className="bg-gradient-to-r from-green-500 to-teal-600 rounded-lg p-6 text-white">
          <h3 className="text-xl font-bold mb-2">Your Profile</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-green-100 text-sm">Name</p>
              <p className="font-semibold">{userProfile.full_name}</p>
            </div>
            <div>
              <p className="text-green-100 text-sm">Location</p>
              <p className="font-semibold">{userProfile.city}, {userProfile.state}</p>
            </div>
            {userProfile.kids_count && (
              <div>
                <p className="text-green-100 text-sm">Children</p>
                <p className="font-semibold">{userProfile.kids_count}</p>
              </div>
            )}
            {userProfile.looking_for && userProfile.looking_for.length > 0 && (
              <div>
                <p className="text-green-100 text-sm">Looking For</p>
                <p className="font-semibold">{userProfile.looking_for.join(', ')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Nearby Families */}
      {!userProfile ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-6xl mb-4">🤝</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Create Your Profile</h3>
          <p className="text-gray-600">Set up your community profile to connect with local families!</p>
        </div>
      ) : nearbyFamilies.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-6xl mb-4">🌍</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Families Nearby Yet</h3>
          <p className="text-gray-600">Be the first in your area! Invite other homeschoolers to join.</p>
        </div>
      ) : (
        <div>
          <h3 className="font-semibold text-gray-900 mb-4">
            Families in {userProfile.city}, {userProfile.state} ({nearbyFamilies.length})
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {nearbyFamilies.map(family => (
              <div key={family.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-gray-900">{family.full_name}</h4>
                    <p className="text-sm text-gray-600">
                      {family.city}, {family.state}
                      {family.kids_count && ` • ${family.kids_count} ${family.kids_count === 1 ? 'child' : 'children'}`}
                    </p>
                  </div>
                </div>

                {family.bio && (
                  <p className="text-sm text-gray-700 mb-3 line-clamp-2">{family.bio}</p>
                )}

                {family.interests && family.interests.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-600 mb-1">Interests:</p>
                    <div className="flex flex-wrap gap-1">
                      {family.interests.slice(0, 3).map((interest, i) => (
                        <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {family.looking_for && family.looking_for.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-600 mb-1">Looking for:</p>
                    <p className="text-sm text-gray-700">{family.looking_for.slice(0, 2).join(', ')}</p>
                  </div>
                )}

                <button
                  onClick={() => sendConnectionRequest(family.id)}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  Send Connection Request
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}