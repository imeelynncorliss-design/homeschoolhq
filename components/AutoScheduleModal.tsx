'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { DEFAULT_HOLIDAYS_2025_2026, Holiday, isValidSchoolDay } from '../app/utils/holidayUtils';

interface AutoScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  kidId: string;
  kidName?: string;
  subject?: string; // Optional: auto-schedule for specific subject only
  onScheduleComplete: () => void;
}

interface SchoolYearSettings {
  school_year_start: string;
  school_year_end: string;
  homeschool_days: string[];
}

export default function AutoScheduleModal({
  isOpen,
  onClose,
  kidId,
  kidName,
  subject,
  onScheduleComplete
}: AutoScheduleModalProps) {
  
  // State
  const [loading, setLoading] = useState(true);
  const [schoolYearSettings, setSchoolYearSettings] = useState<SchoolYearSettings | null>(null);
  const [holidays, setHolidays] = useState<Holiday[]>(DEFAULT_HOLIDAYS_2025_2026);
  const [skipWeekends, setSkipWeekends] = useState(true);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [editMode, setEditMode] = useState(false);
  
  // Form state for editing/creating school year
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'
  ]);

  const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Fetch school year settings on mount
  useEffect(() => {
    if (isOpen) {
      fetchSchoolYearSettings();
    }
  }, [isOpen]);

  async function fetchSchoolYearSettings() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('school_year_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.log('No school year settings found');
        setSchoolYearSettings(null);
        setEditMode(true); // Go straight to edit mode if no data
      } else {
        setSchoolYearSettings(data);
        setStartDate(data.school_year_start);
        setEndDate(data.school_year_end);
        setSelectedDays(data.homeschool_days || allDays);
        setShowConfirmation(true); // Show confirmation screen
      }
    } catch (error) {
      console.error('Error fetching school year:', error);
    } finally {
      setLoading(false);
    }
  }

  function toggleDay(day: string) {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  }

  function toggleHoliday(index: number) {
    setHolidays(prev => prev.map((h, i) => 
      i === index ? { ...h, enabled: !h.enabled } : h
    ));
  }

  async function generateSchedule() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Generate dates between start and end
      const start = new Date(startDate);
      const end = new Date(endDate);
      const validDates: string[] = [];

      let currentDate = new Date(start);
      while (currentDate <= end) {
        if (isValidSchoolDay(currentDate, selectedDays, holidays, skipWeekends)) {
          validDates.push(currentDate.toISOString().split('T')[0]);
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Get existing lessons that need to be scheduled
      const { data: lessons, error: fetchError } = await supabase
        .from('lessons')
        .select('*')
        .eq('kid_id', kidId)
        .is('lesson_date', null) // Only unscheduled lessons
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      if (!lessons || lessons.length === 0) {
        alert('No unscheduled lessons found!');
        setLoading(false);
        return;
      }

      // Filter by subject if specified
      const lessonsToSchedule = subject 
        ? lessons.filter(l => l.subject === subject)
        : lessons;

      // Assign dates to lessons
      const updates = lessonsToSchedule.map((lesson, index) => ({
        id: lesson.id,
        lesson_date: validDates[index % validDates.length] // Cycle through dates if more lessons than days
      }));

      // Update all lessons with their new dates
      for (const update of updates) {
        const { error: updateError } = await supabase
          .from('lessons')
          .update({ lesson_date: update.lesson_date })
          .eq('id', update.id);
        
        if (updateError) {
          console.error('Error updating lesson:', update.id, updateError);
        }
      }

      // Save school year settings if they don't exist
      if (!schoolYearSettings) {
        await supabase.from('school_year_settings').insert({
          user_id: user.id,
          school_year_start: startDate,
          school_year_end: endDate,
          homeschool_days: selectedDays,
          school_type: 'year-round' // Default
        });
      }

      alert(`Successfully scheduled ${updates.length} lessons!`);
      onScheduleComplete();
      onClose();
    } catch (error) {
      console.error('Error generating schedule:', error);
      alert('Failed to generate schedule. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <h2 className="text-2xl font-bold mb-4 text-gray-900">Auto-Schedule Lessons{kidName ? ` for ${kidName}` : ''}</h2>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : showConfirmation && !editMode ? (
          // Confirmation Screen
          <div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold mb-2 text-gray-900">Your School Year Settings:</h3>
             <p className="text-gray-900"><strong>Start:</strong> {new Date(startDate).toLocaleDateString()}</p>
             <p className="text-gray-900"><strong>End:</strong> {new Date(endDate).toLocaleDateString()}</p>
             <p className="text-gray-900"><strong>Homeschool Days:</strong> {selectedDays.join(', ')}</p>
          </div>

          <p className="mb-4 text-gray-900">Is this correct?</p>

            <div className="flex gap-2">
            <button onClick={() => setEditMode(true)}className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-gray-900">
            Edit Settings
            </button>
              <button
                onClick={() => setShowConfirmation(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Continue to Holidays
              </button>
            </div>
          </div>
        ) : editMode ? (
          // Edit/Create School Year Form
          <div>
            <div className="flex justify-between items-center mb-4">
      <h3 className="text-lg font-semibold text-gray-900">School Year Setup</h3>
      <button
        onClick={onClose}
        className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
      >
        ×
      </button>
    </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-gray-900">School Year Start</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2 border rounded text-gray-900"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-gray-900">School Year End</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2 border rounded text-gray-900"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-gray-900">Homeschool Days</label>
              <div className="flex flex-wrap gap-2">
                {allDays.map(day => (
                  <button
                    key={day}
                    onClick={() => toggleDay(day)}
                    className={`px-4 py-2 rounded ${
                      selectedDays.includes(day)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
      <button
      onClick={() => {
      setEditMode(false);
      setShowConfirmation(false);
     }}
      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
  >
    Continue
  </button>
  <button
    onClick={onClose}
    className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-gray-900"
  >
    Cancel
  </button>
</div>
          </div>
        ) : (
          // Holiday Selection Screen
          <div>
            <div className="flex justify-between items-center mb-4">
      <h3 className="text-lg font-semibold text-gray-900">Select Holidays</h3>
      <button
        onClick={onClose}
        className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
      >
        ×
      </button>
    </div>
            <div className="mb-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={skipWeekends}
                  onChange={(e) => setSkipWeekends(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-gray-900">Skip weekends automatically</span>
              </label>
            </div>

            <div className="mb-4">
              <h3 className="font-semibold mb-2 text-gray-900">Holidays to Skip:</h3>
              <div className="space-y-2">
                {holidays.map((holiday, index) => (
                  <label key={index} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={holiday.enabled}
                      onChange={() => toggleHoliday(index)}
                      className="w-4 h-4"
                    />
                    <span className="text-gray-900">
                      {holiday.name} 
                      <span className="text-sm text-gray-600 ml-2">
                        ({new Date(holiday.start).toLocaleDateString()}
                        {holiday.start !== holiday.end && 
                          ` - ${new Date(holiday.end).toLocaleDateString()}`})
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={generateSchedule}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
              >
                {loading ? 'Generating...' : 'Generate Schedule'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}