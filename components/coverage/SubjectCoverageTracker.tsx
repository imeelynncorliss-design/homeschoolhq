'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useSubjectCoverage, useKids, useSchoolYearConfig } from '../../hooks/useSubjectCoverage'
import { SubjectCoverageCard } from '@/components/coverage/SubjectCoverageCard'

const ON_TRACK_PRESETS = [
  { label: 'Relaxed (50%)', value: 50 },
  { label: 'Standard (70%)', value: 70 },
  { label: 'Rigorous (85%)', value: 85 },
  { label: 'Custom', value: -1 },
]

export function SubjectCoverageTracker() {
  const { kids, loading: kidsLoading } = useKids()
  const { config: schoolYearConfig, loading: configLoading } = useSchoolYearConfig()

  const [selectedKidId, setSelectedKidId] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [showEmpty, setShowEmpty] = useState(false)
  const [sortBy, setSortBy] = useState<'subject' | 'percentage' | 'total'>('subject')

  // On-track threshold settings
  const [selectedPreset, setSelectedPreset] = useState<number>(70)
  const [customThreshold, setCustomThreshold] = useState<number>(70)
  const [showSettings, setShowSettings] = useState(false)

  const onTrackThreshold = selectedPreset === -1 ? customThreshold : selectedPreset

  // Set dates from school year config once loaded
  useEffect(() => {
    if (schoolYearConfig && !startDate && !endDate) {
      setStartDate(schoolYearConfig.startDate)
      setEndDate(schoolYearConfig.endDate)
    }
  }, [schoolYearConfig])

  // Set first kid as default
  useEffect(() => {
    if (kids.length > 0 && !selectedKidId) {
      setSelectedKidId(kids[0].id)
    }
  }, [kids])

  const filters = useMemo(
    () => ({ kidId: selectedKidId, startDate, endDate, showEmpty }),
    [selectedKidId, startDate, endDate, showEmpty]
  )

  const { coverage, loading, error } = useSubjectCoverage(filters)

  const sortedCoverage = useMemo(() => {
    return [...coverage].sort((a, b) => {
      if (sortBy === 'percentage') return b.percentage - a.percentage
      if (sortBy === 'total') return b.total - a.total
      return a.subject.localeCompare(b.subject)
    })
  }, [coverage, sortBy])

  const summary = useMemo(() => {
    const withLessons = coverage.filter((c) => c.total > 0)
    const totalLessons = coverage.reduce((s, c) => s + c.total, 0)
    const completedLessons = coverage.reduce((s, c) => s + c.completed, 0)
    const avgCoverage =
      withLessons.length > 0
        ? Math.round(withLessons.reduce((s, c) => s + c.percentage, 0) / withLessons.length)
        : 0
    const onTrack = withLessons.filter((c) => c.percentage >= onTrackThreshold).length
    return { totalLessons, completedLessons, avgCoverage, onTrack, activeSubjects: withLessons.length }
  }, [coverage, onTrackThreshold])

  const isLoadingInitial = configLoading || kidsLoading

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-widest text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
                Pro Feature
              </span>
              {schoolYearConfig?.name && (
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {schoolYearConfig.name}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Subject Coverage</h1>
            <p className="text-gray-500 text-sm mt-1">
              Track lesson completion across all subjects for each student.
            </p>
          </div>

          {/* Settings toggle */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </button>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Summary Settings</h3>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">
                "On Track" Threshold
                <span className="ml-2 font-normal text-gray-400">
                  Subjects at or above this % completion count as on track
                </span>
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {ON_TRACK_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => setSelectedPreset(preset.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      selectedPreset === preset.value
                        ? 'bg-violet-600 text-white border-violet-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-violet-300'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              {selectedPreset === -1 && (
                <div className="flex items-center gap-3 mt-2">
                  <input
                    type="range"
                    min={10}
                    max={100}
                    step={5}
                    value={customThreshold}
                    onChange={(e) => setCustomThreshold(Number(e.target.value))}
                    className="w-48 accent-violet-600"
                  />
                  <span className="text-sm font-bold text-violet-600 w-12">{customThreshold}%</span>
                </div>
              )}
              <p className="text-xs text-gray-400 mt-2">
                Currently: subjects with ≥{onTrackThreshold}% completion are "on track"
              </p>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-wrap gap-4 items-end">
          {/* Kid selector */}
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Student</label>
            <select
              value={selectedKidId}
              onChange={(e) => setSelectedKidId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-400"
              disabled={isLoadingInitial}
            >
              {isLoadingInitial ? (
                <option>Loading...</option>
              ) : kids.length === 0 ? (
                <option value="">No students found</option>
              ) : (
                kids.map((kid) => (
                  <option key={kid.id} value={kid.id}>
                    {[kid.firstname, kid.lastname].filter(Boolean).join(' ')}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Date range */}
          <div className="flex flex-col gap-3">
            <p className="text-xs text-gray-400 italic">
              Showing your full school year by default. Adjust dates to filter by a specific period.
            </p>
            <div className="flex gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-400 cursor-pointer"
                  disabled={configLoading}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-400 cursor-pointer"
                  disabled={configLoading}
                />
              </div>
            </div>
          </div>

          {/* Reset to school year */}
          {schoolYearConfig && (
            <div className="flex flex-col justify-end pb-0.5">
              <button
                onClick={() => {
                  setStartDate(schoolYearConfig.startDate)
                  setEndDate(schoolYearConfig.endDate)
                }}
                className="text-xs font-medium text-violet-600 hover:text-violet-700 underline underline-offset-2"
              >
                Reset to school year
              </button>
              <span className="text-xs text-gray-400 mt-0.5">
                {schoolYearConfig.startDate} → {schoolYearConfig.endDate}
              </span>
            </div>
          )}

          {/* Sort */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Sort by</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-400"
            >
              <option value="subject">Subject (A–Z)</option>
              <option value="percentage">Completion %</option>
              <option value="total">Total Lessons</option>
            </select>
          </div>

          {/* Toggle empty subjects */}
          <div className="flex items-center gap-2 pb-0.5">
            <button
              onClick={() => setShowEmpty(!showEmpty)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                showEmpty ? 'bg-violet-500' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  showEmpty ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <label
              className="text-xs font-semibold text-gray-600 cursor-pointer"
              onClick={() => setShowEmpty(!showEmpty)}
            >
              Show empty subjects
            </label>
          </div>
        </div>

        {/* Summary bar */}
        {!loading && coverage.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Avg Completion', value: `${summary.avgCoverage}%`, color: 'text-violet-600' },
              { label: 'Lessons Done', value: `${summary.completedLessons}/${summary.totalLessons}`, color: 'text-emerald-600' },
              { label: 'Active Subjects', value: summary.activeSubjects, color: 'text-blue-600' },
              { label: `On Track (≥${onTrackThreshold}%)`, value: summary.onTrack, color: 'text-amber-600' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-xl border border-gray-200 px-4 py-3 text-center">
                <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        {loading || isLoadingInitial ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-gray-200 p-4 animate-pulse">
                <div className="flex gap-2 mb-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg" />
                  <div className="flex-1">
                    <div className="h-3 bg-gray-100 rounded w-3/4 mb-1" />
                    <div className="h-2 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full mb-3" />
                <div className="h-2 bg-gray-100 rounded w-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-600 font-medium">Failed to load coverage data</p>
            <p className="text-red-400 text-sm mt-1">{error}</p>
          </div>
        ) : sortedCoverage.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <p className="text-gray-400 text-4xl mb-3">📚</p>
            <p className="text-gray-600 font-medium">No lessons found for this date range</p>
            <p className="text-gray-400 text-sm mt-1">
              Try adjusting the date range or toggle on empty subjects to see your curriculum.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedCoverage.map((item) => (
              <SubjectCoverageCard key={item.subject} data={item} onTrackThreshold={onTrackThreshold} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}