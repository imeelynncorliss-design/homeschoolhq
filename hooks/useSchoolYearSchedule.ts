import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface SchoolYearConfig {
  school_year_start: string;
  school_year_end: string;
  homeschool_days?: string[];
  organization_id?: string;
}

interface VacationPeriod {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  vacation_type: string;
}

interface UseSchoolYearScheduleReturn {
  config: SchoolYearConfig | null;
  vacationPeriods: VacationPeriod[];
  loading: boolean;
  error: Error | null;
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

  const isSchoolDay = (date: Date): boolean => {
    if (!config) return false;
    
    // Check if date is within school year
    const dateStr = date.toISOString().split('T')[0];
    if (dateStr < config.school_year_start || dateStr > config.school_year_end) {
      return false;
    }
    
    // Check if it's a configured school day
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
    const homeschoolDays = config.homeschool_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    if (!homeschoolDays.includes(dayOfWeek)) {
      return false;
    }
    
    // Check if it's a vacation
    if (isVacation(date)) {
      return false;
    }
    
    return true;
  };

  const isVacation = (date: Date): boolean => {
    const dateStr = date.toISOString().split('T')[0];
    return vacationPeriods.some(
      vacation => dateStr >= vacation.start_date && dateStr <= vacation.end_date
    );
  };

  return {
    config,
    vacationPeriods,
    loading,
    error,
    isSchoolDay,
    isVacation,
  };
}