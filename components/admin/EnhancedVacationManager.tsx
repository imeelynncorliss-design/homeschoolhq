// components/admin/EnhancedVacationManager.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js'
import { Calendar, Trash2, Plus, Edit2 } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;


interface VacationPeriod {
  id: string;
  organization_id: string;
  name: string;
  start_date: string;
  end_date: string;
  vacation_type?: 'holiday' | 'break' | 'vacation' | 'other';
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface EnhancedVacationManagerProps {
  organizationId: string;
}

export default function EnhancedVacationManager({ organizationId }: EnhancedVacationManagerProps) {
    const supabase = createClient(supabaseUrl, supabaseKey);
  const [vacations, setVacations] = useState<VacationPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingVacation, setEditingVacation] = useState<VacationPeriod | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [refreshingHolidays, setRefreshingHolidays] = useState(false);
  const [endDate, setEndDate] = useState('');
  const [vacationType, setVacationType] = useState<'holiday' | 'break' | 'vacation' | 'other'>('vacation');
  const [notes, setNotes] = useState('');
  const [activeConfigId, setActiveConfigId] = useState<string | null>(null);

  
  useEffect(() => {
    const fetchConfig = async () => {
      const { data } = await supabase
        .from('school_year_configs') // Replace with your actual table name
        .select('id')
        .eq('organization_id', organizationId)
        .eq('is_active', true) // Assuming you have an "active" flag
        .single();
      
      if (data) setActiveConfigId(data.id);
    };
  
    fetchConfig();
    loadVacations();
  }, [organizationId]);

  useEffect(() => {
    loadVacations();
  }, [organizationId]);

  const loadVacations = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('vacation_periods')
      .select('*')
      .eq('organization_id', organizationId)
      .order('start_date', { ascending: true });

    if (data) {
      setVacations(data);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setName('');
    setStartDate('');
    setEndDate('');
    setVacationType('vacation');
    setNotes('');
    setEditingVacation(null);
    setShowAddForm(false);
  };

  const handleEdit = (vacation: VacationPeriod) => {
    setEditingVacation(vacation);
    setName(vacation.name);
    setStartDate(vacation.start_date);
    setEndDate(vacation.end_date);
    setVacationType(vacation.vacation_type || 'vacation');
    setNotes(vacation.notes || '');
    setShowAddForm(true);
  };

