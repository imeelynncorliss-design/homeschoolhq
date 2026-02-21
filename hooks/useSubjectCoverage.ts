import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../src/lib/supabase'
import { CANONICAL_SUBJECTS } from '../src/constants/subjects'

export interface SubjectCoverageData {
  subject: string
  total: number
  completed: number
  notStarted: number
  inProgress: number
  percentage: number
}

export interface CoverageFilters {
  kidId: string
  startDate: string
  endDate: string
  showEmpty: boolean
}

export interface CoverageSettings {
  /** Percentage at or above which a subject is considered "on track" (default: 70) */
  onTrackThreshold: number
}

export interface Kid {
  id: string
  firstname: string | null
  lastname: string | null
}

export interface SchoolYearConfig {
  startDate: string
  endDate: string
  name: string | null
}

const ORG_ID = 'd52497c0-42a9-49b7-ba3b-849bffa27fc4'

/** Fallback: approximate school year based on current calendar date */
function getFallbackSchoolYear(): SchoolYearConfig {
  const now = new Date()
  const year = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1
  return {
    startDate: `${year}-08-01`,
    endDate: `${year + 1}-05-31`,
    name: null,
  }
}

export function useSchoolYearConfig() {
  const [config, setConfig] = useState<SchoolYearConfig | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchConfig() {
      try {
        const { data, error } = await supabase
          .from('school_year_settings')
          .select('school_year_start, school_year_end')
          .eq('organization_id', ORG_ID)
          .single()

        if (error || !data || !data.school_year_start) {
          setConfig(getFallbackSchoolYear())
        } else {
          setConfig({
            startDate: data.school_year_start,
            endDate: data.school_year_end,
            name: null,
          })
        }
      } catch {
        setConfig(getFallbackSchoolYear())
      } finally {
        setLoading(false)
      }
    }
    fetchConfig()
  }, [])

  return { config, loading }
}

export function useSubjectCoverage(filters: CoverageFilters) {
  const [coverage, setCoverage] = useState<SubjectCoverageData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCoverage = useCallback(async () => {
    if (!filters.kidId) return

    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('lessons')
        .select('subject, status')
        .eq('organization_id', ORG_ID)
        .eq('kid_id', filters.kidId)

      if (filters.startDate) query = query.gte('lesson_date', filters.startDate)
      if (filters.endDate) query = query.lte('lesson_date', filters.endDate)

      const { data, error: fetchError } = await query
      if (fetchError) throw fetchError

      const lessonMap: Record<string, { total: number; completed: number; notStarted: number; inProgress: number }> = {}

      for (const lesson of data || []) {
        if (!lessonMap[lesson.subject]) {
          lessonMap[lesson.subject] = { total: 0, completed: 0, notStarted: 0, inProgress: 0 }
        }
        lessonMap[lesson.subject].total++
        if (lesson.status === 'completed') lessonMap[lesson.subject].completed++
        else if (lesson.status === 'not_started') lessonMap[lesson.subject].notStarted++
        else lessonMap[lesson.subject].inProgress++
      }

      const allSubjects: SubjectCoverageData[] = CANONICAL_SUBJECTS.map((subject) => {
        const stats = lessonMap[subject] ?? { total: 0, completed: 0, notStarted: 0, inProgress: 0 }
        return {
          subject,
          ...stats,
          percentage: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
        }
      })

      // Append any non-canonical subjects found in DB (data safety net)
      for (const [subject, stats] of Object.entries(lessonMap)) {
        const isCanonical = (CANONICAL_SUBJECTS as readonly string[]).includes(subject)
        if (!isCanonical) {
          allSubjects.push({
            subject,
            ...stats,
            percentage: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
          })
        }
      }

      setCoverage(allSubjects)
    } catch (err: any) {
      setError(err.message || 'Failed to load coverage data')
    } finally {
      setLoading(false)
    }
  }, [filters.kidId, filters.startDate, filters.endDate])

  useEffect(() => {
    fetchCoverage()
  }, [fetchCoverage])

  const filtered = filters.showEmpty ? coverage : coverage.filter((c) => c.total > 0)

  return { coverage: filtered, loading, error, refetch: fetchCoverage }
}

export function useKids() {
  const [kids, setKids] = useState<Kid[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchKids() {
      const { data } = await supabase
        .from('kids')
        .select('id, firstname, lastname')
        .eq('organization_id', ORG_ID)
        .order('firstname')

        if (data) setKids(data.map(k => ({
          id: k.id,
          firstname: k.firstname,
          lastname: k.lastname,
        })))
      setLoading(false)
    }
    fetchKids()
  }, [])

  return { kids, loading }
}