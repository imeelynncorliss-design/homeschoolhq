// components/admin/VacationManager.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js'
import { VacationPeriod, VacationType } from '@/src/types/school-year';
import { Calendar, Trash2, Plus, Edit2 } from 'lucide-react';
import EnhancedVacationManager from '@/components/admin/EnhancedVacationManager'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface VacationManagerProps {
  organizationId: string;
}

export default function VacationManager({ organizationId }: VacationManagerProps) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const [vacations, setVacations] = useState<VacationPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingVacation, setEditingVacation] = useState<VacationPeriod | null>(null);


  // Form state
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [vacationType, setVacationType] = useState<VacationType>('vacation');
  const [notes, setNotes] = useState('');

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
      name,
      start_date: startDate,
      end_date: endDate,
      vacation_type: vacationType,
      notes: notes || null,
    };

    try {
      if (editingVacation) {
        // Update existing
        const { error } = await supabase
          .from('vacation_periods')
          .update(vacationData)
          .eq('id', editingVacation.id);

        if (error) throw error;
      } else {
        // Insert new
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

  const getVacationTypeColor = (type?: VacationType) => {
    switch (type) {
      case 'holiday':
        return 'bg-red-100 text-red-800';
      case 'break':
        return 'bg-blue-100 text-blue-800';
      case 'vacation':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Vacation & Break Schedule</h2>
          <p className="text-gray-600 mt-1">
            Manage your family's breaks, holidays, and vacation periods
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          Add Vacation Period
        </button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="mb-6 bg-white border rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">
            {editingVacation ? 'Edit Vacation Period' : 'Add New Vacation Period'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Winter Break, Family Vacation"
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Start Date *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">End Date *</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Type</label>
              <select
                value={vacationType}
                onChange={(e) => setVacationType(e.target.value as VacationType)}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value="vacation">Vacation</option>
                <option value="break">Break</option>
                <option value="holiday">Holiday</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional details..."
                rows={2}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
          </div>
          
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {editingVacation ? 'Update' : 'Save'}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Vacation List */}
      {vacations.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-2">No vacation periods scheduled yet</p>
          <p className="text-sm text-gray-500">
            Add breaks, holidays, and vacation periods to help with lesson planning
          </p>
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
                    <h3 className="font-semibold text-lg">{vacation.name}</h3>
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
                    <span className="font-medium">
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

      {/* Quick Stats */}
      {vacations.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium mb-2">Schedule Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-600">Total Breaks</div>
              <div className="text-lg font-semibold">{vacations.length}</div>
            </div>
            <div>
              <div className="text-gray-600">Total Days Off</div>
              <div className="text-lg font-semibold">
                {vacations.reduce(
                  (sum, v) => sum + calculateDays(v.start_date, v.end_date),
                  0
                )}
              </div>
            </div>
            <div>
              <div className="text-gray-600">Holidays</div>
              <div className="text-lg font-semibold">
                {vacations.filter((v) => v.vacation_type === 'holiday').length}
              </div>
            </div>
            <div>
              <div className="text-gray-600">Vacations</div>
              <div className="text-lg font-semibold">
                {vacations.filter((v) => v.vacation_type === 'vacation').length}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}