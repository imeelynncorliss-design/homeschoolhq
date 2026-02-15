// app/api/fetch-holidays/route.ts
import { NextResponse } from 'next/server';

/**
 * Fetch US Federal Holidays API
 * 
 * This endpoint generates US federal holidays for a given year range
 * and formats them for insertion into the vacation_periods table.
 * 
 * No user_id needed - holidays belong to the organization/school year.
 */

interface Holiday {
  name: string;
  start_date: string;
  end_date: string;
  organization_id: string;
  school_year_config_id: string;
  user_id: string;
  vacation_type: 'holiday';
  notes: string | null;
}

export async function POST(request: Request) {
  try {
    const { organizationId, schoolYearConfigId, userId, startYear } = await request.json();

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 }
      );
    }

    if (!schoolYearConfigId) {
      return NextResponse.json(
        { error: 'schoolYearConfigId is required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required for audit trail' },
        { status: 400 }
      );
    }

    const year = startYear || new Date().getFullYear();

    // US Federal Holidays for the given year
    const holidays: Holiday[] = [
      {
        name: "New Year's Day",
        start_date: `${year}-01-01`,
        end_date: `${year}-01-01`,
        organization_id: organizationId,
        school_year_config_id: schoolYearConfigId,
        user_id: userId,
        vacation_type: 'holiday',
        notes: 'Federal Holiday'
      },
      {
        name: "Martin Luther King Jr. Day",
        start_date: calculateMLKDay(year),
        end_date: calculateMLKDay(year),
        organization_id: organizationId,
        school_year_config_id: schoolYearConfigId,
        user_id: userId,
        vacation_type: 'holiday',
        notes: 'Federal Holiday - Third Monday in January'
      },
      {
        name: "Presidents' Day",
        start_date: calculatePresidentsDay(year),
        end_date: calculatePresidentsDay(year),
        organization_id: organizationId,
        school_year_config_id: schoolYearConfigId,
        user_id: userId,
        vacation_type: 'holiday',
        notes: 'Federal Holiday - Third Monday in February'
      },
      {
        name: "Memorial Day",
        start_date: calculateMemorialDay(year),
        end_date: calculateMemorialDay(year),
        organization_id: organizationId,
        school_year_config_id: schoolYearConfigId,
        user_id: userId,
        vacation_type: 'holiday',
        notes: 'Federal Holiday - Last Monday in May'
      },
      {
        name: "Juneteenth",
        start_date: `${year}-06-19`,
        end_date: `${year}-06-19`,
        organization_id: organizationId,
        school_year_config_id: schoolYearConfigId,
        user_id: userId,
        vacation_type: 'holiday',
        notes: 'Federal Holiday'
      },
      {
        name: "Independence Day",
        start_date: `${year}-07-04`,
        end_date: `${year}-07-04`,
        organization_id: organizationId,
        school_year_config_id: schoolYearConfigId,
        user_id: userId,
        vacation_type: 'holiday',
        notes: 'Federal Holiday'
      },
      {
        name: "Labor Day",
        start_date: calculateLaborDay(year),
        end_date: calculateLaborDay(year),
        organization_id: organizationId,
        school_year_config_id: schoolYearConfigId,
        user_id: userId,
        vacation_type: 'holiday',
        notes: 'Federal Holiday - First Monday in September'
      },
      {
        name: "Columbus Day / Indigenous Peoples' Day",
        start_date: calculateColumbusDay(year),
        end_date: calculateColumbusDay(year),
        organization_id: organizationId,
        school_year_config_id: schoolYearConfigId,
        user_id: userId,
        vacation_type: 'holiday',
        notes: 'Federal Holiday - Second Monday in October'
      },
      {
        name: "Veterans Day",
        start_date: `${year}-11-11`,
        end_date: `${year}-11-11`,
        organization_id: organizationId,
        school_year_config_id: schoolYearConfigId,
        user_id: userId,
        vacation_type: 'holiday',
        notes: 'Federal Holiday'
      },
      {
        name: "Thanksgiving",
        start_date: calculateThanksgiving(year),
        end_date: calculateThanksgiving(year),
        organization_id: organizationId,
        school_year_config_id: schoolYearConfigId,
        user_id: userId,
        vacation_type: 'holiday',
        notes: 'Federal Holiday - Fourth Thursday in November'
      },
      {
        name: "Christmas Day",
        start_date: `${year}-12-25`,
        end_date: `${year}-12-25`,
        organization_id: organizationId,
        school_year_config_id: schoolYearConfigId,
        user_id: userId,
        vacation_type: 'holiday',
        notes: 'Federal Holiday'
      }
    ];

    // Also add next year's New Year's Day if we're fetching for the current year
    if (year === new Date().getFullYear()) {
      holidays.push({
        name: "New Year's Day",
        start_date: `${year + 1}-01-01`,
        end_date: `${year + 1}-01-01`,
        organization_id: organizationId,
        school_year_config_id: schoolYearConfigId,
        user_id: userId,
        vacation_type: 'holiday',
        notes: 'Federal Holiday'
      });
    }

    return NextResponse.json({
      success: true,
      holidays,
      count: holidays.length,
      year
    });

  } catch (error: any) {
    console.error('Error generating holidays:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate holidays' },
      { status: 500 }
    );
  }
}

