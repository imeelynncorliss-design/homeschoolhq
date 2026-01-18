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
    const { childId, subject, gradeLevel, duration, topic, focusAreas, learningStyle, additionalNotes } = formData;

    // Fetch kid profile for personalization
    const { data: kid, error: kidError } = await supabase
      .from('kids')
      .select('displayname, age, grade, learning_style, pace_of_learning, environmental_needs, current_hook, todays_vibe, current_focus')
      .eq('id', childId)
      .single();

    if (kidError || !kid) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
    }

    // Build personalized prompt
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

**TASK:**
Create 3 different lesson plan variations for this student. Each variation should have a different approach or emphasis while covering the same core content.

For EACH variation, include:
1. A creative, engaging title
2. Brief description (2-3 sentences)
3. Detailed lesson overview
4. Activities (3-5 specific activities with timing)
5. Materials needed
6. Learning objectives
7. Assessment ideas

**PERSONALIZATION:**
- Adapt content to ${kid.displayname}'s learning style (${learningStyle || kid.learning_style})
- Consider their current interest: ${kid.current_hook || 'general topics'}
- Match their energy level: ${kid.todays_vibe || 'balanced'}
- Align with their current focus: ${kid.current_focus || 'broad learning goals'}

Return ONLY valid JSON with this exact structure:
{
  "variations": [
    {
      "title": "Engaging Lesson Title",
      "description": "Brief 2-3 sentence overview of this approach",
      "overview": "Detailed explanation of the lesson (2-3 paragraphs)",
      "activities": [
        {
          "name": "Activity name",
          "duration": "15 minutes",
          "description": "What the student will do"
        }
      ],
      "materials": ["item 1", "item 2", "item 3"],
      "learningObjectives": ["objective 1", "objective 2", "objective 3"],
      "assessmentIdeas": ["assessment idea 1", "assessment idea 2"]
    }
  ]
}

CRITICAL: Return ONLY the JSON object. No markdown formatting, no backticks, no explanatory text before or after.`;

    console.log('Generating lessons for:', kid.displayname);

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