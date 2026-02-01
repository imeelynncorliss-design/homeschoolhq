// src/hooks/useCompliance.ts

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/src/lib/supabase';
import type {
  UserComplianceSetting,
  UserComplianceSettingInsert,
  UserComplianceSettingUpdate,
  ComplianceHours,
  ComplianceHealthScore,
  CalculateComplianceHoursParams,
  GetComplianceHealthScoreParams,
} from '@/types/compliance';

/**
 * Hook for CRUD operations on compliance settings
 */
export function useComplianceSettings(organizationId: string) {
  const supabase = createClient();
  const [settings, setSettings] = useState<UserComplianceSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all compliance settings for the organization
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('user_compliance_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setSettings(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch compliance settings');
      console.error('Error fetching compliance settings:', err);
    } finally {
      setLoading(false);
    }
  }, [organizationId, supabase]);

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Get settings for a specific kid
  const getSettingByKid = useCallback(
    (kidId: string): UserComplianceSetting | undefined => {
      return settings.find((s) => s.kid_id === kidId);
    },
    [settings]
  );

  // Create new compliance setting
  const createSetting = useCallback(
    async (data: UserComplianceSettingInsert): Promise<UserComplianceSetting | null> => {
      try {
        setError(null);

        const { data: newSetting, error: insertError } = await supabase
          .from('user_compliance_settings')
          .insert(data)
          .select()
          .single();

        if (insertError) throw insertError;

        // Update local state
        setSettings((prev) => [newSetting, ...prev]);
        return newSetting;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create compliance setting');
        console.error('Error creating compliance setting:', err);
        return null;
      }
    },
    [supabase]
  );

  // Update existing compliance setting
  const updateSetting = useCallback(
    async (id: string, data: Partial<UserComplianceSettingUpdate>): Promise<boolean> => {
      try {
        setError(null);

        const { error: updateError } = await supabase
          .from('user_compliance_settings')
          .update(data)
          .eq('id', id);

        if (updateError) throw updateError;

        // Update local state
        setSettings((prev) =>
          prev.map((setting) =>
            setting.id === id ? { ...setting, ...data } : setting
          )
        );
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update compliance setting');
        console.error('Error updating compliance setting:', err);
        return false;
      }
    },
    [supabase]
  );

  // Delete compliance setting
  const deleteSetting = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        setError(null);

        const { error: deleteError } = await supabase
          .from('user_compliance_settings')
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;

        // Update local state
        setSettings((prev) => prev.filter((setting) => setting.id !== id));
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete compliance setting');
        console.error('Error deleting compliance setting:', err);
        return false;
      }
    },
    [supabase]
  );

  return {
    settings,
    loading,
    error,
    getSettingByKid,
    createSetting,
    updateSetting,
    deleteSetting,
    refetch: fetchSettings,
  };
}

/**
 * Hook to calculate compliance hours for a kid
 */
export function useComplianceHours(params: CalculateComplianceHoursParams | null) {
  const supabase = createClient();
  const [data, setData] = useState<ComplianceHours | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHours = useCallback(async () => {
    if (!params) {
      setData(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: result, error: rpcError } = await supabase.rpc(
        'calculate_compliance_hours',
        {
          p_kid_id: params.kid_id,
          p_organization_id: params.organization_id,
          p_start_date: params.start_date || null,
          p_end_date: params.end_date || null,
        }
      );

      if (rpcError) throw rpcError;

      // RPC returns array with single row
      const hoursData = result?.[0] || {
        total_hours: 0,
        total_days: 0,
        subject_hours: {},
        hours_by_month: {},
      };

      setData(hoursData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : JSON.stringify(err);
      setError(errorMessage);
      console.error('Error calculating compliance hours:', err);
      console.error('Full error details:', JSON.stringify(err, null, 2));
    } finally {
      setLoading(false);
    }
  }, [params?.kid_id, params?.organization_id, params?.start_date, params?.end_date, supabase]);

  useEffect(() => {
    if (!params?.kid_id || !params?.organization_id) {
      setData(null);
      return;
    }
    fetchHours();
  }, [params?.kid_id, params?.organization_id, params?.start_date, params?.end_date, fetchHours]);

  return {
    data,
    loading,
    error,
    refetch: fetchHours,
  };
}

/**
 * Hook to get compliance health score for a kid
 */
export function useComplianceHealthScore(params: GetComplianceHealthScoreParams | null) {
  const supabase = createClient();
  const [data, setData] = useState<ComplianceHealthScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchScore = useCallback(async () => {
    if (!params) {
      setData(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: result, error: rpcError } = await supabase.rpc(
        'get_compliance_health_score',
        {
          p_kid_id: params.kid_id,
          p_organization_id: params.organization_id,
          p_start_date: params.start_date || null,
          p_end_date: params.end_date || null,
        }
      );

      if (rpcError) throw rpcError;

      // RPC returns array with single row
      const scoreData = result?.[0] || null;
      setData(scoreData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : JSON.stringify(err);
      setError(errorMessage);
      console.error('Error calculating health score:', err);
      console.error('Full error details:', JSON.stringify(err, null, 2));
    } finally {
      setLoading(false);
    }
  }, [params?.kid_id, params?.organization_id, params?.start_date, params?.end_date, supabase]);

  useEffect(() => {
    if (!params?.kid_id || !params?.organization_id) {
      setData(null);
      return;
    }
    fetchScore();
  }, [params?.kid_id, params?.organization_id, params?.start_date, params?.end_date, fetchScore]);

  return {
    data,
    loading,
    error,
    refetch: fetchScore,
  };
}

/**
 * Combined hook for complete compliance dashboard data
 */
export function useComplianceDashboard(kidId: string, organizationId: string) {
  const [dateRange, setDateRange] = useState<{
    start_date?: string;
    end_date?: string;
  }>({});

  const params = kidId && organizationId
    ? {
        kid_id: kidId,
        organization_id: organizationId,
        ...dateRange,
      }
    : null;

  const { settings, loading: settingsLoading, error: settingsError } = 
    useComplianceSettings(organizationId);
  
  const { data: hours, loading: hoursLoading, error: hoursError, refetch: refetchHours } = 
    useComplianceHours(params);
  
  const { data: healthScore, loading: scoreLoading, error: scoreError, refetch: refetchScore } = 
    useComplianceHealthScore(params);

  const setting = settings.find((s) => s.kid_id === kidId);

  const loading = settingsLoading || hoursLoading || scoreLoading;
  const error = settingsError || hoursError || scoreError;

  const refetch = useCallback(() => {
    refetchHours();
    refetchScore();
  }, [refetchHours, refetchScore]);

  return {
    setting,
    hours,
    healthScore,
    loading,
    error,
    refetch,
    setDateRange,
  };
}