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

const PILL_STYLES = {
  lessons: {
    active:   { background: '#eff6ff', border: '1px solid #60a5fa', color: '#1d4ed8' },
    inactive: { background: '#ffffff', border: '1px solid #e5e7eb', color: '#9ca3af' },
    dot:      { active: '#3b82f6', inactive: '#d1d5db' },
  },
  attendance: {
    active:   { background: '#f9fafb', border: '1px solid #9ca3af', color: '#374151' },
    inactive: { background: '#ffffff', border: '1px solid #e5e7eb', color: '#9ca3af' },
    dot:      { active: '#6b7280', inactive: '#d1d5db' },
  },
}

export default function CalendarFilters({ filters, onChange, counts }: CalendarFiltersProps) {
  const toggleFilter = (key: keyof typeof filters) => {
    onChange({ ...filters, [key]: !filters[key] })
  }

  const allEnabled = Object.values(filters).every(v => v)
  const allDisabled = Object.values(filters).every(v => !v)

  const toggleAll = () => {
    const newState = !allEnabled
    onChange({ showLessons: newState, showManualAttendance: newState })
  }

  const filterOptions = [
    {
      key: 'showLessons' as const,
      label: 'Lessons',
      icon: '📚',
      styles: PILL_STYLES.lessons,
      count: counts?.lessons || 0,
    },
    {
      key: 'showManualAttendance' as const,
      label: 'Attendance',
      icon: '✓',
      styles: PILL_STYLES.attendance,
      count: counts?.manualAttendance || 0,
    },
  ]

  return (
    <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const }}>

      {/* Filter pills */}
      {filterOptions.map(option => {
        const isActive = filters[option.key]
        const pill = isActive ? option.styles.active : option.styles.inactive
        const dotColor = isActive ? option.styles.dot.active : option.styles.dot.inactive
        return (
          <button
            key={option.key}
            onClick={() => toggleFilter(option.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
              transition: 'all 0.15s', whiteSpace: 'nowrap', cursor: 'pointer',
              ...pill,
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: dotColor }} />
            <span>{option.icon} {option.label}</span>
            <span style={{ fontWeight: 700, color: isActive ? pill.color : '#d1d5db' }}>{option.count}</span>
          </button>
        )
      })}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Toggle all */}
      <button
        onClick={toggleAll}
        style={{ fontSize: 12, color: '#2563eb', fontWeight: 600, whiteSpace: 'nowrap', padding: '0 8px', background: 'none', border: 'none', cursor: 'pointer' }}
      >
        {allEnabled ? 'Hide All' : 'Show All'}
      </button>

      {/* Warning if all disabled */}
      {allDisabled && (
        <span style={{ fontSize: 12, color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', padding: '4px 8px', borderRadius: 999 }}>
          ⚠️ All filters off
        </span>
      )}
    </div>
  )
}
