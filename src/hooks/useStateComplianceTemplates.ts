import { useState, useEffect } from 'react'
import { createClient } from '@/src/lib/supabase'

export interface StateComplianceTemplate {
  state_code: string
  state_name: string
  status: string | null       // 'active' = full detail, 'basic' = days/hours only
  required_days: number
  required_hours: number
  day_requirement_type: 'required' | 'guideline' | 'none'
  hour_requirement_type: 'required' | 'guideline' | 'none'
  hours_by_grade_level: { [key: string]: number } | null
  required_subjects: string[] | null
  parental_qualifications: string | null
  official_source_url: string
  official_source_name: string
  disclaimer_text: string
  overall_notes: string | null
}

export function useStateComplianceTemplates() {
  const [templates, setTemplates] = useState<StateComplianceTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchTemplates() {
      try {
        const supabase = createClient()

        // Fetch all 50 states from state_compliance (basic days/hours data)
        const { data: basicData, error: basicError } = await supabase
          .from('state_compliance')
          .select('state_code, state_name, required_days, required_hours, noi_required, regulation_level')
          .order('state_code')

        if (basicError) throw basicError

        // Fetch the 10 fully-detailed states from state_compliance_templates
        const { data: detailData, error: detailError } = await supabase
          .from('state_compliance_templates')
          .select('*')
          .eq('status', 'active')
          .order('state_code')

        if (detailError) throw detailError

        // Build a lookup of detailed templates by state_code
        const detailMap = new Map<string, any>()
        for (const t of detailData || []) {
          detailMap.set(t.state_code, t)
        }

        // Merge: prefer detailed template when available, otherwise use basic data
        const merged: StateComplianceTemplate[] = (basicData || []).map(b => {
          const detail = detailMap.get(b.state_code)
          if (detail) {
            return { ...detail, status: 'active' } as StateComplianceTemplate
          }
          return {
            state_code: b.state_code,
            state_name: b.state_name,
            status: 'basic',
            required_days: b.required_days ?? 180,
            required_hours: b.required_hours ?? 0,
            day_requirement_type: 'required' as const,
            hour_requirement_type: b.required_hours > 0 ? 'required' as const : 'none' as const,
            hours_by_grade_level: null,
            required_subjects: null,
            parental_qualifications: null,
            official_source_url: '',
            official_source_name: '',
            disclaimer_text: '',
            overall_notes: null,
          }
        })

        setTemplates(merged)
      } catch (err) {
        console.error('useStateComplianceTemplates error:', err)
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchTemplates()
  }, [])

  const getTemplate = (stateCode: string) => {
    return templates.find(t => t.state_code === stateCode)
  }

  return { templates, loading, error, getTemplate }
}
