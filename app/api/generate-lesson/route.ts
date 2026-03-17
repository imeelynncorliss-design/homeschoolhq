// app/api/generate-lesson/route.ts

import { generateText } from 'ai';
import { getModel } from '@/lib/ai';
import { checkAndIncrementUsage } from '@/lib/aiUsage';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Supabase env vars missing')
      return NextResponse.json({ error: 'Database not configured', details: 'Supabase env vars missing' }, { status: 500 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const formData = await request.json();
    const { userId, childId, subject, gradeLevel, duration, topic } = formData;
    console.log('generate-lesson: childId=', childId, 'subject=', subject)

    if (!childId) {
      return NextResponse.json({ error: 'Missing childId', details: 'No student selected' }, { status: 400 })
    }

    // Usage guardrail — enforce monthly tier limits
    if (userId) {
      const usage = await checkAndIncrementUsage(userId, 'lessons')
      if (!usage.allowed) {
        return NextResponse.json({ error: usage.error }, { status: 429 })
      }
    }

    // Fetch kid profile for personalization
    const { data: kid, error: kidError } = await supabase
      .from('kids')
      .select('displayname, age, grade, learning_style, current_hook, current_focus')
      .eq('id', childId)
      .single();

    if (kidError || !kid) {
      console.error('Kid fetch error:', kidError)
      return NextResponse.json({ error: 'Student profile not found', details: kidError?.message }, { status: 404 });
    }
    console.log('generate-lesson: fetched kid', kid.displayname)

    const prompt = `You are Scout, an expert homeschool curriculum designer. Create 3 structured lesson plan variations for a homeschool student.

**STUDENT PROFILE:**
Name: ${kid.displayname}
Grade Level: ${gradeLevel || kid.grade || 'Not specified'}
Learning Style: ${kid.learning_style || 'Not specified'}
Current Interests: ${kid.current_hook || 'None specified'}
Current Focus: ${kid.current_focus || 'General learning'}

**LESSON REQUIREMENTS:**
Subject: ${subject}
Topic: ${topic || 'General subject overview'}
Duration: ${duration} minutes

**TASK:**
Generate 3 lesson plan variations, each with a different instructional approach (e.g. direct instruction, Socratic discussion, project-based). Each variation should be a complete, standalone lesson plan — NOT a standalone activity.

Each lesson plan must include:
1. A clear, engaging title
2. A brief description (2–3 sentences) of the lesson approach
3. A detailed lesson overview (what the teacher does, what the student does)
4. Lesson steps — 3–5 sequenced instructional steps with timing (introduction, instruction, practice, wrap-up)
5. Learning objectives (what the student will know or be able to do after)
6. Assessment ideas (how the teacher can check for understanding)

**PERSONALIZATION:**
- Match ${kid.displayname}'s learning style: ${kid.learning_style || 'flexible'}
- Connect to their interests: ${kid.current_hook || 'general topics'}
- Align with their current focus: ${kid.current_focus || 'broad learning goals'}

Return ONLY valid JSON:
{
  "variations": [
    {
      "title": "Lesson Title",
      "description": "2–3 sentence overview of the approach",
      "overview": "Detailed explanation of the lesson (2–3 paragraphs)",
      "activities": [
        {
          "name": "Step name (e.g. Introduction, Direct Instruction, Guided Practice)",
          "duration": "10 minutes",
          "description": "What happens in this step"
        }
      ],
      "materials": ["textbook", "notebook", "pencil"],
      "learningObjectives": ["objective 1", "objective 2"],
      "assessmentIdeas": ["assessment idea 1", "assessment idea 2"]
    }
  ]
}

CRITICAL: Return ONLY the JSON object. No markdown, no backticks, no text before or after.`;

    console.log('generate-lesson: calling Claude for', kid.displayname)

    const { text } = await generateText({
      model: getModel(),
      maxOutputTokens: 8000,
      prompt,
    });

    // Parse the JSON response
    let lessonData;
    try {
      // Remove any markdown code fences if present
      let cleanedText = text.trim();
      cleanedText = cleanedText.replace(/^```json\n/, '').replace(/\n```$/, '');
      cleanedText = cleanedText.replace(/^```\n/, '').replace(/\n```$/, '');

      lessonData = JSON.parse(cleanedText);
      } catch (parseError) {
        console.error('Failed to parse AI response — likely truncated. Response length:', text.length)
        return NextResponse.json({
          error: 'Lesson generation was cut off — try again or reduce the number of focus areas',
          details: 'Response too long for token limit'
        }, { status: 500 })
      }

    // Return the generated lessons
    return NextResponse.json({ 
      success: true,
      variations: lessonData.variations || [],
      childName: kid.displayname,
      personalizedFor: {
        learningStyle: kid.learning_style,
        currentHook: kid.current_hook,
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