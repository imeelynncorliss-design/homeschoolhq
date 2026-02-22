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
  onTrackThreshold: number
}

export interface Kid {
  id: string
  displayname: string
}

export interface SchoolYearConfig {
  startDate: string
  endDate: string
  name: string | null
}

function getFallbackSchoolYear(): SchoolYearConfig {
  const now = new Date()
  const year = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1
  return {
    startDate: `${year}-08-01`,
    endDate: `${year + 1}-05-31`,
    name: null,
  }
}

async function getOrgId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('kids')
    .select('organization_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()
  return data?.organization_id || user.id
}

export function useSchoolYearConfig() {
  const [config, setConfig] = useState<SchoolYearConfig | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchConfig() {
      try {
        const orgId = await getOrgId()
        if (!orgId) { setConfig(getFallbackSchoolYear()); setLoading(false); return }

        const { data, error } = await supabase
          .from('school_year_settings')
          .select('school_year_start, school_year_end')
          .eq('organization_id', orgId)
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
      const orgId = await getOrgId()
      if (!orgId) throw new Error('Could not determine organization')

      let query = supabase
        .from('lessons')
        .select('subject, status')
        .eq('organization_id', orgId)
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
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }

        const { data } = await supabase
          .from('kids')
          .select('id, displayname')
          .eq('user_id', user.id)
          .order('displayname')

        if (data) setKids(data.map((k: any) => ({
          id: k.id,
          displayname: k.displayname,
        })))
      } catch (err) {
        console.error('Error fetching kids:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchKids()
  }, [])

  return { kids, loading }
}