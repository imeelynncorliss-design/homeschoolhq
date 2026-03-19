'use client'

interface ResolveAttendanceModalProps {
  date: string
  attendanceHours: number
  attendanceStatus: string
  onDelete: (date: string) => Promise<void>
  onDismiss: () => void
  onClose: () => void
}

export default function ResolveAttendanceModal({
  date,
  attendanceHours,
  attendanceStatus,
  onDelete,
  onDismiss,
  onClose
}: ResolveAttendanceModalProps) {
  const [yearStr, monthStr, dayStr] = date.split('-')
  const dayNum = parseInt(dayStr)
  const year = parseInt(yearStr)
  const dateObj = new Date(parseInt(yearStr), parseInt(monthStr) - 1, parseInt(dayStr))
  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' })
  const monthName = dateObj.toLocaleDateString('en-US', { month: 'long' })

  const statusLabel =
    attendanceStatus === 'full_day' ? 'Full Day' :
    attendanceStatus === 'half_day' ? 'Half Day' : attendanceStatus

  async function handleDelete() {
    await onDelete(date)
    onClose()
  }

  function handleAddLesson() {
    window.location.href = `/lessons?date=${date}`
  }

  function handleLogActivity() {
    window.location.href = `/field-trips?date=${date}`
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">

        {/* ── Date header ── */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-500 p-6 text-white">
          <p className="text-sm font-medium text-purple-200 mb-1">{dayName}</p>
          <div className="flex items-end gap-3">
            <div className="text-6xl font-bold leading-none">{dayNum}</div>
            <div>
              <p className="text-xl font-semibold">{monthName}</p>
              <p className="text-purple-200">{year}</p>
            </div>
          </div>
        </div>

        {/* ── Attendance record ── */}
        <div className="p-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-5">
            <p className="text-sm font-semibold text-amber-800 mb-1">📋 Attendance logged for this day</p>
            <p className="text-sm text-amber-700">
              {statusLabel} · {attendanceHours}h recorded · No lessons found
            </p>
            <p className="text-xs text-amber-600 mt-2">
              What did you do that day? Add a lesson, log an activity (field trip, project, co-op), or mark it as reviewed if no record is needed.
            </p>
          </div>

          {/* ── Actions ── */}
          <div className="space-y-3">

            <button
              onClick={handleAddLesson}
              className="w-full py-3 px-4 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
            >
              📚 Add a lesson for this day
            </button>

            <button
              onClick={handleLogActivity}
              className="w-full py-3 px-4 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 transition-colors flex items-center justify-center gap-2"
            >
              🎯 Log an activity instead
              <span className="text-xs font-normal opacity-80">(field trip, project, co-op…)</span>
            </button>

            <button
              onClick={onDismiss}
              className="w-full py-3 px-4 bg-green-50 text-green-700 font-semibold rounded-xl hover:bg-green-100 border border-green-200 transition-colors flex items-center justify-center gap-2"
            >
              ✅ Mark as reviewed — no record needed
            </button>

            <button
              onClick={handleDelete}
              className="w-full py-3 px-4 bg-red-50 text-red-600 font-semibold rounded-xl hover:bg-red-100 border border-red-200 transition-colors flex items-center justify-center gap-2"
            >
              🗑️ Delete this attendance record
            </button>

            <button
              onClick={onClose}
              className="w-full py-3 px-4 text-gray-400 hover:text-gray-600 text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
