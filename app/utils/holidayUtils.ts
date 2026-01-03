// US Holidays for 2025-2026 School Year
// Parents can customize/add/remove as needed

export interface Holiday {
    name: string;
    start: string; // YYYY-MM-DD format
    end: string;   // YYYY-MM-DD format
    enabled: boolean;
  }
  
  export const DEFAULT_HOLIDAYS_2025_2026: Holiday[] = [
    {
      name: "Labor Day",
      start: "2025-09-01",
      end: "2025-09-01",
      enabled: true
    },
    {
      name: "Thanksgiving Break",
      start: "2025-11-27",
      end: "2025-11-28",
      enabled: true
    },
    {
      name: "Winter Break",
      start: "2025-12-22",
      end: "2026-01-05",
      enabled: true
    },
    {
      name: "Martin Luther King Jr. Day",
      start: "2026-01-19",
      end: "2026-01-19",
      enabled: true
    },
    {
      name: "Presidents' Day",
      start: "2026-02-16",
      end: "2026-02-16",
      enabled: true
    },
    {
      name: "Spring Break",
      start: "2026-03-23",
      end: "2026-03-27",
      enabled: true
    },
    {
      name: "Memorial Day",
      start: "2026-05-25",
      end: "2026-05-25",
      enabled: true
    }
  ];
  
  // Function to check if a date is a holiday
  export function isHoliday(date: Date, holidays: Holiday[]): boolean {
    const dateStr = date.toISOString().split('T')[0];
    
    return holidays.some(holiday => {
      if (!holiday.enabled) return false;
      return dateStr >= holiday.start && dateStr <= holiday.end;
    });
  }
  
  // Function to check if a date is a weekend
  export function isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday = 0, Saturday = 6
  }
  
  // Function to get day name from date
  export function getDayName(date: Date): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  }
  
  // Function to check if date should be included in schedule
  export function isValidSchoolDay(
    date: Date, 
    homeschoolDays: string[], 
    holidays: Holiday[],
    skipWeekends: boolean = true
  ): boolean {
    // Skip weekends if enabled
    if (skipWeekends && isWeekend(date)) return false;
    
    // Skip holidays
    if (isHoliday(date, holidays)) return false;
    
    // Check if this day is in the homeschool days
    const dayName = getDayName(date);
    return homeschoolDays.includes(dayName);
  }