// utils/schoolYearUtils.ts
import { Holiday } from '../app/utils/holidayUtils';

export interface SchoolYearSettings {
  school_year_start: string;
  school_year_end: string;
  homeschool_days: string[];
  annual_goal_type: 'hours' | 'lessons';
  annual_goal_value: number;
  weekly_goal_hours: number;
  school_type: 'traditional' | 'year-round' | 'hybrid';
}

export interface GoalProgress {
  totalDaysInYear: number;
  totalWeeksInYear: number;
  daysPassed: number;
  weeksPassed: number;
  currentHours: number;
  currentDays: number;
  goalHours: number;
  goalDays: number;
  weeklyGoalHours: number;
  hoursProgress: number; // percentage
  daysProgress: number; // percentage
  averageHoursPerWeek: number;
  onTrack: boolean;
  projectedTotal: number;
  needsAdjustment: string | null; // message if behind
}

/**
 * Calculate the total number of valid school days between start and end dates
 * based on homeschool days configuration and holidays
 */
export function calculateTotalSchoolDays(
  startDate: string,
  endDate: string,
  homeschoolDays: string[],
  holidays: Holiday[] = []
): number {
  // ✅ FIXED: Parse dates in local time
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  let count = 0;
  
  const current = new Date(start);
  while (current <= end) {
    const dayName = current.toLocaleDateString('en-US', { weekday: 'long' });
    
    // Check if it's a homeschool day
    if (homeschoolDays.includes(dayName)) {
      // Check if it's not a holiday
      const isHoliday = holidays.some(holiday => {
        // ✅ FIXED: Parse holiday dates in local time
        const holidayStart = new Date(holiday.start + 'T00:00:00');
        const holidayEnd = new Date(holiday.end + 'T00:00:00');
        return current >= holidayStart && current <= holidayEnd && holiday.enabled;
      });
      
      if (!isHoliday) {
        count++;
      }
    }
    
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

/**
 * Calculate total weeks between start and end dates
 */
export function calculateTotalWeeks(startDate: string, endDate: string): number {
  // ✅ FIXED: Parse dates in local time
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.ceil(diffDays / 7);
}

/**
 * Calculate how many days/weeks have passed since school year start
 */
export function calculateDaysPassed(startDate: string): number {
  // ✅ FIXED: Parse start date in local time
  const start = new Date(startDate + 'T00:00:00');
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function calculateWeeksPassed(startDate: string): number {
  return Math.ceil(calculateDaysPassed(startDate) / 7);
}

/**
 * Calculate goal progress based on completed lessons
 */
export async function calculateGoalProgress(
  settings: SchoolYearSettings,
  completedLessons: { duration_minutes: number; lesson_date: string }[],
  holidays: Holiday[] = []
): Promise<GoalProgress> {
  const totalDaysInYear = calculateTotalSchoolDays(
    settings.school_year_start,
    settings.school_year_end,
    settings.homeschool_days,
    holidays
  );
  
  const totalWeeksInYear = calculateTotalWeeks(
    settings.school_year_start,
    settings.school_year_end
  );
  
  const daysPassed = calculateDaysPassed(settings.school_year_start);
  const weeksPassed = calculateWeeksPassed(settings.school_year_start);
  
  // Calculate current progress
  const currentHours = completedLessons.reduce(
    (sum, lesson) => sum + (lesson.duration_minutes / 60),
    0
  );
  
  const currentDays = completedLessons.filter(
    lesson => lesson.lesson_date
  ).length;
  
  // Calculate progress percentages
  const hoursProgress = settings.annual_goal_type === 'hours'
    ? (currentHours / settings.annual_goal_value) * 100
    : 0;
    
  const daysProgress = settings.annual_goal_type === 'lessons'
    ? (currentDays / settings.annual_goal_value) * 100
    : 0;
  
  // Calculate average hours per week
  const averageHoursPerWeek = weeksPassed > 0 
    ? currentHours / weeksPassed 
    : 0;
  
  // Calculate if on track
  const expectedProgressPercentage = (daysPassed / totalDaysInYear) * 100;
  const actualProgress = settings.annual_goal_type === 'hours' 
    ? hoursProgress 
    : daysProgress;
  
  const onTrack = actualProgress >= (expectedProgressPercentage * 0.9); // 90% threshold
  
  // Project final total based on current pace
  const projectedTotal = totalWeeksInYear > 0
    ? averageHoursPerWeek * totalWeeksInYear
    : 0;
  
  // Calculate adjustment needed
  let needsAdjustment: string | null = null;
  if (!onTrack && weeksPassed > 2) {
    const remainingWeeks = totalWeeksInYear - weeksPassed;
    const remainingGoal = settings.annual_goal_type === 'hours'
      ? settings.annual_goal_value - currentHours
      : settings.annual_goal_value - currentDays;
    
    const neededPerWeek = remainingWeeks > 0 
      ? remainingGoal / remainingWeeks 
      : remainingGoal;
    
    if (settings.annual_goal_type === 'hours') {
      needsAdjustment = `Need ${neededPerWeek.toFixed(1)} hours/week to reach goal`;
    } else {
      needsAdjustment = `Need ${Math.ceil(neededPerWeek)} lessons/week to reach goal`;
    }
  }
  
  return {
    totalDaysInYear,
    totalWeeksInYear,
    daysPassed,
    weeksPassed,
    currentHours,
    currentDays,
    goalHours: settings.annual_goal_type === 'hours' ? settings.annual_goal_value : 0,
    goalDays: settings.annual_goal_type === 'lessons' ? settings.annual_goal_value : 0,
    weeklyGoalHours: settings.weekly_goal_hours,
    hoursProgress,
    daysProgress,
    averageHoursPerWeek,
    onTrack,
    projectedTotal,
    needsAdjustment
  };
}

/**
 * Validate if a date falls on a configured homeschool day (and not a holiday)
 * ✅ UPDATED: Now accepts holidays parameter for complete validation
 */
export function isValidHomeschoolDay(
  date: string,
  homeschoolDays: string[],
  holidays: Holiday[] = []
): boolean {
  // ✅ CRITICAL: Parse as local date, not UTC
  const dateObj = new Date(date + 'T00:00:00');
  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
  
  // Check if it's a configured homeschool day
  if (!homeschoolDays.includes(dayName)) {
    return false;
  }
  
  // Check if it's a holiday
  const isHoliday = holidays.some(holiday => {
    if (!holiday.enabled) return false;
    
    // ✅ FIXED: Parse holidays in local time
    const holidayStart = new Date(holiday.start + 'T00:00:00');
    const holidayEnd = new Date(holiday.end + 'T00:00:00');
    
    return dateObj >= holidayStart && dateObj <= holidayEnd;
  });
  
  if (isHoliday) {
    return false;
  }
  
  return true;
}

/**
 * Validate if a date is within the school year
 */
export function isWithinSchoolYear(
  date: string,
  startDate: string,
  endDate: string
): boolean {
  // ✅ FIXED: Parse all dates in local time to avoid timezone bugs
  const d = new Date(date + 'T00:00:00');
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  return d >= start && d <= end;
}

/**
 * Get all lessons that are scheduled on invalid days
 */
export function getInvalidLessons(
  lessons: { id: string; lesson_date: string | null; title: string }[],
  settings: SchoolYearSettings,
  holidays: Holiday[] = []
): { id: string; lesson_date: string; title: string; reason: string }[] {
  const invalid: { id: string; lesson_date: string; title: string; reason: string }[] = [];
  
  lessons.forEach(lesson => {
    if (!lesson.lesson_date) return;
    
    // Check if within school year
    if (!isWithinSchoolYear(lesson.lesson_date, settings.school_year_start, settings.school_year_end)) {
      invalid.push({
        id: lesson.id,
        lesson_date: lesson.lesson_date,
        title: lesson.title,
        reason: 'Outside school year dates'
      });
      return;
    }
    
    // Check if on a valid homeschool day (now with holidays)
    if (!isValidHomeschoolDay(lesson.lesson_date, settings.homeschool_days, holidays)) {
      // ✅ FIXED: Parse in local time
      const dayName = new Date(lesson.lesson_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });
      invalid.push({
        id: lesson.id,
        lesson_date: lesson.lesson_date,
        title: lesson.title,
        reason: `Scheduled on ${dayName} (not a homeschool day)`
      });
    }
  });
  
  return invalid;
}

/**
 * Get next available homeschool day
 */
export function getNextAvailableDay(
  fromDate: string,
  homeschoolDays: string[],
  endDate: string,
  holidays: Holiday[] = []
): string | null {
  // ✅ FIXED: Parse dates in local time
  const current = new Date(fromDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  
  while (current <= end) {
    const dayName = current.toLocaleDateString('en-US', { weekday: 'long' });
    
    if (homeschoolDays.includes(dayName)) {
      const isHoliday = holidays.some(holiday => {
        // ✅ FIXED: Parse holiday dates in local time
        const holidayStart = new Date(holiday.start + 'T00:00:00');
        const holidayEnd = new Date(holiday.end + 'T00:00:00');
        return current >= holidayStart && current <= holidayEnd && holiday.enabled;
      });
      
      if (!isHoliday) {
        return current.toISOString().split('T')[0];
      }
    }
    
    current.setDate(current.getDate() + 1);
  }
  
  return null;
}