// types/school-year.ts

export type SchoolYearType = 'traditional' | 'year_round' | 'hybrid' | 'custom';
export type VacationType = 'holiday' | 'break' | 'vacation' | 'other';
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface SchoolYearConfig {
  id: string;
  organization_id: string;
  school_year_type: SchoolYearType;
  school_year_start_date: string; // ISO date string
  school_year_end_date: string; // ISO date string
  weeks_on?: number;
  weeks_off?: number;
  cycle_start_date?: string;
  school_days: DayOfWeek[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VacationPeriod {
  id: string;
  organization_id: string;
  school_year_config_id?: string;
  name: string;
  start_date: string; // ISO date string
  end_date: string; // ISO date string
  vacation_type?: VacationType;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SchoolYearConfigInput {
  school_year_type: SchoolYearType;
  school_year_start_date: string;
  school_year_end_date: string;
  weeks_on?: number;
  weeks_off?: number;
  cycle_start_date?: string;
  school_days?: DayOfWeek[];
}

export interface VacationPeriodInput {
  name: string;
  start_date: string;
  end_date: string;
  vacation_type?: VacationType;
  notes?: string;
}

// Helper type for school year templates
export interface SchoolYearTemplate {
  id: string;
  name: string;
  description: string;
  school_year_type: SchoolYearType;
  typical_start_month: number; // 1-12
  typical_end_month: number;
  weeks_on?: number;
  weeks_off?: number;
  default_vacations: Array<{
    name: string;
    typical_month: number;
    duration_days: number;
    vacation_type: VacationType;
  }>;
}

// Predefined templates
export const SCHOOL_YEAR_TEMPLATES: SchoolYearTemplate[] = [
  {
    id: 'traditional',
    name: 'Traditional School Year',
    description: 'Typical Aug/Sept - May/June schedule with summer break',
    school_year_type: 'traditional',
    typical_start_month: 8, // August
    typical_end_month: 6, // June
    default_vacations: [
      { name: 'Fall Break', typical_month: 10, duration_days: 5, vacation_type: 'break' },
      { name: 'Thanksgiving Break', typical_month: 11, duration_days: 5, vacation_type: 'holiday' },
      { name: 'Winter Break', typical_month: 12, duration_days: 14, vacation_type: 'holiday' },
      { name: 'Spring Break', typical_month: 3, duration_days: 7, vacation_type: 'break' },
    ],
  },
  {
    id: 'year-round-9-3',
    name: 'Year-Round (9 weeks on, 3 weeks off)',
    description: 'Continuous learning with regular breaks throughout the year',
    school_year_type: 'year_round',
    typical_start_month: 7, // July
    typical_end_month: 6, // June (next year)
    weeks_on: 9,
    weeks_off: 3,
    default_vacations: [
      { name: 'Winter Break', typical_month: 12, duration_days: 7, vacation_type: 'holiday' },
    ],
  },
  {
    id: 'year-round-12-4',
    name: 'Year-Round (12 weeks on, 4 weeks off)',
    description: 'Longer learning periods with extended breaks',
    school_year_type: 'year_round',
    typical_start_month: 7,
    typical_end_month: 6,
    weeks_on: 12,
    weeks_off: 4,
    default_vacations: [
      { name: 'Winter Break', typical_month: 12, duration_days: 7, vacation_type: 'holiday' },
    ],
  },
  {
    id: 'hybrid-traditional',
    name: 'Hybrid (Traditional with Modifications)',
    description: 'Follows traditional calendar but with flexibility for family needs',
    school_year_type: 'hybrid',
    typical_start_month: 9,
    typical_end_month: 5,
    default_vacations: [
      { name: 'Winter Break', typical_month: 12, duration_days: 14, vacation_type: 'holiday' },
      { name: 'Spring Break', typical_month: 3, duration_days: 7, vacation_type: 'break' },
    ],
  },
  {
    id: 'custom',
    name: 'Custom Schedule',
    description: 'Design your own school year from scratch',
    school_year_type: 'custom',
    typical_start_month: 1,
    typical_end_month: 12,
    default_vacations: [],
  },
];