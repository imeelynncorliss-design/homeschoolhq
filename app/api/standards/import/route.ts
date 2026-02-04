import { createClient } from '@supabase/supabase-js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getOrganizationId } from '@/src/lib/auth-helpers'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
});

export async function POST(request: Request) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) {},
        remove(name: string, options: CookieOptions) {},
      },
    }
  );

  try {
    // --- 1. AUTHENTICATION & MULTI-TENANCY ---
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = await getOrganizationId();
    
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // --- 2. AI EXTRACTION (Haiku) ---
    const { type, file, url } = await request.json();
    let rawClaudeText = "";
    const modelName = "claude-3-haiku-20240307";

    const prompt = `Extract educational standards from the provided content. 
    Return ONLY a raw JSON object with this exact structure:
    { 
      "count": number,
      "source_name": "string",
      "effective_year": "string",
      "data": [
        { "grade_level": "...", "subject": "...", "standard_code": "...", "description": "...", "domain": "...", "state_code": "..." }
      ] 
    }
    IMPORTANT: Do not include any introductory text, markdown formatting, or explanations. Just the JSON object.`;

    if (type === 'url') {
      const webRes = await fetch(url);
      const html = await webRes.text();
      const msg = await anthropic.messages.create({
        model: modelName,
        max_tokens: 4000,
        messages: [{ role: 'user', content: `${prompt}\n\nContent: ${html.slice(0, 40000)}` }]
      });
      rawClaudeText = (msg.content[0] as any).text;
    } else {
      const msg = await anthropic.messages.create({
        model: modelName,
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/png', data: file } },
            { type: 'text', text: prompt }
          ]
        }]
      });
      rawClaudeText = (msg.content[0] as any).text;
    }

    // --- 3. DEFENSIVE PARSING (Fix for "Invalid Format") ---
    let parsedData;
    try {
      // Regex strips out any preamble text Haiku might add
      const jsonMatch = rawClaudeText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in response");
      parsedData = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error("AI returned unparseable text:", rawClaudeText);
      throw new Error("AI returned invalid format. Please ensure the image is clear.");
    }

    const extractedStandards = parsedData.data || parsedData.standards || [];
    const sourceName = parsedData.source_name || (type === 'url' ? 'Web Import' : 'User Upload');
    const docUrl = type === 'url' ? url : null;

    // --- 4. ROBUST MAPPING & DATABASE SAVE ---
    const standardsToSave = extractedStandards.map((s: any) => ({
      grade_level: String(s.grade_level || 'N/A'),
      subject: s.subject || 'N/A',
      standard_code: s.standard_code || 'N/A',
      description: s.description || '',
      domain: s.domain || '',
      state_code: s.state_code || 'CUSTOM',
      // Liability Shield Fields:
      source: sourceName,
      source_url: docUrl,
      effective_year: parsedData.effective_year || new Date().getFullYear().toString(),
      organization_id: organizationId,  // ✅ Using authenticated org ID
      is_active: true,
      is_verified: false, // Core strategy: user imports are unverified
      created_at: new Date().toISOString()
    }));

    const { data: savedData, error: saveError } = await supabaseAdmin
      .from('standards')
      .insert(standardsToSave)
      .select();

    if (saveError) {
      console.error("Supabase Save Error:", saveError);
      throw new Error(`Database Error: ${saveError.message}`);
    }

    return NextResponse.json({ 
      success: true, 
      data: { standards: savedData, count: savedData.length } 
    });

  } catch (error: any) {
    console.error('Import Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || "Failed to process standards" 
    }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) {},
        remove(name: string, options: CookieOptions) {},
      },
    }
  );

  try {
    // Authenticate user
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get organization from authenticated user
    const organizationId = await getOrganizationId();
    
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const { error } = await supabaseAdmin
      .from('standards')
      .delete()
      .eq('organization_id', organizationId);  // ✅ Using authenticated org ID

    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}