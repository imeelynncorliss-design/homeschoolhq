// app/api/generate-lesson/route.ts

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const formData = await request.json();
    const { childId, subject, gradeLevel, duration, topic, focusAreas, learningStyle, additionalNotes, materials } = formData;

    // Fetch kid profile for personalization
    const { data: kid, error: kidError } = await supabase
      .from('kids')
      .select('displayname, age, grade, learning_style, pace_of_learning, environmental_needs, current_hook, todays_vibe, current_focus')
      .eq('id', childId)
      .single();

    if (kidError || !kid) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
    }

    // Build personalized prompt with CRITICAL materials requirement
    const prompt = `You are an expert homeschool curriculum designer creating personalized lesson plans.

**STUDENT PROFILE:**
Name: ${kid.displayname}
Age: ${kid.age || 'Not specified'}
Grade Level: ${gradeLevel || kid.grade || 'Not specified'}
Learning Style: ${learningStyle || kid.learning_style || 'Not specified'}
Pace of Learning: ${kid.pace_of_learning || 'Average'}
Current Hook (Interest): ${kid.current_hook || 'None specified'}
Today's Vibe (Mood/Energy): ${kid.todays_vibe || 'Balanced'}
Current Focus: ${kid.current_focus || 'General learning'}

**LESSON REQUIREMENTS:**
Subject: ${subject}
Topic: ${topic || 'General subject overview'}
Duration: ${duration} minutes
${focusAreas ? `Focus Areas: ${focusAreas}` : ''}
${additionalNotes ? `Additional Notes: ${additionalNotes}` : ''}

${materials ? `
**🚨 CRITICAL MATERIALS REQUIREMENT 🚨**
The parent has selected these SPECIFIC physical materials that MUST be used in the lesson:
${materials}

**MANDATORY INSTRUCTIONS FOR MATERIALS:**
1. You MUST design activities around THESE EXACT MATERIALS listed above
2. Each lesson variation MUST use at least 2-3 items from the materials list
3. Do NOT suggest alternative materials the parent doesn't have
4. Do NOT create lessons that would work "better" with different materials
5. The materials listed in your response MUST come from the list above
6. You may include common household items (water, paper, tape) as supplements, but the PRIMARY materials must be from the parent's list
7. Get creative with how to use these specific materials for hands-on learning

**VIOLATION OF THIS REQUIREMENT MAKES THE LESSON UNUSABLE - the parent specifically selected these materials and expects them to be used.**
` : ''}

**TASK:**
Create 3 different lesson plan variations for this student. Each variation should have a different approach or emphasis while covering the same core content.

For EACH variation, include:
1. A creative, engaging title
2. Brief description (2-3 sentences) - mention which materials will be used
3. Detailed lesson overview
4. Activities (3-5 specific hands-on activities with timing that use the selected materials)
5. Materials needed - LIST THE PARENT'S MATERIALS FIRST, then any common household supplements
6. Learning objectives
7. Assessment ideas

**PERSONALIZATION:**
- Adapt content to ${kid.displayname}'s learning style (${learningStyle || kid.learning_style})
- Design hands-on, tactile activities using the materials provided
- Consider their current interest: ${kid.current_hook || 'general topics'}
- Match their energy level: ${kid.todays_vibe || 'balanced'}
- Align with their current focus: ${kid.current_focus || 'broad learning goals'}

Return ONLY valid JSON with this exact structure:
{
  "variations": [
    {
      "title": "Engaging Lesson Title",
      "description": "Brief 2-3 sentence overview mentioning which selected materials will be used",
      "overview": "Detailed explanation of the lesson (2-3 paragraphs)",
      "activities": [
        {
          "name": "Activity name",
          "duration": "15 minutes",
          "description": "What the student will do with the specific materials"
        }
      ],
      "materials": ["parent's material 1", "parent's material 2", "water", "paper towels"],
      "learningObjectives": ["objective 1", "objective 2", "objective 3"],
      "assessmentIdeas": ["assessment idea 1", "assessment idea 2"]
    }
  ]
}

CRITICAL: Return ONLY the JSON object. No markdown formatting, no backticks, no explanatory text before or after.`;

    console.log('Generating lessons for:', kid.displayname);
    console.log('Using materials:', materials);

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const textContent = message.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    // Parse the JSON response
    let lessonData;
    try {
      // Remove any markdown code fences if present
      let cleanedText = textContent.text.trim();
      cleanedText = cleanedText.replace(/^```json\n/, '').replace(/\n```$/, '');
      cleanedText = cleanedText.replace(/^```\n/, '').replace(/\n```$/, '');
      
      lessonData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', textContent.text);
      return NextResponse.json({ 
        error: 'Failed to parse lesson data',
        rawResponse: textContent.text 
      }, { status: 500 });
    }

    // Return the generated lessons
    return NextResponse.json({ 
      success: true,
      variations: lessonData.variations || [],
      childName: kid.displayname,
      personalizedFor: {
        learningStyle: learningStyle || kid.learning_style,
        currentHook: kid.current_hook,
        pace: kid.pace_of_learning
      }
    });

  } catch (error) {
    console.error('Generate lesson error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate lessons', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}