// Helper functions to calculate floating holidays

function calculateMLKDay(year: number): string {
  // Third Monday in January
  return getNthWeekdayOfMonth(year, 0, 1, 3); // January (0), Monday (1), 3rd occurrence
}

function calculatePresidentsDay(year: number): string {
  // Third Monday in February
  return getNthWeekdayOfMonth(year, 1, 1, 3); // February (1), Monday (1), 3rd occurrence
}

function calculateMemorialDay(year: number): string {
  // Last Monday in May
  return getLastWeekdayOfMonth(year, 4, 1); // May (4), Monday (1)
}

function calculateLaborDay(year: number): string {
  // First Monday in September
  return getNthWeekdayOfMonth(year, 8, 1, 1); // September (8), Monday (1), 1st occurrence
}

function calculateColumbusDay(year: number): string {
  // Second Monday in October
  return getNthWeekdayOfMonth(year, 9, 1, 2); // October (9), Monday (1), 2nd occurrence
}

function calculateThanksgiving(year: number): string {
  // Fourth Thursday in November
  return getNthWeekdayOfMonth(year, 10, 4, 4); // November (10), Thursday (4), 4th occurrence
}

/**
 * Get the nth occurrence of a weekday in a month
 * @param year - The year
 * @param month - The month (0-11)
 * @param weekday - The weekday (0=Sunday, 1=Monday, ..., 6=Saturday)
 * @param n - Which occurrence (1st, 2nd, 3rd, etc.)
 */
function getNthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): string {
  const date = new Date(year, month, 1);
  let count = 0;
  
  while (date.getMonth() === month) {
    if (date.getDay() === weekday) {
      count++;
      if (count === n) {
        return formatDate(date);
      }
    }
    date.setDate(date.getDate() + 1);
  }
  
  throw new Error(`Could not find ${n}th occurrence of weekday ${weekday} in month ${month}`);
}

/**
 * Get the last occurrence of a weekday in a month
 * @param year - The year
 * @param month - The month (0-11)
 * @param weekday - The weekday (0=Sunday, 1=Monday, ..., 6=Saturday)
 */
function getLastWeekdayOfMonth(year: number, month: number, weekday: number): string {
  // Start from the last day of the month and work backwards
  const date = new Date(year, month + 1, 0); // Last day of the month
  
  while (date.getMonth() === month) {
    if (date.getDay() === weekday) {
      return formatDate(date);
    }
    date.setDate(date.getDate() - 1);
  }
  
  throw new Error(`Could not find last occurrence of weekday ${weekday} in month ${month}`);
}

/**
 * Format a date object to YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}