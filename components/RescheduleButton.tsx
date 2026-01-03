'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface RescheduleButtonProps {
  lessonId: string;
  currentDate: string | null;
  onRescheduleComplete: () => void;
}

export default function RescheduleButton({
  lessonId,
  currentDate,
  onRescheduleComplete
}: RescheduleButtonProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newDate, setNewDate] = useState(currentDate || '');
  const [loading, setLoading] = useState(false);

  async function handleReschedule() {
    if (!newDate) {
      alert('Please select a date');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('lessons')
        .update({ lesson_date: newDate })
        .eq('id', lessonId);

      if (error) throw error;

      setShowDatePicker(false);
      onRescheduleComplete();
    } catch (error) {
      console.error('Error rescheduling lesson:', error);
      alert('Failed to reschedule. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDatePicker(!showDatePicker)}
        className="text-sm text-blue-600 hover:text-blue-800 underline"
      >
        Reschedule
      </button>

      {showDatePicker && (
        <div className="absolute right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-10 min-w-[250px]">
          <label className="block text-sm font-medium mb-2">
            New Date:
          </label>
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="w-full p-2 border rounded mb-3"
          />
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowDatePicker(false)}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleReschedule}
              disabled={loading}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}