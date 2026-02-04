import { useState, useEffect } from 'react'
import { createClient } from '@/src/lib/supabase'

export interface ComplianceHours {
  total_hours: number
  total_days: number
  kid_id: string
}

export interface UseComplianceHoursParams {
  kidId: string | null
  organizationId: string | null
  startDate: string | null
  endDate: string | null
  /** Set to false to prevent automatic fetching */
  enabled?: boolean
}

export interface UseComplianceHoursReturn {
  hours: ComplianceHours | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

/**
 * Hook to calculate compliance hours and days for a specific student
 * Uses the calculate_compliance_hours SQL function from Week 1
 * 
 * @param {UseComplianceHoursParams} params - Kid ID, organization ID, date range, and enabled flag
 * @returns {UseComplianceHoursReturn} Hours data, loading state, error, and refetch function
 * 
 * @example
 * const { hours, loading, error, refetch } = useComplianceHours({
 *   kidId: 'kid-123',
 *   organizationId: 'org-456',
 *   startDate: '2024-08-01',
 *   endDate: '2025-05-31'
 * })
 * 
 * if (loading) return <Spinner />
 * if (hours) {
 *   return <div>{hours.total_hours} hours, {hours.total_days} days</div>
 * }
 */
export function useComplianceHours({
  kidId,
  organizationId,
  startDate,
  endDate,
  enabled = true
}: UseComplianceHoursParams): UseComplianceHoursReturn {
  const [hours, setHours] = useState<ComplianceHours | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  const supabase = createClient()

  const fetchHours = async () => {
    // Don't fetch if disabled or missing required params
    if (!enabled || !kidId || !organizationId || !startDate || !endDate) {
      setHours(null)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Call the SQL function we created in Week 1
      const { data, error: rpcError } = await supabase
        .rpc('calculate_compliance_hours', {
          p_kid_id: kidId,
          p_organization_id: organizationId,
          p_start_date: startDate,
          p_end_date: endDate
        })

      if (rpcError) throw rpcError

      // The function returns an array with one row
      if (data && data.length > 0) {
        setHours({
          total_hours: data[0].total_hours || 0,
          total_days: data[0].total_days || 0,
          kid_id: kidId
        })
      } else {
        // No data returned - set zeros
        setHours({
          total_hours: 0,
          total_days: 0,
          kid_id: kidId
        })
      }
    } catch (err) {
      console.error('Error calculating compliance hours:', err)
      setError(err instanceof Error ? err : new Error('Failed to calculate hours'))
      setHours(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHours()
  }, [kidId, organizationId, startDate, endDate, enabled])

  return {
    hours,
    loading,
    error,
    refetch: fetchHours
  }
}