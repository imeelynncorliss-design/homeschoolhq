'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface FamilyCollaborationProps {
  userId: string
}

interface CollaboratorInvite {
  id: string
  email: string
  role: 'parent' | 'co_teacher' | 'viewer'
  status: 'pending' | 'accepted' | 'declined'
  invited_at: string
}

interface Collaborator {
  id: string
  user_id: string
  email: string
  name: string
  role: 'parent' | 'co_teacher' | 'viewer'
  permissions: {
    can_edit_lessons: boolean
    can_view_progress: boolean
    can_manage_kids: boolean
    can_create_events: boolean
  }
}

export default function FamilyCollaboration({ userId }: FamilyCollaborationProps) {
  const [loading, setLoading] = useState(true)
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [pendingInvites, setPendingInvites] = useState<CollaboratorInvite[]>([])
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'parent' as 'parent' | 'co_teacher' | 'viewer',
    permissions: {
      can_edit_lessons: true,
      can_view_progress: true,
      can_manage_kids: false,
      can_create_events: true
    }
  })

  const roleDescriptions = {
    parent: {
      label: '👨‍👩‍👧 Co-Parent',
      description: 'Full access - can manage everything',
      defaultPermissions: {
        can_edit_lessons: true,
        can_view_progress: true,
        can_manage_kids: true,
        can_create_events: true
      }
    },
    co_teacher: {
      label: '👩‍🏫 Co-Teacher',
      description: 'Can edit lessons and view progress',
      defaultPermissions: {
        can_edit_lessons: true,
        can_view_progress: true,
        can_manage_kids: false,
        can_create_events: true
      }
    },
    viewer: {
      label: '👀 Viewer',
      description: 'Read-only access to view progress',
      defaultPermissions: {
        can_edit_lessons: false,
        can_view_progress: true,
        can_manage_kids: false,
        can_create_events: false
      }
    }
  }

  useEffect(() => {
    loadCollaborators()
    loadPendingInvites()
  }, [userId])

  const loadCollaborators = async () => {
    const { data } = await supabase
      .from('family_collaborators')
      .select('*')
      .eq('owner_id', userId)

    if (data) {
      setCollaborators(data)
    }
    setLoading(false)
  }

  const loadPendingInvites = async () => {
    const { data } = await supabase
      .from('collaborator_invites')
      .select('*')
      .eq('invited_by', userId)
      .eq('status', 'pending')

    if (data) {
      setPendingInvites(data)
    }
  }

  const sendInvite = async () => {
    if (!inviteForm.email) {
      alert('Please enter an email address')
      return
    }

    // Check if already invited or collaborating
    const { data: existing } = await supabase
      .from('collaborator_invites')
      .select('*')
      .eq('invited_by', userId)
      .eq('email', inviteForm.email)
      .eq('status', 'pending')
      .single()

    if (existing) {
      alert('This email already has a pending invitation')
      return
    }

    const { error } = await supabase
      .from('collaborator_invites')
      .insert([{
        invited_by: userId,
        email: inviteForm.email,
        role: inviteForm.role,
        permissions: inviteForm.permissions,
        status: 'pending'
      }])

    if (!error) {
      alert(`Invitation sent to ${inviteForm.email}!`)
      setInviteForm({
        email: '',
        role: 'parent',
        permissions: roleDescriptions.parent.defaultPermissions
      })
      setShowInviteForm(false)
      loadPendingInvites()
    }
  }

  const revokeInvite = async (inviteId: string) => {
    if (confirm('Revoke this invitation?')) {
      await supabase
        .from('collaborator_invites')
        .delete()
        .eq('id', inviteId)
      
      loadPendingInvites()
    }
  }

  const removeCollaborator = async (collaboratorId: string) => {
    if (confirm('Remove this collaborator? They will lose access to your homeschool data.')) {
      await supabase
        .from('family_collaborators')
        .delete()
        .eq('id', collaboratorId)
      
      loadCollaborators()
    }
  }

  const updateCollaboratorRole = async (collaboratorId: string, newRole: 'parent' | 'co_teacher' | 'viewer') => {
    const newPermissions = roleDescriptions[newRole].defaultPermissions

    await supabase
      .from('family_collaborators')
      .update({ 
        role: newRole,
        permissions: newPermissions
      })
      .eq('id', collaboratorId)
    
    loadCollaborators()
  }

  const handleRoleChange = (role: 'parent' | 'co_teacher' | 'viewer') => {
    setInviteForm({
      ...inviteForm,
      role,
      permissions: roleDescriptions[role].defaultPermissions
    })
  }

  if (loading) {
    return <div className="text-center py-8">Loading collaboration settings...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Family Collaboration</h2>
          <p className="text-gray-600">Share access with co-parents, teachers, and family members</p>
        </div>
        <button
          onClick={() => setShowInviteForm(!showInviteForm)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          {showInviteForm ? 'Cancel' : '+ Invite Collaborator'}
        </button>
      </div>

      {/* Invite Form */}
      {showInviteForm && (
        <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
          <h3 className="font-semibold text-gray-900 mb-4">Invite a Collaborator</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                placeholder="partner@email.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Role & Permissions
              </label>
              <div className="space-y-2">
                {(Object.keys(roleDescriptions) as Array<keyof typeof roleDescriptions>).map(role => (
                  <label
                    key={role}
                    className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      inviteForm.role === role
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <input
                      type="radio"
                      value={role}
                      checked={inviteForm.role === role}
                      onChange={() => handleRoleChange(role)}
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 mb-1">
                        {roleDescriptions[role].label}
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        {roleDescriptions[role].description}
                      </div>
                      <div className="text-xs text-gray-500 space-y-1">
                        {roleDescriptions[role].defaultPermissions.can_edit_lessons && (
                          <div>✓ Edit lessons and assignments</div>
                        )}
                        {roleDescriptions[role].defaultPermissions.can_view_progress && (
                          <div>✓ View student progress</div>
                        )}
                        {roleDescriptions[role].defaultPermissions.can_manage_kids && (
                          <div>✓ Manage student profiles</div>
                        )}
                        {roleDescriptions[role].defaultPermissions.can_create_events && (
                          <div>✓ Create events and activities</div>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={sendInvite}
              className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 font-semibold"
            >
              Send Invitation
            </button>
          </div>
        </div>
      )}

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Pending Invitations</h3>
          <div className="space-y-2">
            {pendingInvites.map(invite => (
              <div key={invite.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">{invite.email}</div>
                  <div className="text-sm text-gray-600">
                    {roleDescriptions[invite.role].label} • Invited {new Date(invite.invited_at).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => revokeInvite(invite.id)}
                  className="px-3 py-1 text-red-600 hover:bg-red-50 rounded"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Collaborators */}
      {collaborators.length === 0 && pendingInvites.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-6xl mb-4">👨‍👩‍👧‍👦</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Collaborators Yet</h3>
          <p className="text-gray-600">Invite a co-parent, teacher, or family member to help manage your homeschool!</p>
        </div>
      ) : collaborators.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Active Collaborators ({collaborators.length})</h3>
          <div className="space-y-3">
            {collaborators.map(collab => (
              <div key={collab.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-bold text-gray-900">{collab.name}</div>
                    <div className="text-sm text-gray-600">{collab.email}</div>
                  </div>
                  <button
                    onClick={() => removeCollaborator(collab.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>

                <div className="mb-3">
                  <label className="block text-xs text-gray-600 mb-2">Role</label>
                  <select
                    value={collab.role}
                    onChange={(e) => updateCollaboratorRole(collab.id, e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900"
                  >
                    <option value="parent">{roleDescriptions.parent.label}</option>
                    <option value="co_teacher">{roleDescriptions.co_teacher.label}</option>
                    <option value="viewer">{roleDescriptions.viewer.label}</option>
                  </select>
                </div>

                <div className="bg-gray-50 rounded p-3">
                  <div className="text-xs font-semibold text-gray-700 mb-2">Permissions:</div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div className={collab.permissions.can_edit_lessons ? 'text-green-700' : 'text-gray-400'}>
                      {collab.permissions.can_edit_lessons ? '✓' : '✗'} Edit Lessons
                    </div>
                    <div className={collab.permissions.can_view_progress ? 'text-green-700' : 'text-gray-400'}>
                      {collab.permissions.can_view_progress ? '✓' : '✗'} View Progress
                    </div>
                    <div className={collab.permissions.can_manage_kids ? 'text-green-700' : 'text-gray-400'}>
                      {collab.permissions.can_manage_kids ? '✓' : '✗'} Manage Profiles
                    </div>
                    <div className={collab.permissions.can_create_events ? 'text-green-700' : 'text-gray-400'}>
                      {collab.permissions.can_create_events ? '✓' : '✗'} Create Events
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">ℹ️</span>
          <div>
            <p className="font-semibold text-gray-900 mb-2">How Family Collaboration Works:</p>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• <strong>Co-Parents</strong> get full access to manage everything</li>
              <li>• <strong>Co-Teachers</strong> can create and edit lessons but not manage student profiles</li>
              <li>• <strong>Viewers</strong> can see progress reports but cannot make changes</li>
              <li>• Collaborators will receive an email invitation to join</li>
              <li>• You can change roles or remove access at any time</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}