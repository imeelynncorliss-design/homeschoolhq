import { useState, useEffect } from 'react'
import { createClient } from '@/src/lib/supabase'

export interface ComplianceSettings {
  id: string
  organization_id: string
  state_code: string | null
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
      let user = null
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        user = authUser
      } catch (authError) {
        console.log('No auth session, using dev mode')
        // Auth failed - use dev mode
      }
  
      // Get organization ID from user
      let organizationId: string
  
      if (!user) {
        // Dev mode - use hardcoded org ID
        organizationId = 'd52497c0-42a9-49b7-ba3b-849bffa27fc4'
      } else {
        // Try to get org from organization_members table
        const { data: orgData, error: orgError } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user.id)
          .maybeSingle()
  
        if (orgError) {
          console.warn('Error fetching org membership:', orgError)
          // Fallback to user.id as org ID
          organizationId = user.id
        } else if (orgData) {
          organizationId = orgData.organization_id
        } else {
          // No org membership found, use user.id
          organizationId = user.id
        }
      }

      // Fetch compliance settings
      const { data, error: settingsError } = await supabase
        .from('user_compliance_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (settingsError) throw settingsError

      setSettings(data)
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