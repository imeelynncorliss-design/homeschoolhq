// ============================================================================
// API Route: /api/standards/[id]/generate-activity
// Generate AI-powered practice activities for standards
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import {
  getStandardById,
  getStudentProficiency,
  getActivitiesForStandard, 
  saveGeneratedActivity,
} from '@/lib/utils-standards';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// POST - Generate an activity for a standard
export async function POST(
  request: NextRequest,
  { params }: { params: Promise< { id: string }> }
) {
  try {
    const { id: standardId } = await params;
    const body = await request.json();
    const {
      kid_id,
      difficulty_level = 'medium',
      activity_type,
      organization_id,
      user_id,
    } = body;

    if (!organization_id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'organization_id is required',
          },
        },
        { status: 400 }
      );
    }

    // Fetch the standard
    const standard = await getStandardById(standardId);
    if (!standard) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Standard not found',
          },
        },
        { status: 404 }
      );
    }

    // Get student context if kid_id provided
    let studentContext = '';
    let learningStyle = 'balanced';
    let currentProficiency = 'not_started';

    if (kid_id) {
      // Fetch kid details (you'll need to create this function)
      // const kid = await getKidById(kid_id);
      // learningStyle = kid.learning_style || 'balanced';

      // Fetch current proficiency
      const proficiency = await getStudentProficiency(kid_id, standardId);
      if (proficiency) {
        currentProficiency = proficiency.proficiency_level;
        studentContext = `
Current proficiency level: ${proficiency.proficiency_level}
Recent assessment scores: ${proficiency.last_assessment_score || 'N/A'}
Notes: ${proficiency.notes || 'None'}`;
      }
    }

    // Build the prompt for Claude
    const prompt = `You are an expert homeschool educator creating engaging practice activities.

Generate a targeted practice activity for this standard:

**Standard Code:** ${standard.standard_code}
**Grade Level:** ${standard.grade_level}
**Subject:** ${standard.subject}
**Domain:** ${standard.domain}
**Description:** ${standard.description}

**Activity Requirements:**
- Difficulty Level: ${difficulty_level}
- Activity Type: ${activity_type || 'hands-on, game-based, or applied problem-solving'}
- Learning Style Preference: ${learningStyle}
${studentContext}

Please provide the activity in the following JSON format:
{
  "title": "Engaging, specific title for the activity",
  "activity_type": "hands_on | game_based | applied_problem_solving",
  "difficulty_level": "easy | medium | challenging",
  "description": "1-2 sentence overview of what the activity involves",
  "materials_needed": "Bulleted list of materials",
  "instructions": "Step-by-step instructions (use numbered steps)",
  "duration_minutes": estimated time in minutes (number)
}

Important:
- Make it engaging and age-appropriate for grade ${standard.grade_level}
- Consider the ${difficulty_level} difficulty level
- Focus specifically on: ${standard.description}
- If the student is "${currentProficiency}", tailor the activity to help them progress to the next level

Return ONLY the JSON object, no other text.`;

    // Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Parse Claude's response
    const responseText = message.content[0].type === 'text' 
      ? message.content[0].text 
      : '';

    // Extract JSON from response (Claude might include markdown formatting)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    const activityData = JSON.parse(jsonMatch[0]);

    // Save the activity to database
    const savedActivity = await saveGeneratedActivity({
      standard_id: standardId,
      kid_id: kid_id || null,
      organization_id,
      title: activityData.title,
      activity_type: activityData.activity_type,
      difficulty_level: activityData.difficulty_level,
      description: activityData.description,
      materials_needed: activityData.materials_needed,
      instructions: activityData.instructions,
      duration_minutes: activityData.duration_minutes,
      generated_by_ai: true,
      ai_prompt_context: {
        standard_code: standard.standard_code,
        proficiency_level: currentProficiency,
        difficulty_requested: difficulty_level,
        learning_style: learningStyle,
      },
      used_count: 0,
      is_favorite: false,
      is_archived: false,
      created_by: user_id,
    });

    return NextResponse.json({
      success: true,
      data: savedActivity,
      message: 'Activity generated successfully',
    });
  } catch (error: any) {
    console.error('Error generating activity:', error);

    // Handle rate limit errors
    if (error.status === 429) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT',
            message: 'Too many requests. Please try again in a moment.',
          },
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'GENERATION_ERROR',
          message: 'Failed to generate activity',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}

// GET - Get previously generated activities for a standard
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: standardId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const kidId = searchParams.get('kid_id') || undefined;
    const activities = await getActivitiesForStandard(standardId, kidId);

    return NextResponse.json({
      success: true,
      data: activities,
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch activities',
        },
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// Example usage:
//
// Generate new activity:
// POST /api/standards/std123/generate-activity
//   Body: {
//     "kid_id": "kid456",
//     "difficulty_level": "medium",
//     "activity_type": "hands_on",
//     "organization_id": "org789"
//   }
//
// Get existing activities:
// GET /api/standards/std123/generate-activity?kid_id=kid456
// ============================================================================