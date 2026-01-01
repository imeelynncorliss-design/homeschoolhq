'use client';

import { useState } from 'react';
import { exportHoursToCSV } from '@/lib/exportHoursToCSV';

interface ExportHoursButtonProps {
  childId: string;
  childName: string;
  lessons: any[]; // Pass lessons directly instead of fetching
  onExport?: () => void;
}

export default function ExportHoursButton({ childId, childName, lessons, onExport }: ExportHoursButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [exportFormat, setExportFormat] = useState<'detailed' | 'summary'>('detailed');
  const [dateRange, setDateRange] = useState<'all' | 'thisMonth' | 'thisYear' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      // Get date range
      let startDate: string | undefined;
      let endDate: string | undefined;

      const now = new Date();
      
      switch (dateRange) {
        case 'thisMonth':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
          break;
        case 'thisYear':
          startDate = new Date(now.getFullYear(), 0, 1).toISOString();
          endDate = new Date(now.getFullYear(), 11, 31).toISOString();
          break;
        case 'custom':
          startDate = customStartDate ? new Date(customStartDate).toISOString() : undefined;
          endDate = customEndDate ? new Date(customEndDate).toISOString() : undefined;
          break;
        case 'all':
        default:
          // No date filtering
          break;
      }

      // Filter lessons by date range if provided
      let filteredLessons = lessons;
      if (startDate || endDate) {
        filteredLessons = lessons.filter(lesson => {
          if (!lesson.date) return false;
          const lessonDate = new Date(lesson.date);
          const start = startDate ? new Date(startDate) : new Date(0);
          const end = endDate ? new Date(endDate) : new Date();
          return lessonDate >= start && lessonDate <= end;
        });
      }

      if (!filteredLessons || filteredLessons.length === 0) {
        alert('No lessons found for the selected date range.');
        setIsExporting(false);
        return;
      }

      // Transform data to match export format
      const transformedLessons = filteredLessons.map(lesson => ({
        id: lesson.id,
        child_id: childId,
        child_name: childName,
        subject: lesson.subject,
        title: lesson.title || 'Untitled Lesson',
        date: lesson.date,
        duration: lesson.duration_minutes || 0,
        status: lesson.status,
        completed_at: lesson.completed_at,
        actual_hours: lesson.duration_minutes ? lesson.duration_minutes / 60 : undefined
      }));

      // Export to CSV
      exportHoursToCSV(transformedLessons, {
        childName,
        startDate,
        endDate,
        format: exportFormat
      });

      setShowOptions(false);
      onExport?.();
      
    } catch (error) {
      console.error('Export error:', error);
      alert('An error occurred while exporting. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowOptions(!showOptions)}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        disabled={isExporting}
      >
        <svg 
          className="w-5 h-5" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
          />
        </svg>
        {isExporting ? 'Exporting...' : 'Report Hours'}
      </button>

      {/* Export Options Modal */}
      {showOptions && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Export Options</h3>
          
          {/* Export Format */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Export Format
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="format"
                  value="detailed"
                  checked={exportFormat === 'detailed'}
                  onChange={(e) => setExportFormat(e.target.value as 'detailed')}
                  className="mr-2"
                />
                <span className="text-sm text-gray-900">Detailed (one row per lesson)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="format"
                  value="summary"
                  checked={exportFormat === 'summary'}
                  onChange={(e) => setExportFormat(e.target.value as 'summary')}
                  className="mr-2"
                />
                <span className="text-sm text-gray-900">Summary (totals by subject)</span>
              </label>
            </div>
          </div>

          {/* Date Range */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Date Range
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="all">All Time</option>
              <option value="thisMonth">This Month</option>
              <option value="thisYear">This Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Custom Date Range */}
          {dateRange === 'custom' && (
            <div className="mb-4 space-y-2">
              <div>
                <label className="block text-xs text-gray-800 mb-1 font-medium">Start Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-800 mb-1 font-medium">End Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium disabled:bg-gray-400"
            >
              {isExporting ? 'Exporting...' : 'Export CSV'}
            </button>
            <button
              onClick={() => setShowOptions(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
          </div>

          {/* Info Text */}
          <p className="mt-3 text-xs text-gray-500">
            CSV file will download automatically and can be opened in Excel or Google Sheets.
          </p>
        </div>
      )}
    </div>
  );
}