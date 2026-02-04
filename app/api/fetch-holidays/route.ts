import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { organizationId, startYear } = await request.json();
    
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
    }

    const yearsToFetch = [startYear || new Date().getFullYear(), (startYear || new Date().getFullYear()) + 1];
    const allHolidays: any[] = [];

    // Fetch holidays for both years
    for (const year of yearsToFetch) {
      const response = await fetch(
        `https://date.nager.at/api/v3/PublicHolidays/${year}/US`
      );
      
      if (!response.ok) continue;
      
      const holidays = await response.json();
      
      // Filter to school-relevant holidays
      const schoolHolidays = holidays.filter((h: any) => 
        ['New Year\'s Day', 'Martin Luther King Jr. Day', 'Washington\'s Birthday', 
         'Memorial Day', 'Independence Day', 'Labour Day', 'Thanksgiving Day', 
         'Christmas Day'].includes(h.name)
      );
      
      // Format for database
      schoolHolidays.forEach((h: any) => {
        allHolidays.push({
          organization_id: organizationId,
          name: h.name === 'Washington\'s Birthday' ? 'Presidents\' Day' : h.name,
          start_date: h.date,
          end_date: h.date,
          vacation_type: 'holiday'
        });
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      holidays: allHolidays,
      count: allHolidays.length
    });
    
  } catch (error) {
    console.error('Error fetching holidays:', error);
    return NextResponse.json({ error: 'Failed to fetch holidays' }, { status: 500 });
  }
}