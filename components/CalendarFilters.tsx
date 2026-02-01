// components/CalendarFilters.tsx
'use client'

interface CalendarFiltersProps {
  filters: {
    showLessons: boolean
    showSocialEvents: boolean
    showCoopClasses: boolean
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
    onChange({
      ...filters,
      [key]: !filters[key]
    })
  }

  const filterOptions = [
    {
      key: 'showLessons' as const,
      label: 'Lessons',
      icon: '📚',
      color: 'blue',
      count: counts?.lessons || 0
    },
    {
      key: 'showSocialEvents' as const,
      label: 'Social Events',
      icon: '🎉',
      color: 'purple',
      count: counts?.socialEvents || 0
    },
    {
      key: 'showCoopClasses' as const,
      label: 'Co-op Classes',
      icon: '🏫',
      color: 'green',
      count: counts?.coopClasses || 0
    },
    {
      key: 'showManualAttendance' as const,
      label: 'Attendance',
      icon: '✓',
      color: 'gray',
      count: counts?.manualAttendance || 0
    }
  ]

  const getColorClasses = (color: string, isActive: boolean) => {
    const colors = {
      blue: isActive 
        ? 'bg-blue-100 border-blue-500 text-blue-700' 
        : 'bg-white border-gray-200 text-gray-400 hover:border-blue-300',
      purple: isActive 
        ? 'bg-purple-100 border-purple-500 text-purple-700' 
        : 'bg-white border-gray-200 text-gray-400 hover:border-purple-300',
      green: isActive 
        ? 'bg-green-100 border-green-500 text-green-700' 
        : 'bg-white border-gray-200 text-gray-400 hover:border-green-300',
      gray: isActive 
        ? 'bg-gray-100 border-gray-500 text-gray-700' 
        : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
    }
    return colors[color as keyof typeof colors]
  }

  const allEnabled = Object.values(filters).every(v => v)
  const allDisabled = Object.values(filters).every(v => !v)

  const toggleAll = () => {
    const newState = !allEnabled
    onChange({
      showLessons: newState,
      showSocialEvents: newState,
      showCoopClasses: newState,
      showManualAttendance: newState
    })
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
          Calendar Filters
        </h3>
        <button
          onClick={toggleAll}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          {allEnabled ? 'Hide All' : 'Show All'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {filterOptions.map(option => {
          const isActive = filters[option.key]
          
          return (
            <button
              key={option.key}
              onClick={() => toggleFilter(option.key)}
              className={`
                relative p-3 rounded-lg border-2 transition-all text-left
                ${getColorClasses(option.color, isActive)}
                ${isActive ? 'shadow-sm' : ''}
              `}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{option.icon}</span>
                <span className="text-xs font-bold">{option.label}</span>
              </div>
              <div className={`text-xl font-bold ${isActive ? '' : 'text-gray-300'}`}>
                {option.count}
              </div>
              
              {/* Active indicator */}
              {isActive && (
                <div className="absolute top-2 right-2 w-2 h-2 bg-current rounded-full"></div>
              )}
            </button>
          )
        })}
      </div>

      {allDisabled && (
        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700 text-center">
          ⚠️ All filters are disabled. Enable at least one to see activities.
        </div>
      )}
    </div>
  )
}