  const handleSave = async () => {
    if (!name || !startDate || !endDate) {
      alert('Please fill in all required fields');
      return;
    }

    const vacationData = {
      organization_id: organizationId,
      school_year_config_id: activeConfigId,
      name,
      start_date: startDate,
      end_date: endDate,
      vacation_type: vacationType,
      notes: notes || null,
    };

    try {
      if (editingVacation) {
        const { error } = await supabase
          .from('vacation_periods')
          .update(vacationData)
          .eq('id', editingVacation.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('vacation_periods')
          .insert(vacationData);
        if (error) throw error;
      }

      resetForm();
      loadVacations();
    } catch (error) {
      console.error('Error saving vacation:', error);
      alert('Failed to save vacation period. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this vacation period?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('vacation_periods')
        .delete()
        .eq('id', id);
      if (error) throw error;
      loadVacations();
    } catch (error) {
      console.error('Error deleting vacation:', error);
      alert('Failed to delete vacation period. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const calculateDays = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const refreshHolidays = async () => {
    setRefreshingHolidays(true);
    
    try {
      const currentYear = new Date().getFullYear();
      const response = await fetch('/api/fetch-holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: organizationId,
          startYear: currentYear
        })
      });
  
      if (!response.ok) throw new Error('Failed to fetch holidays');
      
      const { holidays, count } = await response.json();
      
      await supabase
        .from('vacation_periods')
        .delete()
        .eq('organization_id', organizationId)
        .eq('vacation_type', 'holiday')
        .gte('start_date', `${currentYear}-01-01`)
        .lte('start_date', `${currentYear + 1}-12-31`);
      
      const { error } = await supabase
        .from('vacation_periods')
        .insert(holidays);
          
      if (error) throw error;
      
      alert(`✅ ${count} US federal holidays added for ${currentYear}-${currentYear + 1}!`);
      loadVacations();
      
    } catch (error) {
      console.error('Error refreshing holidays:', error);
      alert('❌ Failed to refresh holidays. Please try again.');
    } finally {
      setRefreshingHolidays(false);
    }
  };

  const getVacationTypeColor = (type?: string) => {
    switch (type) {
      case 'holiday': return 'bg-red-100 text-red-800';
      case 'break': return 'bg-blue-100 text-blue-800';
      case 'vacation': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Calculate impact (from your old component)
  const totalVacationDays = vacations.reduce((sum, v) => 
    sum + calculateDays(v.start_date, v.end_date), 0
  );

  const calculateImpact = () => {
    const typicalSchoolDays = 180;
    const adjustedSchoolDays = typicalSchoolDays - totalVacationDays;
    const weeksOfSchool = Math.floor(adjustedSchoolDays / 5);
    
    return {
      schoolDays: adjustedSchoolDays,
      weeks: weeksOfSchool,
      percentReduced: Math.round((totalVacationDays / typicalSchoolDays) * 100)
    };
  };

  const impact = calculateImpact();

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-950">Vacation & Break Schedule</h2>
          <p className="text-gray-600 mt-1">
            Plan your breaks and see how they impact your schedule
          </p>
        </div>
        <div className="flex gap-3">
      <button
        onClick={refreshHolidays}
        disabled={refreshingHolidays}
        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {refreshingHolidays ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            Updating...
          </>
        ) : (
          <>
            <Calendar size={20} />
            Refresh US Holidays
          </>
        )}
      </button>
      <button
        onClick={() => setShowAddForm(true)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        <Plus size={20} />
        Add Vacation Period
      </button>
</div>
      </div>

      {/* Impact Summary - From your old component */}
      {totalVacationDays > 0 && (
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
      )}

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-slate-900">
            {editingVacation ? 'Edit Vacation Period' : 'Add New Vacation Period'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2 text-slate-900">Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Winter Break, Family Vacation"
                className="w-full px-4 py-2 border rounded-lg text-slate-950"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-900">Start Date *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg text-gray-900"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-900">End Date *</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg text-gray-900"
              />
            </div>
            
            {startDate && endDate && (
              <div className="md:col-span-2">
                <p className="text-sm text-gray-600">
                  Duration: <span className="font-semibold text-purple-600">
                    {calculateDays(startDate, endDate)} days
                  </span>
                </p>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-900">Type</label>
              <select
                value={vacationType}
                onChange={(e) => setVacationType(e.target.value as any)}
                className="w-full px-4 py-2 border rounded-lg text-gray-900"
              >
                <option value="vacation">Vacation</option>
                <option value="break">Break</option>
                <option value="holiday">Holiday</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2 text-slate-900">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional details..."
                rows={2}
                className="w-full px-4 py-2 border rounded-lg text-gray-900"
              />
            </div>
          </div>
          
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              {editingVacation ? 'Update' : 'Save'} Vacation Period
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-slate-900"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Vacation List */}
      {vacations.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-6xl mb-4">🏖️</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Vacations Planned</h3>
          <p className="text-gray-600 ">Add vacation periods to help with lesson planning</p>
        </div>
      ) : (
        <div className="space-y-3">
          {vacations.map((vacation) => (
            <div
              key={vacation.id}
              className="bg-white border rounded-lg p-4 hover:shadow-md transition"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg text-slate-900">{vacation.name}</h3>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getVacationTypeColor(
                        vacation.vacation_type
                      )}`}
                    >
                      {vacation.vacation_type || 'other'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Calendar size={16} />
                      {formatDate(vacation.start_date)} - {formatDate(vacation.end_date)}
                    </span>
                    <span className="font-medium text-purple-600">
                      {calculateDays(vacation.start_date, vacation.end_date)} days
                    </span>
                  </div>
                  
                  {vacation.notes && (
                    <p className="mt-2 text-sm text-gray-600">{vacation.notes}</p>
                  )}
                </div>
                
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(vacation)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                    title="Edit"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(vacation.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Planning Tips - From your old component */}
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
                <li>Lessons scheduled during vacations will be automatically skipped by the scheduler</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      {vacations.length > 0 && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-3 text-gray-900">Schedule Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-600">Total Breaks</div>
              <div className="text-lg font-semibold text-gray-900">{vacations.length}</div>
            </div>
            <div>
              <div className="text-gray-600">Total Days Off</div>
              <div className="text-lg font-semibold text-gray-900">
                {vacations.reduce(
                  (sum, v) => sum + calculateDays(v.start_date, v.end_date),
                  0
                )}
              </div>
            </div>
            <div>
              <div className="text-gray-600">Holidays</div>
              <div className="text-lg font-semibold text-gray-900">
                {vacations.filter((v) => v.vacation_type === 'holiday').length}
              </div>
            </div>
            <div>
              <div className="text-gray-600">Vacations</div>
              <div className="text-lg font-semibold text-gray-900">
                {vacations.filter((v) => v.vacation_type === 'vacation').length}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}