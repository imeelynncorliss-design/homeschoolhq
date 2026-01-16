// hooks/useSchoolYearSchedule.ts

import { useState, useEffect, useCallback } from 'react';
import { SchoolYearConfig, VacationPeriod } from '@/types/school-year';
import { schoolYearScheduler, ScheduledDate } from '@/lib/scheduling/school-year-scheduler';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface UseSchoolYearScheduleReturn {
  config: SchoolYearConfig | null;
  vacations: VacationPeriod[];
  loading: boolean;
  error: string | null;
  isSchoolDay: (date: Date) => Promise<boolean>;
  getNextSchoolDay: (afterDate: Date) => Promise<Date | null>;
  countSchoolDays: (startDate: Date, endDate: Date) => Promise<number>;
  generateSchedule: (startDate: Date, numberOfLessons: number) => Promise<ScheduledDate[]>;
  reload: () => Promise<void>;
}

export function useSchoolYearSchedule(organizationId: string): UseSchoolYearScheduleReturn {
  const supabase = createClientComponentClient();
  const [config, setConfig] = useState<SchoolYearConfig | null>(null);
  const [vacations, setVacations] = useState<VacationPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!organizationId) return;

    setLoading(true);
    setError(null);

    try {
      // Load school year config
      const { data: configData, error: configError } = await supabase
        .from('school_year_config')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('active', true)
        .single();

      if (configError && configError.code !== 'PGRST116') {
        throw configError;
      }

      setConfig(configData);

      // Load vacations
      const { data: vacationData, error: vacationError } = await supabase
        .from('vacation_periods')
        .select('*')
        .eq('organization_id', organizationId)
        .order('start_date', { ascending: true });

      if (vacationError) throw vacationError;

      setVacations(vacationData || []);

      // Load configuration into scheduler
      await schoolYearScheduler.loadConfiguration(organizationId);
    } catch (err) {
      console.error('Error loading school year data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load school year data');
    } finally {
      setLoading(false);
    }
  }, [organizationId, supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isSchoolDay = useCallback(
    async (date: Date): Promise<boolean> => {
      const schedule = await schoolYearScheduler.generateSchedule({
        organizationId,
        startDate: date,
        numberOfLessons: 1,
      });

      return schedule.length > 0 && schedule[0].isSchoolDay;
    },
    [organizationId]
  );

  const getNextSchoolDay = useCallback(
    async (afterDate: Date): Promise<Date | null> => {
      return schoolYearScheduler.getNextSchoolDay(organizationId, afterDate);
    },
    [organizationId]
  );

  const countSchoolDays = useCallback(
    async (startDate: Date, endDate: Date): Promise<number> => {
      return schoolYearScheduler.countSchoolDays(organizationId, startDate, endDate);
    },
    [organizationId]
  );

  const generateSchedule = useCallback(
    async (startDate: Date, numberOfLessons: number): Promise<ScheduledDate[]> => {
      return schoolYearScheduler.generateSchedule({
        organizationId,
        startDate,
        numberOfLessons,
      });
    },
    [organizationId]
  );

  return {
    config,
    vacations,
    loading,
    error,
    isSchoolDay,
    getNextSchoolDay,
    countSchoolDays,
    generateSchedule,
    reload: loadData,
  };
}