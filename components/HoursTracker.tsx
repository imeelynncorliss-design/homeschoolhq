'use client'

interface Lesson {
  id: string
  subject: string
  duration_minutes: number | null
  completed: boolean
}

interface HoursTrackerProps {
  lessons: Lesson[]
  childName: string
  photoUrl?: string | null
}

export default function HoursTracker({ lessons, childName, photoUrl }: HoursTrackerProps) {
  // Calculate total minutes and hours
  const totalMinutes = lessons.reduce((sum, lesson) => {
    return sum + (lesson.duration_minutes || 0)
  }, 0)
  
  const totalHours = (totalMinutes / 60).toFixed(1)
  
  // Calculate hours by subject
  const hoursBySubject: { [subject: string]: number } = {}
  
  lessons.forEach(lesson => {
    const subject = lesson.subject || 'Other'
    const minutes = lesson.duration_minutes || 0
    
    if (!hoursBySubject[subject]) {
      hoursBySubject[subject] = 0
    }
    hoursBySubject[subject] += minutes
  })
  
  // Convert to hours and sort by hours (descending)
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
      
      {/* Total Hours */}
      <div className="bg-blue-50 rounded-lg p-4 mb-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-600">{totalHours} hrs</div>
          <div className="text-sm text-gray-600">({totalMinutes} minutes total)</div>
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