// lib/scheduling/school-year-scheduler.ts

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { SchoolYearConfig, VacationPeriod, DayOfWeek } from '@/types/school-year';

export interface SchedulingOptions {
  organizationId: string;
  startDate: Date;
  numberOfLessons: number;
  lessonsPerWeek?: number;
  specificDays?: DayOfWeek[]; // Override school days for this schedule
}

export interface ScheduledDate {
  date: Date;
  dayOfWeek: DayOfWeek;
  lessonNumber: number;
  isSchoolDay: boolean;
  reason?: string; // Why this date was chosen or skipped
}

export class SchoolYearScheduler {
  private supabase;
  private config: SchoolYearConfig | null = null;
  private vacations: VacationPeriod[] = [];

  constructor() {
    this.supabase = createClientComponentClient();
  }

  /**
   * Load school year configuration and vacation periods
   */
  async loadConfiguration(organizationId: string): Promise<void> {
    // Load active school year config
    const { data: configData } = await this.supabase
      .from('school_year_config')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('active', true)
      .single();

    this.config = configData;

    // Load vacation periods
    const { data: vacationData } = await this.supabase
      .from('vacation_periods')
      .select('*')
      .eq('organization_id', organizationId);

    this.vacations = vacationData || [];
  }

  /**
   * Generate schedule dates respecting school year and vacations
   */
  async generateSchedule(options: SchedulingOptions): Promise<ScheduledDate[]> {
    await this.loadConfiguration(options.organizationId);

    const schedule: ScheduledDate[] = [];
    let currentDate = new Date(options.startDate);
    let lessonsScheduled = 0;
    let attemptedDays = 0;
    const maxAttempts = options.numberOfLessons * 10; // Safety limit

    while (lessonsScheduled < options.numberOfLessons && attemptedDays < maxAttempts) {
      const scheduledDate = this.evaluateDate(currentDate, options);
      
      if (scheduledDate.isSchoolDay) {
        scheduledDate.lessonNumber = lessonsScheduled + 1;
        schedule.push(scheduledDate);
        lessonsScheduled++;
      }

      // Move to next day
      currentDate = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() + 1);
      attemptedDays++;
    }

    return schedule;
  }

  /**
   * Check if a specific date is a valid school day
   */
  private evaluateDate(date: Date, options: SchedulingOptions): ScheduledDate {
    const dayOfWeek = this.getDayOfWeek(date);
    const result: ScheduledDate = {
      date: new Date(date),
      dayOfWeek,
      lessonNumber: 0,
      isSchoolDay: false,
    };

    // Check if within school year
    if (this.config) {
      const schoolStart = new Date(this.config.school_year_start_date);
      const schoolEnd = new Date(this.config.school_year_end_date);

      if (date < schoolStart) {
        result.reason = 'Before school year starts';
        return result;
      }

      if (date > schoolEnd) {
        result.reason = 'After school year ends';
        return result;
      }

      // Check if it's a scheduled school day
      const schoolDays = options.specificDays || this.config.school_days;
      if (!schoolDays.includes(dayOfWeek)) {
        result.reason = 'Not a scheduled school day';
        return result;
      }

      // Check year-round cycle
      if (this.config.school_year_type === 'year_round' && 
          this.config.weeks_on && 
          this.config.weeks_off) {
        if (!this.isWithinYearRoundCycle(date)) {
          result.reason = 'Year-round break period';
          return result;
        }
      }
    } else {
      // No config - default to weekdays only
      if (dayOfWeek === 'saturday' || dayOfWeek === 'sunday') {
        result.reason = 'Weekend';
        return result;
      }
    }

    // Check if date falls within any vacation period
    const vacation = this.isVacationDate(date);
    if (vacation) {
      result.reason = `Vacation: ${vacation.name}`;
      return result;
    }

    // This is a valid school day!
    result.isSchoolDay = true;
    result.reason = 'Regular school day';
    return result;
  }

  /**
   * Check if date is within a year-round cycle "on" period
   */
  private isWithinYearRoundCycle(date: Date): boolean {
    if (!this.config?.weeks_on || !this.config?.weeks_off) {
      return true;
    }

    const cycleStart = this.config.cycle_start_date 
      ? new Date(this.config.cycle_start_date)
      : new Date(this.config.school_year_start_date);

    const daysSinceCycleStart = Math.floor(
      (date.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24)
    );

    const cycleLengthDays = (this.config.weeks_on + this.config.weeks_off) * 7;
    const dayInCycle = daysSinceCycleStart % cycleLengthDays;
    const onPeriodDays = this.config.weeks_on * 7;

    return dayInCycle < onPeriodDays;
  }

  /**
   * Check if date falls within any vacation period
   */
  private isVacationDate(date: Date): VacationPeriod | null {
    return this.vacations.find(vacation => {
      const start = new Date(vacation.start_date);
      const end = new Date(vacation.end_date);
      return date >= start && date <= end;
    }) || null;
  }

  /**
   * Get day of week as DayOfWeek type
   */
  private getDayOfWeek(date: Date): DayOfWeek {
    const days: DayOfWeek[] = [
      'sunday', 'monday', 'tuesday', 'wednesday', 
      'thursday', 'friday', 'saturday'
    ];
    return days[date.getDay()];
  }

  /**
   * Get next available school day after a given date
   */
  async getNextSchoolDay(organizationId: string, afterDate: Date): Promise<Date | null> {
    await this.loadConfiguration(organizationId);

    let currentDate = new Date(afterDate);
    currentDate.setDate(currentDate.getDate() + 1);
    let attempts = 0;
    const maxAttempts = 365; // Look up to one year ahead

    while (attempts < maxAttempts) {
      const evaluation = this.evaluateDate(currentDate, {
        organizationId,
        startDate: currentDate,
        numberOfLessons: 1,
      });

      if (evaluation.isSchoolDay) {
        return currentDate;
      }

      currentDate.setDate(currentDate.getDate() + 1);
      attempts++;
    }

    return null; // No school day found in the next year
  }

  /**
   * Get count of school days between two dates
   */
  async countSchoolDays(
    organizationId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<number> {
    await this.loadConfiguration(organizationId);

    let count = 0;
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const evaluation = this.evaluateDate(currentDate, {
        organizationId,
        startDate: currentDate,
        numberOfLessons: 1,
      });

      if (evaluation.isSchoolDay) {
        count++;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return count;
  }

  /**
   * Reschedule lessons starting from a date, pushing everything forward
   */
  async rescheduleLessons(
    organizationId: string,
    lessonIds: string[],
    startFromDate: Date
  ): Promise<Map<string, Date>> {
    const schedule = await this.generateSchedule({
      organizationId,
      startDate: startFromDate,
      numberOfLessons: lessonIds.length,
    });

    const lessonDateMap = new Map<string, Date>();
    lessonIds.forEach((lessonId, index) => {
      if (schedule[index]) {
        lessonDateMap.set(lessonId, schedule[index].date);
      }
    });

    return lessonDateMap;
  }
}

// Helper function for easy use in components
export async function getSchoolDaysForRange(
  organizationId: string,
  startDate: Date,
  endDate: Date
): Promise<Date[]> {
  const scheduler = new SchoolYearScheduler();
  await scheduler.loadConfiguration(organizationId);

  const days: Date[] = [];
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const schedule = await scheduler.generateSchedule({
      organizationId,
      startDate: currentDate,
      numberOfLessons: 1,
    });

    if (schedule.length > 0 && schedule[0].isSchoolDay) {
      days.push(new Date(currentDate));
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return days;
}

// Export singleton instance
export const schoolYearScheduler = new SchoolYearScheduler();