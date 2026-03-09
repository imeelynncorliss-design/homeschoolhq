// components/CalendarFilters.tsx
'use client'

interface CalendarFiltersProps {
  filters: {
    showLessons: boolean
    showManualAttendance: boolean
  }
  onChange: (filters: any) => void
  counts?: {
    lessons: number
    socialEvents: number
    coopClasses: number
    manualAttendance: number
  }
}

export default function CalendarFilters({ filters, onChange, counts }: CalendarFiltersProps) {
  const toggleFilter = (key: keyof typeof filters) => {
    onChange({ ...filters, [key]: !filters[key] })
  }

  const allEnabled = Object.values(filters).every(v => v)
  const allDisabled = Object.values(filters).every(v => !v)

  const toggleAll = () => {
    const newState = !allEnabled
    onChange({
      showLessons: newState,
      showManualAttendance: newState
    })
  }

  const filterOptions = [
    {
      key: 'showLessons' as const,
      label: 'Lessons',
      icon: '📚',
      dotColor: 'bg-blue-500',
      activeClasses: 'bg-blue-50 border-blue-400 text-blue-700',
      inactiveClasses: 'bg-white border-gray-200 text-gray-400 hover:border-blue-300',
      count: counts?.lessons || 0
    },
    {
      key: 'showManualAttendance' as const,
      label: 'Attendance',
      icon: '✓',
      dotColor: 'bg-gray-500',
      activeClasses: 'bg-gray-50 border-gray-400 text-gray-700',
      inactiveClasses: 'bg-white border-gray-200 text-gray-400 hover:border-gray-300',
      count: counts?.manualAttendance || 0
    }
  ]

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-3 py-2 flex items-center gap-2 flex-wrap">
      
      {/* Filter pills */}
      {filterOptions.map(option => {
        const isActive = filters[option.key]
        return (
          <button
            key={option.key}
            onClick={() => toggleFilter(option.key)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold
              transition-all whitespace-nowrap
              ${isActive ? option.activeClasses : option.inactiveClasses}
            `}
          >
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? option.dotColor : 'bg-gray-300'}`} />
            <span>{option.icon} {option.label}</span>
            <span className={`font-bold ${isActive ? '' : 'text-gray-300'}`}>{option.count}</span>
          </button>
        )
      })}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Toggle all */}
      <button
        onClick={toggleAll}
        className="text-xs text-blue-600 hover:text-blue-800 font-semibold whitespace-nowrap px-2"
      >
        {allEnabled ? 'Hide All' : 'Show All'}
      </button>

      {/* Warning if all disabled */}
      {allDisabled && (
        <span className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 px-2 py-1 rounded-full">
          ⚠️ All filters off
        </span>
      )}
    </div>
  )
}