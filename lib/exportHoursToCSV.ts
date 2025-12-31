// Utility to export hours tracking data to CSV for state compliance

interface LessonData {
    id: string;
    child_id: string;
    child_name: string;
    subject: string;
    title: string;
    date: string;
    duration: number; // in minutes
    status: 'not_started' | 'in_progress' | 'completed';
    completed_at?: string;
    actual_hours?: number; // actual time spent if different from duration
  }
  
  interface ExportOptions {
    childName: string;
    startDate?: string;
    endDate?: string;
    format?: 'detailed' | 'summary';
  }
  
  /**
   * Convert lessons data to CSV format
   */
  export function exportHoursToCSV(lessons: LessonData[], options: ExportOptions): void {
    const { childName, startDate, endDate, format = 'detailed' } = options;
    
    // Filter lessons by date range if provided
    let filteredLessons = lessons;
    if (startDate || endDate) {
      filteredLessons = lessons.filter(lesson => {
        const lessonDate = new Date(lesson.date);
        const start = startDate ? new Date(startDate) : new Date(0);
        const end = endDate ? new Date(endDate) : new Date();
        return lessonDate >= start && lessonDate <= end;
      });
    }
  
    if (format === 'detailed') {
      exportDetailedCSV(filteredLessons, childName);
    } else {
      exportSummaryCSV(filteredLessons, childName);
    }
  }
  
  /**
   * Export detailed view: one row per lesson
   */
  function exportDetailedCSV(lessons: LessonData[], childName: string): void {
    // CSV headers
    const headers = [
      'Child Name',
      'Subject',
      'Lesson Title',
      'Scheduled Date',
      'Status',
      'Planned Duration (minutes)',
      'Planned Duration (hours)',
      'Actual Time Spent (minutes)',
      'Actual Time Spent (hours)',
      'Completed Date'
    ];
  
    // Convert lessons to CSV rows
    const rows = lessons.map(lesson => {
      const plannedMinutes = lesson.duration || 0;
      const plannedHours = (plannedMinutes / 60).toFixed(2);
      const actualMinutes = lesson.actual_hours ? lesson.actual_hours * 60 : plannedMinutes;
      const actualHours = (actualMinutes / 60).toFixed(2);
      
      return [
        escapeCSV(lesson.child_name || childName),
        escapeCSV(lesson.subject),
        escapeCSV(lesson.title),
        formatDate(lesson.date),
        capitalizeStatus(lesson.status),
        plannedMinutes.toString(),
        plannedHours,
        lesson.status === 'completed' ? actualMinutes.toString() : '',
        lesson.status === 'completed' ? actualHours : '',
        lesson.completed_at ? formatDate(lesson.completed_at) : ''
      ];
    });
  
    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
  
    // Download file
    downloadCSV(csvContent, `${childName}_hours_detailed_${getCurrentDateString()}.csv`);
  }
  
  /**
   * Export summary view: aggregated by subject
   */
  function exportSummaryCSV(lessons: LessonData[], childName: string): void {
    // Group lessons by subject
    const subjectSummary: Record<string, {
      totalPlannedMinutes: number;
      totalCompletedMinutes: number;
      completedLessons: number;
      totalLessons: number;
    }> = {};
  
    lessons.forEach(lesson => {
      if (!subjectSummary[lesson.subject]) {
        subjectSummary[lesson.subject] = {
          totalPlannedMinutes: 0,
          totalCompletedMinutes: 0,
          completedLessons: 0,
          totalLessons: 0
        };
      }
  
      const summary = subjectSummary[lesson.subject];
      summary.totalLessons++;
      summary.totalPlannedMinutes += lesson.duration || 0;
  
      if (lesson.status === 'completed') {
        summary.completedLessons++;
        const actualTime = lesson.actual_hours ? lesson.actual_hours * 60 : lesson.duration || 0;
        summary.totalCompletedMinutes += actualTime;
      }
    });
  
    // CSV headers
    const headers = [
      'Child Name',
      'Subject',
      'Total Lessons',
      'Completed Lessons',
      'Total Planned Hours',
      'Total Completed Hours',
      'Completion %'
    ];
  
    // Convert summary to CSV rows
    const rows = Object.entries(subjectSummary).map(([subject, data]) => {
      const plannedHours = (data.totalPlannedMinutes / 60).toFixed(2);
      const completedHours = (data.totalCompletedMinutes / 60).toFixed(2);
      const completionPercent = ((data.completedLessons / data.totalLessons) * 100).toFixed(1);
  
      return [
        escapeCSV(childName),
        escapeCSV(subject),
        data.totalLessons.toString(),
        data.completedLessons.toString(),
        plannedHours,
        completedHours,
        completionPercent + '%'
      ];
    });
  
    // Add totals row
    const totalPlannedMinutes = Object.values(subjectSummary).reduce((sum, s) => sum + s.totalPlannedMinutes, 0);
    const totalCompletedMinutes = Object.values(subjectSummary).reduce((sum, s) => sum + s.totalCompletedMinutes, 0);
    const totalLessons = Object.values(subjectSummary).reduce((sum, s) => sum + s.totalLessons, 0);
    const totalCompleted = Object.values(subjectSummary).reduce((sum, s) => sum + s.completedLessons, 0);
  
    rows.push([
      'TOTAL',
      '',
      totalLessons.toString(),
      totalCompleted.toString(),
      (totalPlannedMinutes / 60).toFixed(2),
      (totalCompletedMinutes / 60).toFixed(2),
      ((totalCompleted / totalLessons) * 100).toFixed(1) + '%'
    ]);
  
    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
  
    // Download file
    downloadCSV(csvContent, `${childName}_hours_summary_${getCurrentDateString()}.csv`);
  }
  
  /**
   * Utility functions
   */
  
  function escapeCSV(value: string): string {
    if (!value) return '';
    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
  
  function formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US');
  }
  
  function capitalizeStatus(status: string): string {
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  function getCurrentDateString(): string {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }
  
  function downloadCSV(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }