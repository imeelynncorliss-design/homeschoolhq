import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { stateCode } = await request.json()
    
    // Get authorization from request headers
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader) {
      console.error('No authorization header')
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Extract the token (format: "Bearer <token>")
    const token = authHeader.replace('Bearer ', '')
    
    // Get user using the token
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      console.error('Auth error:', userError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Authenticated user:', user.id)

    // Get user's organization
    const { data: kids, error: kidError } = await supabaseAdmin
      .from('kids')
      .select('organization_id')
      .eq('user_id', user.id)
      .limit(1)

if (kidError || !kids || kids.length === 0) {
  console.error('No organization found:', kidError)
  return NextResponse.json({ error: 'No organization found' }, { status: 404 })
}

const organizationId = kids[0].organization_id

    // Check if already has standards
    const { count: existingCount } = await supabaseAdmin
      .from('user_standards')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('state_code', stateCode)

    if (existingCount && existingCount > 0) {
      return NextResponse.json({ 
        error: `You already have ${existingCount} standards imported for ${stateCode}. You can manage them in settings.`,
      }, { status: 400 })
    }

    // Get template version
    const templateVersion = `2024-${stateCode}-CCSS`
    console.log('Fetching template:', templateVersion)

    // Get templates
    const { data: templates, error: fetchError } = await supabaseAdmin
      .from('standard_templates')
      .select('*')
      .eq('state_code', stateCode)
      .eq('template_version', templateVersion)

    if (fetchError) {
      console.error('Template fetch error:', fetchError)
      return NextResponse.json({ 
        error: 'Failed to fetch templates' 
      }, { status: 500 })
    }

    if (!templates || templates.length === 0) {
      console.error('No templates found for:', stateCode, templateVersion)
      return NextResponse.json({ 
        error: 'No template available for this state' 
      }, { status: 404 })
    }

    console.log('Found templates:', templates.length)

    // Transform to user_standards
    const userStandards = templates.map((t: any) => ({
      organization_id: organizationId,
      state_code: t.state_code,
      grade_level: t.grade_level,
      subject: t.subject,
      standard_code: t.standard_code,
      description: t.description,
      domain: t.domain,
      source: 'template',
      template_id: t.id,
      template_version: t.template_version,
      imported_date: new Date().toISOString(),
      active: true
    }))

    // Insert
    const { error: insertError } = await supabaseAdmin
      .from('user_standards')
      .insert(userStandards)

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json({ 
        error: 'Failed to import standards: ' + insertError.message 
      }, { status: 500 })
    }

    console.log('Successfully imported:', userStandards.length, 'standards')

    return NextResponse.json({ 
      success: true, 
      count: userStandards.length,
      stateCode
    })

  } catch (error) {
    console.error('Clone template error:', error)
    return NextResponse.json({ 
      error: 'Failed to import standards' 
    }, { status: 500 })
  }
}