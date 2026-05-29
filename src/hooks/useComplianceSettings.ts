import { useState, useEffect } from 'react'
import { createClient } from '@/src/lib/supabase'
import { getOrganizationId } from '@/src/lib/getOrganizationId'

export interface ComplianceSettings {
  id: string
  organization_id: string
  kid_id: string | null
  state_code: string | null
  state_name: string | null
  required_annual_days: number
  required_annual_hours: number
  school_year_start_date: string | null
  school_year_end_date: string | null
  created_at: string
  updated_at: string
}

export interface UseComplianceSettingsReturn {
  settings: ComplianceSettings | null
  loading: boolean
  error: Error | null
  refreshSettings: () => Promise<void>
}

/**
 * Hook to fetch and manage compliance settings for the current organization
 * 
 * @returns {UseComplianceSettingsReturn} Settings data, loading state, error, and refresh function
 * 
 * @example
 * const { settings, loading, error, refreshSettings } = useComplianceSettings()
 * 
 * if (loading) return <Spinner />
 * if (!settings) return <SetupPrompt />
 * 
 * return <div>State: {settings.state_code}</div>
 */
export function useComplianceSettings(): UseComplianceSettingsReturn {
  const [settings, setSettings] = useState<ComplianceSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  const supabase = createClient()

  const fetchSettings = async () => {
    try {
      setLoading(true)
      setError(null)
  
      // Get current user - handle auth session missing
      const { data: { user } } = await supabase.auth.getUser()
  
      if (!user) {
        setSettings(null)
        setLoading(false)
        return
      }
      
      const { orgId: organizationId } = await getOrganizationId(user.id)
      
      if (!organizationId) {
        setSettings(null)
        setLoading(false)
        return
      }

      // Fetch canonical compliance settings when RLS allows it.
      const { data, error: settingsError } = await supabase
        .from('user_compliance_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .is('kid_id', null)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (settingsError && settingsError.code !== '42501') throw settingsError

      if (data) {
        setSettings(data)
        return
      }

      // SBX fallback: user_compliance_settings may be RLS-blocked before its policy
      // migration lands. Preserve the Compliance page using organizations.state and
      // school_year_settings so state/date saves still round-trip for users.
      const [{ data: org }, { data: schoolYear }] = await Promise.all([
        supabase
          .from('organizations')
          .select('state')
          .eq('id', organizationId)
          .maybeSingle(),
        supabase
          .from('school_year_settings')
          .select('school_year_start, school_year_end, annual_goal_type, annual_goal_value')
          .eq('organization_id', organizationId)
          .maybeSingle(),
      ])

      if (org?.state || schoolYear?.school_year_start || schoolYear?.school_year_end) {
        setSettings({
          id: `fallback-${organizationId}`,
          organization_id: organizationId,
          kid_id: null,
          state_code: org?.state || null,
          state_name: org?.state || null,
          required_annual_days: schoolYear?.annual_goal_type === 'lessons' ? (schoolYear.annual_goal_value || 180) : 180,
          required_annual_hours: schoolYear?.annual_goal_type === 'hours' ? (schoolYear.annual_goal_value || 0) : 0,
          school_year_start_date: schoolYear?.school_year_start || null,
          school_year_end_date: schoolYear?.school_year_end || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        return
      }

      setSettings(null)
    } catch (err) {
      console.error('Error fetching compliance settings:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch settings'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  return {
    settings,
    loading,
    error,
    refreshSettings: fetchSettings
  }
}