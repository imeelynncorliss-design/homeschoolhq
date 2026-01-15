// app/api/standards/templates/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Fetch template standards
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const stateCode = searchParams.get('state_code');
    const subject = searchParams.get('subject');
    const gradeLevel = searchParams.get('grade_level');

    let query = supabaseAdmin
      .from('standard_templates')
      .select('*')
      .order('state_code')
      .order('grade_level')
      .order('subject');

    if (stateCode) query = query.eq('state_code', stateCode);
    if (subject) query = query.eq('subject', subject);
    if (gradeLevel) query = query.eq('grade_level', gradeLevel);

    const { data: templates, error } = await query;

    if (error) {
      console.error('Error fetching templates:', error);
      return NextResponse.json(
        { success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch templates' } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { templates: templates || [] }
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

// POST - Copy template to user_standards
export async function POST(request: NextRequest) {
  try {
    // Get user's organization
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_ERROR', message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_ERROR', message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    // Get organization
    const { data: kids } = await supabaseAdmin
      .from('kids')
      .select('organization_id')
      .eq('user_id', user.id)
      .limit(1);
    
    if (!kids || kids.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_ORG', message: 'No organization found' } },
        { status: 400 }
      );
    }

    const organizationId = kids[0].organization_id;

    // Get template IDs to copy
    const body = await request.json();
    const { template_ids } = body;

    if (!template_ids || !Array.isArray(template_ids) || template_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'template_ids array is required' } },
        { status: 400 }
      );
    }

    // Fetch templates
    const { data: templates, error: fetchError } = await supabaseAdmin
      .from('standard_templates')
      .select('*')
      .in('id', template_ids);

    if (fetchError || !templates) {
      return NextResponse.json(
        { success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch templates' } },
        { status: 500 }
      );
    }

    // Check for duplicates first - need to check state_code + standard_code combination
    const { data: existingStandards } = await supabaseAdmin
      .from('user_standards')
      .select('state_code, standard_code')
      .eq('organization_id', organizationId);

    // Create a Set of composite keys "STATE:CODE"
    const existingKeys = new Set(
      existingStandards?.map(s => `${s.state_code}:${s.standard_code}`) || []
    );
    
    // Filter out duplicates using composite key
    const templatesFiltered = templates.filter(
      t => !existingKeys.has(`${t.state_code}:${t.standard_code}`)
    );
    
    if (templatesFiltered.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'DUPLICATES', message: 'All selected standards already exist in your library' } },
        { status: 400 }
      );
    }

    // Copy to user_standards
    const userStandards = templatesFiltered.map(template => ({
      organization_id: organizationId,
      state_code: template.state_code,
      grade_level: template.grade_level,
      subject: template.subject,
      standard_code: template.standard_code,
      description: template.description,
      domain: template.domain || null,
      source: template.source_name || 'template_import',
      imported_date: new Date().toISOString(),
      customized: false,
      active: true
    }));

    const { data, error: insertError } = await supabaseAdmin
      .from('user_standards')
      .insert(userStandards)
      .select();

    if (insertError) {
      console.error('Error inserting standards:', insertError);
      console.error('Insert error details:', JSON.stringify(insertError, null, 2));
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'INSERT_ERROR', 
            message: `Failed to import standards: ${insertError.message}`,
            details: insertError
          } 
        },
        { status: 500 }
      );
    }

    const skipped = templates.length - templatesFiltered.length;

    return NextResponse.json({
      success: true,
      data: { imported: data.length, skipped },
      message: skipped > 0 
        ? `Successfully imported ${data.length} standards (${skipped} duplicates skipped)`
        : `Successfully imported ${data.length} standards`
    }, { status: 201 });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}