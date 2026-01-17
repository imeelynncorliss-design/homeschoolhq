// app/api/standards/import/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
});

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
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

    // Get user's organization
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

    // Parse request body
    const body = await request.json();
    const { type, url, file, filename } = body;

    let claudeResponse;

    // Handle different import types
    if (type === 'url') {
      // Fetch the webpage content
      const webResponse = await fetch(url);
      const htmlContent = await webResponse.text();

      // Ask Claude to extract standards from the HTML
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: `Extract all educational standards from this webpage content. For each standard, provide:
- grade_level: Single value (K, P, or 1-12). For ranges like "3-5", use the first number "3"
- subject (e.g., "Mathematics", "English Language Arts", "Science")
- standard_code (the official code if available)
- description (what the student should know/do)
- domain (the category/topic area)
- state_code: 2-letter US state code (CA, TX, NY, etc.) or "CC" for Common Core. Use "XX" if unknown.

Return ONLY a valid JSON object with this exact structure (no markdown, no extra text):
{
  "standards": [
    {
      "grade_level": "3",
      "subject": "Mathematics",
      "standard_code": "3.OA.A.1",
      "description": "Interpret products of whole numbers",
      "domain": "Operations & Algebraic Thinking",
      "state_code": "CA"
    }
  ]
}

Webpage content:
${htmlContent.slice(0, 50000)}`
        }]
      });

      const textContent = message.content.find(c => c.type === 'text');
      if (textContent && 'text' in textContent) {
        claudeResponse = textContent.text;
      }

    } else if (type === 'pdf' || type === 'image') {
      // Handle PDF or image upload
      const mediaType = type === 'pdf' ? 'application/pdf' : 'image/jpeg';

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: [
            {
              type: type === 'pdf' ? 'document' : 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: file
              }
            },
            {
              type: 'text',
              text: `Extract all educational standards from this ${type}. For each standard, provide:
- grade_level: Single value (K, P, or 1-12). For ranges like "3-5", use the first number "3"
- subject (e.g., "Mathematics", "English Language Arts", "Science")
- standard_code (the official code if available)
- description (what the student should know/do)
- domain (the category/topic area)
- state_code: 2-letter US state code (CA, TX, NY, etc.) or "CC" for Common Core. Use "XX" if unknown.

Return ONLY a valid JSON object with this exact structure (no markdown, no extra text):
{
  "standards": [
    {
      "grade_level": "3",
      "subject": "Mathematics",
      "standard_code": "3.OA.A.1",
      "description": "Interpret products of whole numbers",
      "domain": "Operations & Algebraic Thinking",
      "state_code": "CA"
    }
  ]
}`
            }
          ]
        }]
      });

      const textContent = message.content.find(c => c.type === 'text');
      if (textContent && 'text' in textContent) {
        claudeResponse = textContent.text;
      }
    } else {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_TYPE', message: 'Invalid import type' } },
        { status: 400 }
      );
    }

    // Parse Claude's response
    if (!claudeResponse) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_RESPONSE', message: 'No response from AI' } },
        { status: 500 }
      );
    }

    // Extract JSON from response (handle markdown code blocks)
    let jsonMatch = claudeResponse.match(/\{[\s\S]*"standards"[\s\S]*\}/);
    if (!jsonMatch) {
      // Try to find JSON in code blocks
      jsonMatch = claudeResponse.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        jsonMatch[0] = jsonMatch[1];
      }
    }

    if (!jsonMatch) {
      return NextResponse.json({
        success: false,
        error: { 
          code: 'PARSE_ERROR', 
          message: 'Could not parse standards from content. The AI may have been unable to identify clear standards in the provided content.' 
        }
      }, { status: 400 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const standards = parsed.standards;

    if (!standards || !Array.isArray(standards) || standards.length === 0) {
      return NextResponse.json({
        success: false,
        error: { code: 'NO_STANDARDS', message: 'No standards found in the content' }
      }, { status: 400 });
    }

    // Helper function to normalize state codes
    const normalizeStateCode = (code: string | undefined): string => {
      if (!code) return 'XX'; // Unknown state
      
      // If it's already a valid 2-letter state code, use it
      const cleaned = code.trim().toUpperCase();
      if (cleaned.length === 2 && /^[A-Z]{2}$/.test(cleaned)) {
        return cleaned;
      }
      
      // Common state name to code mappings
      const stateMap: { [key: string]: string } = {
        'CALIFORNIA': 'CA', 'TEXAS': 'TX', 'FLORIDA': 'FL', 'NEW YORK': 'NY',
        'PENNSYLVANIA': 'PA', 'ILLINOIS': 'IL', 'OHIO': 'OH', 'GEORGIA': 'GA',
        'NORTH CAROLINA': 'NC', 'MICHIGAN': 'MI', 'NEW JERSEY': 'NJ', 'VIRGINIA': 'VA',
        'WASHINGTON': 'WA', 'ARIZONA': 'AZ', 'MASSACHUSETTS': 'MA', 'TENNESSEE': 'TN',
        'INDIANA': 'IN', 'MISSOURI': 'MO', 'MARYLAND': 'MD', 'WISCONSIN': 'WI',
        'COLORADO': 'CO', 'MINNESOTA': 'MN', 'SOUTH CAROLINA': 'SC', 'ALABAMA': 'AL',
        'LOUISIANA': 'LA', 'KENTUCKY': 'KY', 'OREGON': 'OR', 'OKLAHOMA': 'OK',
        'CONNECTICUT': 'CT', 'UTAH': 'UT', 'IOWA': 'IA', 'NEVADA': 'NV',
        'ARKANSAS': 'AR', 'MISSISSIPPI': 'MS', 'KANSAS': 'KS', 'NEW MEXICO': 'NM',
        'NEBRASKA': 'NE', 'WEST VIRGINIA': 'WV', 'IDAHO': 'ID', 'HAWAII': 'HI',
        'NEW HAMPSHIRE': 'NH', 'MAINE': 'ME', 'RHODE ISLAND': 'RI', 'MONTANA': 'MT',
        'DELAWARE': 'DE', 'SOUTH DAKOTA': 'SD', 'NORTH DAKOTA': 'ND', 'ALASKA': 'AK',
        'VERMONT': 'VT', 'WYOMING': 'WY'
      };
      
      const upperName = cleaned.toUpperCase();
      if (stateMap[upperName]) {
        return stateMap[upperName];
      }
      
      // For CCSS, Common Core, etc.
      if (cleaned.includes('COMMON') || cleaned.includes('CCSS')) {
        return 'CC'; // Common Core
      }
      
      // Default to XX for unknown
      return 'XX';
    };
    
    // Helper function to normalize grade levels
    const normalizeGradeLevel = (grade: string | undefined): string => {
      if (!grade) return 'X';
      
      const cleaned = grade.trim().toUpperCase();
      
      // Handle common formats
      if (cleaned === 'K' || cleaned === 'KINDERGARTEN') return 'K';
      if (cleaned === 'PK' || cleaned === 'PRE-K' || cleaned === 'PREK') return 'P';
      
      // Extract first number from ranges like "3-5", "K-2", "9-12"
      const rangeMatch = cleaned.match(/^(\d+|K|P)-/);
      if (rangeMatch) {
        return rangeMatch[1] === 'K' ? 'K' : rangeMatch[1] === 'P' ? 'P' : rangeMatch[1];
      }
      
      // Extract just the number
      const numMatch = cleaned.match(/\d+/);
      if (numMatch) {
        const num = parseInt(numMatch[0]);
        if (num >= 0 && num <= 12) return num.toString();
      }
      
      // Default to X for unknown
      return 'X';
    };

    // Prepare standards for insertion into user_standards table
    const standardsToInsert = standards.map((std: any) => ({
      organization_id: organizationId,
      state_code: normalizeStateCode(std.state_code),
      grade_level: normalizeGradeLevel(std.grade_level),
      subject: std.subject,
      standard_code: std.standard_code || `CUSTOM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      description: std.description,
      domain: std.domain || 'General',
      source: type === 'url' ? url : `User Upload: ${filename || 'file'}`,
      imported_date: new Date().toISOString(),
      customized: true,
      active: true
    }));

    // Insert into user_standards
    const { data, error } = await supabaseAdmin
      .from('user_standards')
      .insert(standardsToInsert)
      .select();

    if (error) {
      console.error('Database insert error:', error);
      return NextResponse.json({
        success: false,
        error: { 
          code: 'INSERT_ERROR', 
          message: `Failed to save standards: ${error.message}` 
        }
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        count: data.length,
        standards: data
      },
      message: `Successfully imported ${data.length} standards`
    }, { status: 201 });

  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json({
      success: false,
      error: { 
        code: 'SERVER_ERROR', 
        message: error.message || 'Internal server error' 
      }
    }, { status: 500 });
  }
}