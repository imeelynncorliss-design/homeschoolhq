'use client'

interface Lesson {
  id: string
  subject: string
  duration_minutes: number | null
  status: 'not_started' | 'in_progress' | 'completed'
}

interface HoursTrackerProps {
  lessons: Lesson[]
  childName: string
  photoUrl?: string | null
}

export default function HoursTracker({ lessons, childName, photoUrl }: HoursTrackerProps) {
  // Calculate minutes by status
  const minutesInProgress = lessons
    .filter(lesson => lesson.status === 'in_progress')
    .reduce((sum, lesson) => sum + (lesson.duration_minutes || 0), 0)
  
  const minutesCompleted = lessons
    .filter(lesson => lesson.status === 'completed')
    .reduce((sum, lesson) => sum + (lesson.duration_minutes || 0), 0)
  
  const totalMinutes = minutesInProgress + minutesCompleted
  
  const hoursInProgress = (minutesInProgress / 60).toFixed(1)
  const hoursCompleted = (minutesCompleted / 60).toFixed(1)
  const totalHours = (totalMinutes / 60).toFixed(1)
  
  // Calculate hours by subject (unchanged)
  const hoursBySubject: { [subject: string]: number } = {}
  
  // NEW - only count in_progress and completed lessons
lessons.forEach(lesson => {
  // Only count lessons that are in progress or completed
  if (lesson.status === 'in_progress' || lesson.status === 'completed') {
    const subject = lesson.subject || 'Other'
    const minutes = lesson.duration_minutes || 0
    
    if (!hoursBySubject[subject]) {
      hoursBySubject[subject] = 0
    }
    hoursBySubject[subject] += minutes
  }
})
  
  const subjectHours = Object.entries(hoursBySubject)
    .map(([subject, minutes]) => ({
      subject,
      hours: (minutes / 60).toFixed(1),
      minutes
    }))
    .sort((a, b) => b.minutes - a.minutes)
  
  if (totalMinutes === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          {photoUrl && (
            <img 
              src={photoUrl} 
              alt={childName}
              className="w-16 h-16 rounded-full object-cover"
            />
          )}
          <h3 className="text-lg font-bold text-gray-900">
            📊 Hours Tracked for {childName}
          </h3>
        </div>
        <p className="text-gray-600">No hours tracked yet. Add lesson durations to see totals!</p>
      </div>
    )
  }
  
  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex items-center gap-4 mb-4">
        {photoUrl && (
          <img 
            src={photoUrl} 
            alt={childName}
            className="w-16 h-16 rounded-full object-cover"
          />
        )}
        <h3 className="text-lg font-bold text-gray-900">
          📊 Hours Tracked for {childName}
        </h3>
      </div>
      
      {/* Total Hours with Breakdown */}
      <div className="bg-blue-50 rounded-lg p-4 mb-4">
        <div className="text-center mb-3">
          <div className="text-3xl font-bold text-blue-600">{totalHours} hrs</div>
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>In Progress:</span>
            <span className="font-medium">{hoursInProgress} hrs ({minutesInProgress} min)</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Completed:</span>
            <span className="font-medium">{hoursCompleted} hrs ({minutesCompleted} min)</span>
          </div>
          <div className="border-t border-blue-200 pt-1 flex justify-between text-gray-800">
            <span className="font-semibold">Total:</span>
            <span className="font-semibold">{totalHours} hrs ({totalMinutes} min)</span>
          </div>
        </div>
      </div>
      
      {/* Hours by Subject */}
      <div className="space-y-2">
        <h4 className="font-semibold text-gray-700 text-sm mb-3">By Subject:</h4>
        {subjectHours.map(({ subject, hours, minutes }) => (
          <div key={subject} className="flex justify-between items-center bg-gray-50 rounded p-3">
            <span className="text-gray-900 font-medium">{subject}</span>
            <span className="text-blue-600 font-semibold">{hours} hrs ({minutes} min)</span>
          </div>
        ))}
      </div>
    </div>
  )
}