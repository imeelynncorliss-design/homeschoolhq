import { supabase } from '@/src/lib/supabase';

export interface SchoolYearConfig {
  school_year_start: string;
  school_year_end: string;
  homeschool_days?: string[];
  organization_id?: string;
}

export interface VacationPeriod {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  vacation_type: string;
}

export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface SchedulingOptions {
  config: SchoolYearConfig;
  vacationPeriods: VacationPeriod[];
  preferredDays?: DayOfWeek[];
}

export interface ScheduledDate {
  date: string;
  isSchoolDay: boolean;
  isVacation: boolean;
  vacationName?: string;
}

export const schoolYearScheduler = {
  isSchoolDay(config: SchoolYearConfig, vacationPeriods: VacationPeriod[], date: Date): boolean {
    const dateStr = date.toISOString().split('T')[0];
    
    // Check if date is within school year
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
    if (this.isVacation(vacationPeriods, date)) {
      return false;
    }
    
    return true;
  },

  isVacation(vacationPeriods: VacationPeriod[], date: Date): boolean {
    const dateStr = date.toISOString().split('T')[0];
    return vacationPeriods.some(
      vacation => dateStr >= vacation.start_date && dateStr <= vacation.end_date
    );
  },

  getVacationName(vacationPeriods: VacationPeriod[], date: Date): string | undefined {
    const dateStr = date.toISOString().split('T')[0];
    const vacation = vacationPeriods.find(
      v => dateStr >= v.start_date && dateStr <= v.end_date
    );
    return vacation?.name;
  },

  async loadConfig(userId: string): Promise<SchoolYearConfig | null> {
    const { data, error } = await supabase
      .from('school_year_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return null;
    return data as SchoolYearConfig;
  },

  async loadVacationPeriods(organizationId: string): Promise<VacationPeriod[]> {
    const { data, error } = await supabase
      .from('vacation_periods')
      .select('*')
      .eq('organization_id', organizationId);

    if (error || !data) return [];
    return data as VacationPeriod[];
  }
};