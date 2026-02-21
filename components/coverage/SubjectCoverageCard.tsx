import React from 'react'
import { SubjectCoverageData } from '../../hooks/useSubjectCoverage'

interface SubjectCoverageCardProps {
  data: SubjectCoverageData
  onTrackThreshold: number
}

const SUBJECT_COLORS: Record<string, { bar: string; bg: string; icon: string }> = {
  'English / Language Arts': { bar: 'bg-violet-500', bg: 'bg-violet-50', icon: 'Aa' },
  'Mathematics':             { bar: 'bg-blue-500',   bg: 'bg-blue-50',   icon: '∑' },
  'Science':                 { bar: 'bg-emerald-500',bg: 'bg-emerald-50',icon: '⚗' },
  'Social Studies':          { bar: 'bg-teal-500',   bg: 'bg-teal-50',   icon: '🌐' },
  'History':                 { bar: 'bg-amber-500',  bg: 'bg-amber-50',  icon: '⏳' },
  'North Carolina History':  { bar: 'bg-amber-400',  bg: 'bg-amber-50',  icon: '⏳' },
  'Virginia History':        { bar: 'bg-amber-400',  bg: 'bg-amber-50',  icon: '⏳' },
  'New York History':        { bar: 'bg-amber-400',  bg: 'bg-amber-50',  icon: '⏳' },
  'Art':                     { bar: 'bg-pink-500',   bg: 'bg-pink-50',   icon: '🎨' },
  'Music':                   { bar: 'bg-indigo-500', bg: 'bg-indigo-50', icon: '♪' },
  'Physical Education':      { bar: 'bg-orange-500', bg: 'bg-orange-50', icon: '🏃' },
  'Health':                  { bar: 'bg-red-400',    bg: 'bg-red-50',    icon: '♥' },
  'Foreign Language':        { bar: 'bg-cyan-500',   bg: 'bg-cyan-50',   icon: 'Bé' },
  'Spanish':                 { bar: 'bg-yellow-500', bg: 'bg-yellow-50', icon: 'Es' },
  'French':                  { bar: 'bg-blue-400',   bg: 'bg-blue-50',   icon: 'Fr' },
  'Bible / Religious Studies':{ bar: 'bg-yellow-400',bg: 'bg-yellow-50', icon: '✝' },
  'Computer Science':        { bar: 'bg-slate-500',  bg: 'bg-slate-50',  icon: '</>' },
  'Life Skills':             { bar: 'bg-lime-500',   bg: 'bg-lime-50',   icon: '✓' },
  'Logic':                   { bar: 'bg-purple-500', bg: 'bg-purple-50', icon: '∴' },
  'Geography':               { bar: 'bg-teal-400',   bg: 'bg-teal-50',   icon: '🗺' },
}

const DEFAULT_COLOR = { bar: 'bg-gray-400', bg: 'bg-gray-50', icon: '📚' }

function getStatusInfo(percentage: number, total: number, threshold: number) {
  if (total === 0) return { label: 'No lessons', color: 'text-gray-400' }
  if (percentage === 0) return { label: 'Not started', color: 'text-gray-400' }
  if (percentage === 100) return { label: 'Complete ✓', color: 'text-emerald-600' }
  if (percentage >= threshold) return { label: 'On track', color: 'text-blue-600' }
  if (percentage >= Math.round(threshold * 0.6)) return { label: 'In progress', color: 'text-amber-500' }
  return { label: 'Behind', color: 'text-red-500' }
}

export function SubjectCoverageCard({ data, onTrackThreshold }: SubjectCoverageCardProps) {
  const colors = SUBJECT_COLORS[data.subject] || DEFAULT_COLOR
  const { label: statusLabel, color: statusColor } = getStatusInfo(data.percentage, data.total, onTrackThreshold)
  const isEmpty = data.total === 0

  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md ${
        isEmpty ? 'opacity-60' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-8 h-8 shrink-0 rounded-lg ${colors.bg} flex items-center justify-center text-sm font-bold`}>
            {colors.icon}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 leading-tight truncate">{data.subject}</p>
            <p className={`text-xs font-medium ${statusColor}`}>{statusLabel}</p>
          </div>
        </div>
        <span className={`text-lg font-bold shrink-0 ml-2 ${statusColor}`}>
          {isEmpty ? '—' : `${data.percentage}%`}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${isEmpty ? 'bg-gray-200' : colors.bar}`}
          style={{ width: `${data.percentage}%` }}
        />
      </div>

      {/* Stats row */}
      {!isEmpty ? (
        <div className="flex justify-between text-xs text-gray-500">
          <span>
            <span className="font-semibold text-emerald-600">{data.completed}</span> done
          </span>
          {data.inProgress > 0 && (
            <span>
              <span className="font-semibold text-amber-500">{data.inProgress}</span> active
            </span>
          )}
          <span>
            <span className="font-semibold text-gray-700">{data.total}</span> total
          </span>
        </div>
      ) : (
        <p className="text-xs text-gray-400 text-center">No lessons scheduled</p>
      )}
    </div>
  )
}