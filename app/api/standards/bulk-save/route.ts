import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    // 1. AWAIT the cookie store (This fixes the red squiggly)
    const cookieStore = await cookies()
    const host = request.headers.get('host')
    const isLocalhost = host?.includes('localhost') || host?.includes('127.0.0.1')
  
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            // No optional chaining needed now because cookieStore is resolved
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {},
          remove(name: string, options: CookieOptions) {},
        },
      }
    )
  
    try {
      const { standards, organization_id } = await request.json();
  
      // --- THE DEV BYPASS ---
      const { data: { session } } = await supabase.auth.getSession();
      
      // If NOT on localhost and NOT signed in, THEN block. 
      // This means if you ARE on localhost, it skips this block entirely.
      if (!isLocalhost && !session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
  
      const standardsToInsert = standards.map((s: any) => ({
        organization_id: organization_id || 'd52497c0-42a9-49b7-ba3b-849bffa27fc4',
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
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
  }