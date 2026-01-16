'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import moment from 'moment'

interface VacationPlannerProps {
  userId: string
}

interface VacationPeriod {
  id?: string
  user_id: string
  name: string
  start_date: string
  end_date: string
  days: number
}

export default function VacationPlanner({ userId }: VacationPlannerProps) {
  const [loading, setLoading] = useState(true)
  const [vacations, setVacations] = useState<VacationPeriod[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    start_date: '',
    end_date: ''
  })

  useEffect(() => {
    loadVacations()
  }, [userId])

  const loadVacations = async () => {
    const { data } = await supabase
      .from('vacation_periods')
      .select('*')
      .eq('user_id', userId)
      .order('start_date', { ascending: true })

    if (data) {
      setVacations(data)
    }
    setLoading(false)
  }

  const calculateDays = (start: string, end: string) => {
    if (!start || !end) return 0
    const startDate = moment(start)
    const endDate = moment(end)
    return endDate.diff(startDate, 'days') + 1
  }

  const addVacation = async () => {
    if (!formData.name || !formData.start_date || !formData.end_date) {
      alert('Please fill in all fields')
      return
    }

    const days = calculateDays(formData.start_date, formData.end_date)
    
    const { error } = await supabase
      .from('vacation_periods')
      .insert([{
        user_id: userId,
        name: formData.name,
        start_date: formData.start_date,
        end_date: formData.end_date,
        days
      }])

    if (!error) {
      setFormData({ name: '', start_date: '', end_date: '' })
      setShowForm(false)
      loadVacations()
    }
  }

  const deleteVacation = async (id: string) => {
    if (confirm('Delete this vacation period?')) {
      await supabase
        .from('vacation_periods')
        .delete()
        .eq('id', id)
      
      loadVacations()
    }
  }

  const totalVacationDays = vacations.reduce((sum, v) => sum + v.days, 0)

  // Calculate impact
  const calculateImpact = () => {
    // Assume 5-day school week, ~36 weeks in traditional school year
    const typicalSchoolDays = 180
    const adjustedSchoolDays = typicalSchoolDays - totalVacationDays
    const weeksOfSchool = Math.floor(adjustedSchoolDays / 5)
    
    return {
      schoolDays: adjustedSchoolDays,
      weeks: weeksOfSchool,
      percentReduced: Math.round((totalVacationDays / typicalSchoolDays) * 100)
    }
  }

  const impact = calculateImpact()

  if (loading) {
    return <div className="text-center py-8">Loading vacation planning...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Vacation Planner</h2>
          <p className="text-gray-600">Plan your breaks and see how they impact your schedule</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : '+ Add Vacation'}
        </button>
      </div>

      {/* Add Vacation Form */}
      {showForm && (
        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
          <h3 className="font-semibold text-gray-900 mb-4">Add New Vacation Period</h3>
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vacation Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Summer Break, Holiday"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
              />
            </div>
          </div>
          
          {formData.start_date && formData.end_date && (
            <p className="text-sm text-gray-600 mb-4">
              Duration: {calculateDays(formData.start_date, formData.end_date)} days
            </p>
          )}
          
          <button
            onClick={addVacation}
            className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-medium"
          >
            Add Vacation Period
          </button>
        </div>
      )}

      {/* Impact Summary */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg p-6 text-white">
        <h3 className="text-xl font-bold mb-4">📊 Vacation Impact on Schedule</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white/20 rounded-lg p-4">
            <div className="text-3xl font-bold mb-1">{totalVacationDays}</div>
            <div className="text-sm text-purple-100">Total Vacation Days</div>
          </div>
          <div className="bg-white/20 rounded-lg p-4">
            <div className="text-3xl font-bold mb-1">{impact.schoolDays}</div>
            <div className="text-sm text-purple-100">Adjusted School Days</div>
          </div>
          <div className="bg-white/20 rounded-lg p-4">
            <div className="text-3xl font-bold mb-1">{impact.weeks}</div>
            <div className="text-sm text-purple-100">Weeks of Learning</div>
          </div>
        </div>
      </div>

      {/* Vacation List */}
      {vacations.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-6xl mb-4">🏖️</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Vacations Planned</h3>
          <p className="text-gray-600">Add vacation periods to see how they impact your schedule</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">Planned Vacations</h3>
          {vacations.map((vacation) => (
            <div 
              key={vacation.id}
              className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between"
            >
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">{vacation.name}</h4>
                <p className="text-sm text-gray-600">
                  {moment(vacation.start_date).format('MMM D, YYYY')} - {moment(vacation.end_date).format('MMM D, YYYY')}
                  <span className="ml-2 text-purple-600 font-medium">({vacation.days} days)</span>
                </p>
              </div>
              <button
                onClick={() => deleteVacation(vacation.id!)}
                className="px-3 py-1 text-red-600 hover:bg-red-50 rounded"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {totalVacationDays > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <p className="font-semibold text-gray-900 mb-2">Planning Tips:</p>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                {impact.percentReduced > 20 && (
                  <li>With {impact.percentReduced}% of the year as vacation, consider increasing daily study time to stay on track</li>
                )}
                <li>Schedule important lessons before vacation periods</li>
                <li>Plan lighter "review" weeks immediately after breaks</li>
                <li>Consider scheduling vacations during natural curriculum breaks</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}