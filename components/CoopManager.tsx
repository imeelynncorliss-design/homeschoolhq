'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import moment from 'moment'

interface CoopManagerProps {
  userId: string
}

interface CoopClass {
  id: string
  coop_id: string
  class_name: string
  subject: string
  teacher_id: string
  teacher_name: string
  day_of_week: string
  start_time: string
  end_time: string
  max_students?: number
  supply_list?: string
  location: string
  enrolled_count?: number
}

interface Coop {
  id: string
  name: string
  description: string
  created_by: string
  is_admin: boolean
}

export default function CoopManager({ userId }: CoopManagerProps) {
  const [loading, setLoading] = useState(true)
  const [coops, setCoops] = useState<Coop[]>([])
  const [selectedCoop, setSelectedCoop] = useState<string>('')
  const [classes, setClasses] = useState<CoopClass[]>([])
  const [showCreateCoop, setShowCreateCoop] = useState(false)
  const [showCreateClass, setShowCreateClass] = useState(false)
  const [view, setView] = useState<'classes' | 'attendance' | 'supplies'>('classes')

  const [coopForm, setCoopForm] = useState({
    name: '',
    description: '',
    location: ''
  })

  const [classForm, setClassForm] = useState({
    class_name: '',
    subject: '',
    day_of_week: 'Monday',
    start_time: '',
    end_time: '',
    max_students: '',
    supply_list: '',
    location: ''
  })

  useEffect(() => {
    loadCoops()
  }, [userId])

  useEffect(() => {
    if (selectedCoop) {
      loadClasses()
    }
  }, [selectedCoop])

  const loadCoops = async () => {
    const { data, error } = await supabase
      .from('coops')
      .select(`
        *,
        coop_members!inner(user_id, role)
      `)
      .eq('coop_members.user_id', userId)

    if (data) {
      const coopsWithRoles = data.map(coop => ({
        ...coop,
        is_admin: coop.coop_members[0]?.role === 'admin'
      }))
      setCoops(coopsWithRoles)
      if (coopsWithRoles.length > 0) {
        setSelectedCoop(coopsWithRoles[0].id)
      }
    }
    setLoading(false)
  }

  const loadClasses = async () => {
    const { data } = await supabase
      .from('coop_classes')
      .select(`
        *,
        enrollments:class_enrollments(count)
      `)
      .eq('coop_id', selectedCoop)
      .order('day_of_week')
      .order('start_time')

    if (data) {
      setClasses(data.map(c => ({
        ...c,
        enrolled_count: c.enrollments[0]?.count || 0
      })))
    }
  }

  const createCoop = async () => {
    if (!coopForm.name) {
      alert('Please enter a co-op name')
      return
    }

    const { data: newCoop, error } = await supabase
      .from('coops')
      .insert([{
        name: coopForm.name,
        description: coopForm.description,
        location: coopForm.location,
        created_by: userId
      }])
      .select()
      .single()

    if (!error && newCoop) {
      // Add creator as admin member
      await supabase
        .from('coop_members')
        .insert([{
          coop_id: newCoop.id,
          user_id: userId,
          role: 'admin'
        }])

      setCoopForm({ name: '', description: '', location: '' })
      setShowCreateCoop(false)
      loadCoops()
    }
  }

  const createClass = async () => {
    if (!classForm.class_name || !selectedCoop) {
      alert('Please fill in required fields')
      return
    }

    const { data: profile } = await supabase.auth.getUser()
    
    const { error } = await supabase
      .from('coop_classes')
      .insert([{
        coop_id: selectedCoop,
        class_name: classForm.class_name,
        subject: classForm.subject,
        teacher_id: userId,
        teacher_name: profile.data.user?.user_metadata?.full_name || profile.data.user?.email || 'Teacher',
        day_of_week: classForm.day_of_week,
        start_time: classForm.start_time,
        end_time: classForm.end_time,
        max_students: classForm.max_students ? parseInt(classForm.max_students) : null,
        supply_list: classForm.supply_list,
        location: classForm.location
      }])

    if (!error) {
      setClassForm({
        class_name: '',
        subject: '',
        day_of_week: 'Monday',
        start_time: '',
        end_time: '',
        max_students: '',
        supply_list: '',
        location: ''
      })
      setShowCreateClass(false)
      loadClasses()
    }
  }

  const enrollInClass = async (classId: string) => {
    const { data: existing } = await supabase
      .from('class_enrollments')
      .select('*')
      .eq('class_id', classId)
      .eq('user_id', userId)
      .single()

    if (existing) {
      alert('You are already enrolled in this class')
      return
    }

    const { error } = await supabase
      .from('class_enrollments')
      .insert([{
        class_id: classId,
        user_id: userId
      }])

    if (!error) {
      loadClasses()
    }
  }

  const unenrollFromClass = async (classId: string) => {
    await supabase
      .from('class_enrollments')
      .delete()
      .eq('class_id', classId)
      .eq('user_id', userId)

    loadClasses()
  }

  if (loading) {
    return <div className="text-center py-8">Loading co-ops...</div>
  }

  const currentCoop = coops.find(c => c.id === selectedCoop)
  const isAdmin = currentCoop?.is_admin

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Co-op Manager</h2>
          <p className="text-gray-600">Organize classes, teachers, and schedules</p>
        </div>
        <button
          onClick={() => setShowCreateCoop(!showCreateCoop)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {showCreateCoop ? 'Cancel' : '+ Create Co-op'}
        </button>
      </div>

      {/* Create Co-op Form */}
      {showCreateCoop && (
        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
          <h3 className="font-semibold text-gray-900 mb-4">Create New Co-op</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Co-op Name *
              </label>
              <input
                type="text"
                value={coopForm.name}
                onChange={(e) => setCoopForm({ ...coopForm, name: e.target.value })}
                placeholder="Northside Homeschool Co-op"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={coopForm.description}
                onChange={(e) => setCoopForm({ ...coopForm, description: e.target.value })}
                placeholder="Weekly co-op meeting every Friday..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <input
                type="text"
                value={coopForm.location}
                onChange={(e) => setCoopForm({ ...coopForm, location: e.target.value })}
                placeholder="123 Community Center Rd"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
              />
            </div>
            <button
              onClick={createCoop}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium"
            >
              Create Co-op
            </button>
          </div>
        </div>
      )}

      {coops.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-6xl mb-4">🏫</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Co-ops Yet</h3>
          <p className="text-gray-600">Create or join a co-op to get started!</p>
        </div>
      ) : (
        <>
          {/* Co-op Selector */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Co-op
            </label>
            <select
              value={selectedCoop}
              onChange={(e) => setSelectedCoop(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
            >
              {coops.map(coop => (
                <option key={coop.id} value={coop.id}>
                  {coop.name} {coop.is_admin && '(Admin)'}
                </option>
              ))}
            </select>
          </div>

          {/* View Tabs */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setView('classes')}
              className={`flex-1 px-4 py-2 rounded transition-colors ${
                view === 'classes' ? 'bg-white shadow text-gray-900' : 'text-gray-600'
              }`}
            >
              📚 Classes
            </button>
            <button
              onClick={() => setView('supplies')}
              className={`flex-1 px-4 py-2 rounded transition-colors ${
                view === 'supplies' ? 'bg-white shadow text-gray-900' : 'text-gray-600'
              }`}
            >
              📋 Supply Lists
            </button>
          </div>

          {/* Classes View */}
          {view === 'classes' && (
            <div className="space-y-4">
              {isAdmin && (
                <button
                  onClick={() => setShowCreateClass(!showCreateClass)}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  {showCreateClass ? 'Cancel' : '+ Add Class'}
                </button>
              )}

              {/* Create Class Form */}
              {showCreateClass && (
                <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                  <h3 className="font-semibold text-gray-900 mb-4">Add New Class</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Class Name *
                      </label>
                      <input
                        type="text"
                        value={classForm.class_name}
                        onChange={(e) => setClassForm({ ...classForm, class_name: e.target.value })}
                        placeholder="Creative Writing"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Subject
                      </label>
                      <input
                        type="text"
                        value={classForm.subject}
                        onChange={(e) => setClassForm({ ...classForm, subject: e.target.value })}
                        placeholder="Language Arts"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Day of Week
                      </label>
                      <select
                        value={classForm.day_of_week}
                        onChange={(e) => setClassForm({ ...classForm, day_of_week: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                      >
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
                          <option key={day} value={day}>{day}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max Students
                      </label>
                      <input
                        type="number"
                        value={classForm.max_students}
                        onChange={(e) => setClassForm({ ...classForm, max_students: e.target.value })}
                        placeholder="Optional"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={classForm.start_time}
                        onChange={(e) => setClassForm({ ...classForm, start_time: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={classForm.end_time}
                        onChange={(e) => setClassForm({ ...classForm, end_time: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Supply List
                      </label>
                      <textarea
                        value={classForm.supply_list}
                        onChange={(e) => setClassForm({ ...classForm, supply_list: e.target.value })}
                        placeholder="Pencil, notebook, art supplies..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                        rows={3}
                      />
                    </div>
                  </div>
                  <button
                    onClick={createClass}
                    className="w-full mt-4 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-medium"
                  >
                    Add Class
                  </button>
                </div>
              )}

              {/* Classes List */}
              {classes.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-600">No classes yet. Add your first class!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {classes.map(cls => (
                    <div key={cls.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-bold text-gray-900 text-lg">{cls.class_name}</h4>
                          <p className="text-sm text-gray-600">{cls.subject}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium text-gray-700">
                            {cls.enrolled_count || 0}
                            {cls.max_students && `/${cls.max_students}`} students
                          </span>
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                        <div>👨‍🏫 Teacher: {cls.teacher_name}</div>
                        <div>📅 {cls.day_of_week}</div>
                        <div>🕐 {cls.start_time} - {cls.end_time}</div>
                        {cls.location && <div>📍 {cls.location}</div>}
                      </div>
                      <button
                        onClick={() => enrollInClass(cls.id)}
                        className="w-full px-4 py-2 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 font-medium"
                      >
                        Enroll
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Supply Lists View */}
          {view === 'supplies' && (
            <div className="space-y-3">
              {classes.filter(c => c.supply_list).map(cls => (
                <div key={cls.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-bold text-gray-900 mb-2">{cls.class_name}</h4>
                  <div className="text-sm text-gray-700 whitespace-pre-line">
                    {cls.supply_list}
                  </div>
                </div>
              ))}
              {classes.filter(c => c.supply_list).length === 0 && (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-600">No supply lists yet</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}