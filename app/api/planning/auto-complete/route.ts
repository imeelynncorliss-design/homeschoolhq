// app/api/planning/auto-complete/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Auto-Complete Planning Tasks
 * 
 * This endpoint checks if planning tasks should be auto-completed based on
 * actual work done in the system (curriculum imports, lesson scheduling, etc.)
 * 
 * Call this after:
 * - Curriculum import
 * - Lesson scheduling
 * - Standards mapping
 * - Student profile updates
 */
export async function POST(request: Request) {
  try {
    const { organization_id, planning_period_id, trigger_event } = await request.json();

    if (!organization_id) {
      return NextResponse.json(
        { error: 'organization_id is required' },
        { status: 400 }
      );
    }

    // Get active planning period (use provided ID or find current active one)
    let periodId = planning_period_id;
    
    if (!periodId) {
      const { data: activePeriod } = await supabase
        .from('planning_periods')
        .select('id')
        .eq('organization_id', organization_id)
        .eq('is_active', true)
        .lte('start_date', new Date().toISOString().split('T')[0])
        .gte('end_date', new Date().toISOString().split('T')[0])
        .single();

      if (!activePeriod) {
        return NextResponse.json({ 
          message: 'No active planning period',
          completed_tasks: []
        });
      }

      periodId = activePeriod.id;
    }

    // Get the planning period details
    const { data: period, error: periodError } = await supabase
      .from('planning_periods')
      .select('*, school_year_config:school_year_config_id(*)')
      .eq('id', periodId)
      .single();

    if (periodError || !period) {
      return NextResponse.json(
        { error: 'Planning period not found' },
        { status: 404 }
      );
    }

    const completedTasks: any[] = [];

    // ============================================
    // CHECK 1: Curriculum Import Task
    // ============================================
    if (!trigger_event || trigger_event === 'curriculum_import') {
      const { count: importCount } = await supabase
        .from('curriculum_imports')
        .select('*', { count: 'exact', head: true })
        .eq('planning_period_id', periodId);

      // Alternative: Check if lessons were created during planning period
      const { count: lessonsCount } = await supabase
        .from('lessons')
        .select('*', { count: 'exact', head: true })
        .eq('planning_period_id', periodId);

      if ((importCount && importCount >= 1) || (lessonsCount && lessonsCount >= 10)) {
        const { data: task, error: taskError } = await supabase
          .from('planning_tasks')
          .update({
            is_completed: true,
            completed_at: new Date().toISOString(),
            auto_completed: true,
            completion_source: 'curriculum_import',
            completion_metadata: { 
              import_count: importCount || 0,
              lessons_count: lessonsCount || 0
            }
          })
          .eq('planning_period_id', periodId)
          .eq('task_key', 'import_curriculum')
          .eq('is_completed', false)
          .select()
          .maybeSingle();

        if (task && !taskError) completedTasks.push(task);
      }
    }

    // ============================================
    // CHECK 2: Standards Mapping Task
    // ============================================
    if (!trigger_event || trigger_event === 'standards_mapping') {
      // Count standards added to assessments for this organization
      const { data: assessments } = await supabase
        .from('assessments')
        .select('id')
        .eq('organization_id', organization_id);

      if (assessments && assessments.length > 0) {
        const assessmentIds = assessments.map(a => a.id);
        
        const { count: standardsCount } = await supabase
          .from('assessment_standards')
          .select('*', { count: 'exact', head: true })
          .in('assessment_id', assessmentIds);

        if (standardsCount && standardsCount >= 5) {
          const { data: task, error: taskError } = await supabase
            .from('planning_tasks')
            .update({
              is_completed: true,
              completed_at: new Date().toISOString(),
              auto_completed: true,
              completion_source: 'standards_mapping',
              completion_metadata: { standards_count: standardsCount }
            })
            .eq('planning_period_id', periodId)
            .eq('task_key', 'map_standards')
            .eq('is_completed', false)
            .select()
            .maybeSingle();

          if (task && !taskError) completedTasks.push(task);
        }
      }
    }

    // ============================================
    // CHECK 3: First Month Planning Task
    // ============================================
    if (!trigger_event || trigger_event === 'lesson_scheduling') {
      // Get school year start date
      const schoolYearStart = period.school_year_config?.school_year_start_date;

      if (schoolYearStart) {
        const firstMonthEnd = new Date(schoolYearStart);
        firstMonthEnd.setMonth(firstMonthEnd.getMonth() + 1);

        const { count: firstMonthLessons } = await supabase
          .from('lessons')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organization_id)
          .gte('scheduled_start_date', schoolYearStart)
          .lte('scheduled_start_date', firstMonthEnd.toISOString().split('T')[0]);

        if (firstMonthLessons && firstMonthLessons >= 20) {
          const { data: task, error: taskError } = await supabase
            .from('planning_tasks')
            .update({
              is_completed: true,
              completed_at: new Date().toISOString(),
              auto_completed: true,
              completion_source: 'lesson_scheduling',
              completion_metadata: { 
                lessons_count: firstMonthLessons,
                school_year_start: schoolYearStart
              }
            })
            .eq('planning_period_id', periodId)
            .eq('task_key', 'plan_first_month')
            .eq('is_completed', false)
            .select()
            .maybeSingle();

          if (task && !taskError) completedTasks.push(task);
        }
      }
    }

    // ============================================
    // CHECK 4: Student Profiles Updated
    // ============================================
    if (!trigger_event || trigger_event === 'student_update') {
      // Check if kids were updated during planning period
      const { count: updatedKids } = await supabase
        .from('kids')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organization_id)
        .gte('updated_at', period.start_date)
        .not('grade', 'is', null);

      // Check total kids count
      const { count: totalKids } = await supabase
        .from('kids')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organization_id);

      // If all kids have been updated and have grades
      if (updatedKids && totalKids && updatedKids === totalKids && totalKids > 0) {
        const { data: task, error: taskError } = await supabase
          .from('planning_tasks')
          .update({
            is_completed: true,
            completed_at: new Date().toISOString(),
            auto_completed: true,
            completion_source: 'student_update',
            completion_metadata: { 
              students_updated: updatedKids,
              total_students: totalKids
            }
          })
          .eq('planning_period_id', periodId)
          .eq('task_key', 'update_profiles')
          .eq('is_completed', false)
          .select()
          .maybeSingle();

        if (task && !taskError) completedTasks.push(task);
      }
    }

    // ============================================
    // CHECK 5: School Days Configuration
    // ============================================
    if (!trigger_event || trigger_event === 'school_config') {
      const schoolYearConfigId = period.school_year_config_id;

      if (schoolYearConfigId) {
        // Check if school_days is set
        const { data: config } = await supabase
          .from('school_year_config')
          .select('school_days')
          .eq('id', schoolYearConfigId)
          .single();

        // Check if at least one vacation period exists
        const { count: vacationCount } = await supabase
          .from('vacation_periods')
          .select('*', { count: 'exact', head: true })
          .eq('school_year_config_id', schoolYearConfigId);

        if (config?.school_days && vacationCount && vacationCount >= 1) {
          const { data: task, error: taskError } = await supabase
            .from('planning_tasks')
            .update({
              is_completed: true,
              completed_at: new Date().toISOString(),
              auto_completed: true,
              completion_source: 'school_config',
              completion_metadata: { 
                school_days: config.school_days,
                vacation_periods: vacationCount
              }
            })
            .eq('planning_period_id', periodId)
            .eq('task_key', 'set_school_days')
            .eq('is_completed', false)
            .select()
            .maybeSingle();

          if (task && !taskError) completedTasks.push(task);
        }
      }
    }

    return NextResponse.json({
      success: true,
      planning_period_id: periodId,
      completed_tasks: completedTasks,
      message: `Auto-completed ${completedTasks.length} task(s)`,
      trigger_event: trigger_event || 'all_checks'
    });

  } catch (error: any) {
    console.error('Error in auto-complete:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to auto-complete tasks' },
      { status: 500 }
    );
  }
}

// GET - Check what tasks WOULD be auto-completed (dry run)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organization_id');
    const planningPeriodId = searchParams.get('planning_period_id');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organization_id is required' },
        { status: 400 }
      );
    }

    // This would run the same checks but return results without updating
    // Implementation similar to POST but without the .update() calls
    
    return NextResponse.json({
      message: 'Dry run - checking what would be auto-completed',
      note: 'Implementation pending'
    });

  } catch (error: any) {
    console.error('Error in auto-complete check:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check auto-completion' },
      { status: 500 }
    );
  }
}