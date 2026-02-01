// ============================================================================
// Proficiency Components
// Reusable UI components for displaying proficiency levels and coverage
// ============================================================================

'use client';
import type { ProficiencyLevel } from '@/src/types/standards';
import { useState } from 'react';
import { StandardsPicker } from '@/components/StandardsPicker';

export default function TestPage() {
  const [open, setOpen] = useState(false);
  
  return (
    <div>
      <button onClick={() => setOpen(true)}>Test Picker</button>
      <StandardsPicker
        isOpen={open}
        onClose={() => setOpen(false)}
        onSelect={(standards) => console.log(standards)}
      />
    </div>
  );
}

// ============================================================================
// PROFICIENCY BADGE
// ============================================================================

interface ProficiencyBadgeProps {
  level: ProficiencyLevel;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function ProficiencyBadge({
  level,
  size = 'md',
  showLabel = true,
}: ProficiencyBadgeProps) {
  const config = {
    not_started: {
      label: 'Not Started',
      color: 'bg-gray-100 text-gray-700 border-gray-300',
      icon: '○',
    },
    introduced: {
      label: 'Introduced',
      color: 'bg-blue-100 text-blue-700 border-blue-300',
      icon: '◐',
    },
    developing: {
      label: 'Developing',
      color: 'bg-amber-100 text-amber-700 border-amber-300',
      icon: '◑',
    },
    proficient: {
      label: 'Proficient',
      color: 'bg-green-100 text-green-700 border-green-300',
      icon: '◕',
    },
    mastered: {
      label: 'Mastered',
      color: 'bg-purple-100 text-purple-700 border-purple-300',
      icon: '●',
    },
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const { label, color, icon } = config[level];

  return (
    <span
      className={`
        inline-flex items-center gap-1 border rounded-full font-medium
        ${color}
        ${sizeClasses[size]}
      `}
    >
      <span>{icon}</span>
      {showLabel && <span>{label}</span>}
    </span>
  );
}

// ============================================================================
// PROFICIENCY SELECTOR
// ============================================================================

interface ProficiencySelectorProps {
  currentLevel: ProficiencyLevel;
  onChange: (level: ProficiencyLevel) => void;
  disabled?: boolean;
}

export function ProficiencySelector({
  currentLevel,
  onChange,
  disabled = false,
}: ProficiencySelectorProps) {
  const levels: ProficiencyLevel[] = [
    'not_started',
    'introduced',
    'developing',
    'proficient',
    'mastered',
  ];

  return (
    <div className="flex gap-2 flex-wrap">
      {levels.map((level) => (
        <button
          key={level}
          onClick={() => onChange(level)}
          disabled={disabled}
          className={`
            transition-all
            ${currentLevel === level ? 'ring-2 ring-blue-500' : ''}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
          `}
        >
          <ProficiencyBadge level={level} size="md" />
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// PROGRESS BAR
// ============================================================================

interface ProgressBarProps {
  value: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  color?: 'blue' | 'green' | 'amber' | 'purple';
  size?: 'sm' | 'md' | 'lg';
}

export function ProgressBar({
  value,
  label,
  showPercentage = true,
  color = 'blue',
  size = 'md',
}: ProgressBarProps) {
  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    amber: 'bg-amber-600',
    purple: 'bg-purple-600',
  };

  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  return (
    <div className="w-full">
      {(label || showPercentage) && (
        <div className="flex items-center justify-between mb-1">
          {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
          {showPercentage && (
            <span className="text-sm text-gray-600">{Math.round(value)}%</span>
          )}
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className={`${colorClasses[color]} ${sizeClasses[size]} rounded-full transition-all duration-300`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// COVERAGE DASHBOARD
// ============================================================================

interface CoverageDashboardProps {
  totalStandards: number;
  notStarted: number;
  introduced: number;
  developing: number;
  proficient: number;
  mastered: number;
  subject?: string;
  gradeLevel?: string;
}

export function CoverageDashboard({
  totalStandards,
  notStarted,
  introduced,
  developing,
  proficient,
  mastered,
  subject,
  gradeLevel,
}: CoverageDashboardProps) {
  const coveragePercentage = totalStandards > 0
    ? Math.round(((proficient + mastered) / totalStandards) * 100)
    : 0;

  const data = [
    { level: 'not_started' as const, count: notStarted, label: 'Not Started' },
    { level: 'introduced' as const, count: introduced, label: 'Introduced' },
    { level: 'developing' as const, count: developing, label: 'Developing' },
    { level: 'proficient' as const, count: proficient, label: 'Proficient' },
    { level: 'mastered' as const, count: mastered, label: 'Mastered' },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Standards Coverage</h3>
          {subject && gradeLevel && (
            <p className="text-sm text-gray-600 mt-1">
              {subject} • Grade {gradeLevel}
            </p>
          )}
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-gray-900">{coveragePercentage}%</div>
          <div className="text-sm text-gray-600">Coverage</div>
        </div>
      </div>

      {/* Overall Progress Bar */}
      <ProgressBar
        value={coveragePercentage}
        label="Overall Progress"
        color="blue"
        size="lg"
      />

      {/* Breakdown */}
      <div className="mt-6 space-y-3">
        {data.map(({ level, count, label }) => (
          <div key={level} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ProficiencyBadge level={level} size="sm" showLabel={false} />
              <span className="text-sm text-gray-700">{label}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-900">{count}</span>
              <div className="w-32">
                <ProgressBar
                  value={totalStandards > 0 ? (count / totalStandards) * 100 : 0}
                  showPercentage={false}
                  color="blue"
                  size="sm"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Total Standards</span>
          <span className="font-medium text-gray-900">{totalStandards}</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// STANDARDS LIST WITH PROFICIENCY
// ============================================================================

interface StandardWithProficiency {
  id: string;
  standard_code: string;
  description: string;
  domain?: string;
  proficiency_level: ProficiencyLevel;
}

interface StandardsListProps {
  standards: StandardWithProficiency[];
  onUpdateProficiency?: (standardId: string, level: ProficiencyLevel) => void;
  showDomain?: boolean;
  editable?: boolean;
}

export function StandardsList({
  standards,
  onUpdateProficiency,
  showDomain = true,
  editable = true,
}: StandardsListProps) {
  return (
    <div className="space-y-3">
      {standards.map((standard) => (
        <div
          key={standard.id}
          className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="font-medium text-gray-900">{standard.standard_code}</div>
              <div className="text-sm text-gray-600 mt-1">{standard.description}</div>
              {showDomain && standard.domain && (
                <div className="text-xs text-gray-500 mt-2">
                  Domain: {standard.domain}
                </div>
              )}
            </div>
            <div className="flex-shrink-0">
              {editable && onUpdateProficiency ? (
                <ProficiencySelector
                  currentLevel={standard.proficiency_level}
                  onChange={(level) => onUpdateProficiency(standard.id, level)}
                />
              ) : (
                <ProficiencyBadge level={standard.proficiency_level} />
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// COMPACT COVERAGE SUMMARY (for cards/lists)
// ============================================================================

interface CompactCoverageSummaryProps {
  coveragePercentage: number;
  proficientCount: number;
  totalCount: number;
  subject: string;
}

export function CompactCoverageSummary({
  coveragePercentage,
  proficientCount,
  totalCount,
  subject,
}: CompactCoverageSummaryProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div>
        <div className="text-sm font-medium text-gray-900">{subject}</div>
        <div className="text-xs text-gray-600 mt-0.5">
          {proficientCount} of {totalCount} proficient
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-right">
          <div className="text-lg font-bold text-gray-900">{coveragePercentage}%</div>
        </div>
        <div className="w-20">
          <ProgressBar
            value={coveragePercentage}
            showPercentage={false}
            color="green"
            size="md"
          />
        </div>
      </div>
    </div>
  );
}