import { useState, useEffect } from 'react'
import { createClient } from '@/src/lib/supabase'

export interface StateComplianceTemplate {
  state_code: string
  state_name: string
  required_days: number
  day_requirement_type: 'required' | 'guideline' | 'none'
  required_hours: number
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
        console.log('🔍 Starting to fetch state templates...')
        const supabase = createClient()
        
        const { data, error: fetchError } = await supabase
          .from('state_compliance_templates')
          .select('*')
          .eq('status', 'active')
          .order('state_code')

        console.log('📊 Fetch result:', { 
          dataCount: data?.length || 0, 
          hasError: !!fetchError,
          error: fetchError,
          firstRow: data?.[0]
        })

        if (fetchError) {
          console.error('❌ Fetch error:', fetchError)
          throw fetchError
        }

        console.log('✅ Setting templates:', data?.length || 0, 'states')
        setTemplates(data || [])
      } catch (err) {
        console.error('💥 Caught error:', err)
        setError(err as Error)
      } finally {
        console.log('🏁 Fetch complete, loading set to false')
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