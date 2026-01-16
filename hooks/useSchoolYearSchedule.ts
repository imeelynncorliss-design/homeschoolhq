import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { SchoolYearConfig, VacationPeriod } from '@/types/school-year';
import { schoolYearScheduler, ScheduledDate } from '@/lib/scheduling/school-year-scheduler';

interface UseSchoolYearScheduleReturn {
  config: SchoolYearConfig | null;
  vacationPeriods: VacationPeriod[];
  loading: boolean;
  error: Error | null;
  getScheduledDates: (startDate: Date, endDate: Date) => ScheduledDate[];
  isSchoolDay: (date: Date) => boolean;
  isVacation: (date: Date) => boolean;
}

export function useSchoolYearSchedule(): UseSchoolYearScheduleReturn {
  const [config, setConfig] = useState<SchoolYearConfig | null>(null);
  const [vacationPeriods, setVacationPeriods] = useState<VacationPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadScheduleData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !mounted) return;

        // Load school year config
        const { data: configData, error: configError } = await supabase
          .from('school_year_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (configError) throw configError;

        if (configData && mounted) {
          setConfig(configData as SchoolYearConfig);

          // Load vacation periods
          const orgId = configData.organization_id || user.id;
          const { data: vacations, error: vacationError } = await supabase
            .from('vacation_periods')
            .select('*')
            .eq('organization_id', orgId);

          if (vacationError) throw vacationError;

          if (vacations && mounted) {
            setVacationPeriods(vacations as VacationPeriod[]);
          }
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to load schedule'));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadScheduleData();

    return () => {
      mounted = false;
    };
  }, []);

  const getScheduledDates = (startDate: Date, endDate: Date): ScheduledDate[] => {
    if (!config) return [];
    return schoolYearScheduler.getScheduledDates(config, vacationPeriods, startDate, endDate);
  };

  const isSchoolDay = (date: Date): boolean => {
    if (!config) return false;
    return schoolYearScheduler.isSchoolDay(config, vacationPeriods, date);
  };

  const isVacation = (date: Date): boolean => {
    return schoolYearScheduler.isVacation(vacationPeriods, date);
  };

  return {
    config,
    vacationPeriods,
    loading,
    error,
    getScheduledDates,
    isSchoolDay,
    isVacation,
  };
}