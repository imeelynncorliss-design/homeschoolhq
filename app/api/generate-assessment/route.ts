// app/api/generate-assessment/route.ts
// UPDATED VERSION - Works with your 'kids' table

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { lessonId, kidId, assessmentType, difficulty, questionCount } = await request.json();

    // Fetch lesson details
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    // Fetch kid profile for personalization
    const { data: kid, error: kidError } = await supabase
      .from('kids')
      .select('displayname, learning_style, pace_of_learning, environmental_needs')
      .eq('id', kidId)
      .single();

    if (kidError || !kid) {
      return NextResponse.json({ error: 'Kid profile not found' }, { status: 404 });
    }

    // Build personalized prompt
    const difficultyMap: { [key: string]: string } = {
      easy: 'appropriate for beginners with basic understanding',
      medium: 'grade-level appropriate with moderate challenge',
      hard: 'challenging questions that require deeper thinking and application'
    };

    const learningStyleGuidance: { [key: string]: string } = {
      'Visual (learns best by seeing)': `
- Include questions that reference diagrams, charts, or visual patterns
- Use color-coding suggestions in multiple choice options
- Ask students to "draw" or "diagram" their understanding
- Include image-based questions when possible`,
      
      'Auditory (learns best by listening)': `
- Include verbal explanation prompts
- Ask for oral presentation or discussion-based responses
- Include "explain out loud" instructions
- Reference listening to lesson content`,
      
      'Kinesthetic (learns best by doing)': `
- Include hands-on demonstration questions
- Ask students to physically show or build something
- Include movement-based learning checks
- Emphasize practical application and real-world scenarios`,
      
      'Reading/Writing (learns best through text)': `
- Include written explanation questions
- Ask for essay-style or paragraph responses
- Include reading comprehension elements
- Emphasize note-taking and summarization skills`
    };

    const paceGuidance: { [key: string]: string } = {
      'Accelerated (moves quickly, grasps concepts fast)': `
- Include extension questions for deeper exploration
- Add challenging "bonus" questions
- Reduce repetitive practice, focus on application
- Include critical thinking and synthesis questions`,
      
      'Average (steady, grade-level pace)': `
- Balance between practice and application
- Include mix of recall and understanding questions
- Standard scaffolding and support`,
      
      'Needs more time (benefits from repetition and extra support)': `
- Include more scaffolded questions with step-by-step guidance
- Provide visual aids and examples for each question
- Break complex questions into smaller parts
- Include more practice questions on foundational concepts
- Add encouraging notes and hints`
    };

    const typeInstructions: { [key: string]: string } = {
      quiz: `Create an interactive quiz with ${questionCount} questions in JSON format.

For each question, include:
- question text
- type: "multiple_choice", "true_false", or "short_answer"
- options: array of 4 choices (for multiple choice)
- correct_answer: the correct option letter (A/B/C/D) or "true"/"false" or example answer
- explanation: brief explanation of why this is correct

Return ONLY valid JSON with this structure:
{
  "title": "Quiz Title",
  "instructions": "Brief instructions for student",
  "questions": [
    {
      "id": 1,
      "question": "Question text here",
      "type": "multiple_choice",
      "options": ["A) First option", "B) Second option", "C) Third option", "D) Fourth option"],
      "correct_answer": "B",
      "explanation": "Explanation of correct answer"
    }
  ]
}`,
      
      worksheet: `Create an interactive practice worksheet with ${questionCount} problems in JSON format.

Return ONLY valid JSON with this structure:
{
  "title": "Worksheet Title",
  "instructions": "Brief instructions for student",
  "problems": [
    {
      "id": 1,
      "problem": "Problem text or question",
      "type": "short_answer",
      "hint": "Optional hint for student",
      "sample_answer": "Example of correct answer"
    }
  ]
}`,
      
      project: `Create ${questionCount} hands-on project ideas in JSON format.

Return ONLY valid JSON with this structure:
{
  "title": "Project Ideas",
  "instructions": "Choose one project to complete",
  "projects": [
    {
      "id": 1,
      "title": "Project Title",
      "description": "What the student will do",
      "materials": ["item 1", "item 2"],
      "estimated_time": "30 minutes",
      "learning_goals": "What they'll learn"
    }
  ]
}`
    };

    const prompt = `You are creating a personalized educational assessment for a homeschool student.

**STUDENT PROFILE:**
Name: ${kid.displayname}
Learning Style: ${kid.learning_style || 'Not specified'}
Pace of Learning: ${kid.pace_of_learning || 'Average'}
Environmental Needs: ${kid.environmental_needs || 'None specified'}

**LESSON INFORMATION:**
Title: ${lesson.title}
Subject: ${lesson.subject}
${lesson.description ? `Description: ${lesson.description}` : ''}

**ASSESSMENT REQUIREMENTS:**
Type: ${assessmentType}
Difficulty: ${difficulty} (${difficultyMap[difficulty as keyof typeof difficultyMap] || difficulty})
Number of items: ${questionCount}

**PERSONALIZATION GUIDELINES:**
${kid.learning_style ? learningStyleGuidance[kid.learning_style] || '' : ''}
${kid.pace_of_learning ? paceGuidance[kid.pace_of_learning] || '' : ''}

${kid.environmental_needs ? `Environmental Considerations: ${kid.environmental_needs}` : ''}

${typeInstructions[assessmentType as string]}

CRITICAL: Return ONLY the JSON object. No markdown formatting, no backticks, no explanatory text before or after.`;

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
    let assessmentData;
    try {
      // Remove any markdown code fences if present
      let cleanedText = textContent.text.trim();
      cleanedText = cleanedText.replace(/^```json\n/, '').replace(/\n```$/, '');
      cleanedText = cleanedText.replace(/^```\n/, '').replace(/\n```$/, '');
      
      assessmentData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', textContent.text);
      return NextResponse.json({ 
        error: 'Failed to parse assessment data',
        rawResponse: textContent.text 
      }, { status: 500 });
    }

    // Save assessment to database
    const { data: savedAssessment, error: saveError } = await supabase
      .from('assessments')
      .insert({
        lesson_id: lessonId,
        kid_id: kidId,
        type: assessmentType,
        difficulty: difficulty,
        content: assessmentData,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (saveError) {
      console.error('Failed to save assessment:', saveError);
      // Still return the assessment even if save fails
    }

    return NextResponse.json({ 
      assessment: assessmentData,
      assessmentId: savedAssessment?.id,
      lessonTitle: lesson.title,
      kidName: kid.displayname,
      personalizedFor: {
        learningStyle: kid.learning_style,
        pace: kid.pace_of_learning
      }
    });

  } catch (error) {
    console.error('Generate assessment error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate assessment', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}