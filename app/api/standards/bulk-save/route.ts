import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getOrganizationId } from '@/src/lib/auth-helpers'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {},
        remove(name: string, options: CookieOptions) {},
      },
    }
  )

  try {
    const { standards } = await request.json();

    // Get authenticated user and their organization
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get organization ID from the authenticated user
    const organizationId = await getOrganizationId();
    
    if (!organizationId) {
      return NextResponse.json({ 
        error: 'Organization not found' 
      }, { status: 404 });
    }

    const standardsToInsert = standards.map((s: any) => ({
      organization_id: organizationId,  // ✅ Use real org ID
      state_code: s.state_code || 'XX',
      grade_level: String(s.grade_level),
      subject: s.subject,
      standard_code: s.standard_code || `AI-${Date.now()}`,
      description: s.description,
      domain: s.domain || 'General',
      active: true,
      customized: true
    }));

    const { data, error } = await supabase
      .from('standards')
      .insert(standardsToInsert)
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, count: data?.length || 0 });

  } catch (error: any) {
    console.error('Detailed Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}