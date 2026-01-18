// lib/usePlanningAutoComplete.ts
/**
 * React Hook for Planning Task Auto-Completion
 * 
 * Use this hook in components that perform actions which should trigger
 * planning task auto-completion (curriculum import, lesson scheduling, etc.)
 * 
 * Example usage:
 * ```tsx
 * const { triggerAutoComplete } = usePlanningAutoComplete();
 * 
 * // After curriculum import
 * await triggerAutoComplete('curriculum_import');
 * ```
 */

import { useState } from 'react';

export interface AutoCompleteResult {
  success: boolean;
  completed_tasks: Array<{
    id: string;
    task_key: string;
    task_label: string;
    completion_metadata: any;
  }>;
  message: string;
}

export function usePlanningAutoComplete() {
  const [isChecking, setIsChecking] = useState(false);
  const [lastResult, setLastResult] = useState<AutoCompleteResult | null>(null);

  const triggerAutoComplete = async (
    trigger_event?: 'curriculum_import' | 'lesson_scheduling' | 'standards_mapping' | 'student_update' | 'school_config',
    organizationId?: string,
    planningPeriodId?: string
  ): Promise<AutoCompleteResult> => {
    setIsChecking(true);
    
    try {
      const response = await fetch('/api/planning/auto-complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organization_id: organizationId, // Optional - API will get from session if not provided
          planning_period_id: planningPeriodId, // Optional - API will find active period
          trigger_event: trigger_event,
        }),
      });

      const result = await response.json();
      setLastResult(result);
      
      return result;
    } catch (error) {
      console.error('Auto-completion check failed:', error);
      const errorResult = {
        success: false,
        completed_tasks: [],
        message: 'Failed to check auto-completion',
      };
      setLastResult(errorResult);
      return errorResult;
    } finally {
      setIsChecking(false);
    }
  };

  return {
    triggerAutoComplete,
    isChecking,
    lastResult,
  };
}

// Standalone function (non-hook version for use outside components)
export async function triggerPlanningAutoComplete(
  trigger_event?: string,
  organizationId?: string,
  planningPeriodId?: string
): Promise<AutoCompleteResult> {
  try {
    const response = await fetch('/api/planning/auto-complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        organization_id: organizationId,
        planning_period_id: planningPeriodId,
        trigger_event: trigger_event,
      }),
    });

    return await response.json();
  } catch (error) {
    console.error('Auto-completion check failed:', error);
    return {
      success: false,
      completed_tasks: [],
      message: 'Failed to check auto-completion',
    };
  }
}