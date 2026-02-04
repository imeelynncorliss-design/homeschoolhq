import { useState, useEffect } from 'react'
import { createClient } from '@/src/lib/supabase'

export interface HealthScore {
  health_score: number
  kid_id: string
  days_progress: number
  hours_progress: number
  overall_status: 'excellent' | 'on_track' | 'behind' | 'critical'
}

export interface UseComplianceHealthScoreParams {
  kidId: string | null
  organizationId: string | null
  startDate: string | null
  endDate: string | null
  /** Set to false to prevent automatic fetching */
  enabled?: boolean
}

export interface UseComplianceHealthScoreReturn {
  score: HealthScore | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

/**
 * Hook to calculate compliance health score for a specific student
 * Uses the get_compliance_health_score SQL function from Week 1
 * 
 * Returns a score from 0-100 based on progress toward compliance requirements
 * 
 * @param {UseComplianceHealthScoreParams} params - Kid ID, organization ID, date range, and enabled flag
 * @returns {UseComplianceHealthScoreReturn} Health score data, loading state, error, and refetch function
 * 
 * @example
 * const { score, loading, error, refetch } = useComplianceHealthScore({
 *   kidId: 'kid-123',
 *   organizationId: 'org-456',
 *   startDate: '2024-08-01',
 *   endDate: '2025-05-31'
 * })
 * 
 * if (loading) return <Spinner />
 * if (score) {
 *   return (
 *     <div>
 *       Health Score: {score.health_score}% ({score.overall_status})
 *     </div>
 *   )
 * }
 */
export function useComplianceHealthScore({
  kidId,
  organizationId,
  startDate,
  endDate,
  enabled = true
}: UseComplianceHealthScoreParams): UseComplianceHealthScoreReturn {
  const [score, setScore] = useState<HealthScore | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  const supabase = createClient()

  const fetchScore = async () => {
    // Don't fetch if disabled or missing required params
    if (!enabled || !kidId || !organizationId || !startDate || !endDate) {
      setScore(null)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Call the SQL function we created in Week 1
      const { data, error: rpcError } = await supabase
        .rpc('get_compliance_health_score', {
          p_kid_id: kidId,
          p_organization_id: organizationId,
          p_start_date: startDate,
          p_end_date: endDate
        })

      if (rpcError) throw rpcError

      // The function returns an array with one row
      if (data && data.length > 0) {
        const healthScore = data[0].health_score || 0
        
        // Determine overall status based on score
        let status: 'excellent' | 'on_track' | 'behind' | 'critical'
        if (healthScore >= 90) status = 'excellent'
        else if (healthScore >= 75) status = 'on_track'
        else if (healthScore >= 50) status = 'behind'
        else status = 'critical'

        setScore({
          health_score: healthScore,
          kid_id: kidId,
          days_progress: data[0].days_progress || 0,
          hours_progress: data[0].hours_progress || 0,
          overall_status: status
        })
      } else {
        // No data returned - set default
        setScore({
          health_score: 0,
          kid_id: kidId,
          days_progress: 0,
          hours_progress: 0,
          overall_status: 'critical'
        })
      }
    } catch (err) {
      console.error('Error calculating health score:', err)
      setError(err instanceof Error ? err : new Error('Failed to calculate health score'))
      setScore(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchScore()
  }, [kidId, organizationId, startDate, endDate, enabled])

  return {
    score,
    loading,
    error,
    refetch: fetchScore
  }
}