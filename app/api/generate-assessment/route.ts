// app/api/generate-assessment/route.ts
// FIXED: Better worksheet generation with explicit question text

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
    const { lessonId, kidId, assessmentType, difficulty, questionCount } = await request.json();

    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    const { data: kid, error: kidError } = await supabase
      .from('kids')
      .select('displayname, learning_style, pace_of_learning, environmental_needs')
      .eq('id', kidId)
      .single();

    if (kidError || !kid) {
      return NextResponse.json({ error: 'Kid profile not found' }, { status: 404 });
    }

    const typeInstructions: { [key: string]: string } = {
      quiz: `Create a parent-administered quiz with ${questionCount} questions based on: ${lesson.title}.

For each question, include:
- question: The actual question text (REQUIRED - must not be empty)
- type: "multiple_choice", "true_false", or "short_answer"
- options: array of 4 choices for multiple choice
- correct_answer: the correct answer
- explanation: brief explanation

Return ONLY valid JSON:
{
  "title": "Parent-Administered Quiz: ${lesson.title}",
  "instructions": "Parent administers these questions offline, printed, orally, or side-by-side, then records the learner's responses or score in HomeschoolReady.",
  "questions": [
    {
      "id": 1,
      "question": "ACTUAL QUESTION TEXT HERE - MUST NOT BE EMPTY",
      "type": "multiple_choice",
      "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
      "correct_answer": "A",
      "explanation": "Why this is correct"
    }
  ]
}`,
      
      worksheet: `Create ${questionCount} parent-administered practice problems for: ${lesson.title} (${lesson.subject}).

CRITICAL: Each "problem" field must contain the FULL QUESTION TEXT that a parent can read, print, or give to the learner offline.

${lesson.description ? `Lesson content: ${lesson.description}` : ''}

Return ONLY valid JSON:
{
  "title": "Parent-Administered Worksheet: ${lesson.title}",
  "instructions": "Parent administers these practice problems offline, printed, orally, or side-by-side, then records responses, notes, or an optional score in HomeschoolReady.",
  "problems": [
    {
      "id": 1,
      "problem": "WRITE THE COMPLETE QUESTION HERE - This is what the parent can read, print, or give offline. Example: 'Find the area of a rectangle with length 5cm and width 3cm.'",
      "type": "short_answer",
      "hint": "Optional hint to help solve",
      "sample_answer": "Example correct answer"
    },
    {
      "id": 2,
      "problem": "ANOTHER COMPLETE QUESTION - Never leave this empty",
      "type": "short_answer",
      "hint": "Another hint",
      "sample_answer": "Another answer"
    }
  ]
}

REMEMBER: The "problem" field is the actual question text. It must NEVER be empty or just a number!`,
      
      project: `Create ${questionCount} hands-on project ideas for: ${lesson.title}.

${lesson.description ? `Lesson content: ${lesson.description}` : ''}

Return ONLY valid JSON:
{
  "title": "Parent-Reviewed Project Options: ${lesson.title}",
  "instructions": "Parent chooses or assigns one project, then records review notes or an optional score in HomeschoolReady.",
  "projects": [
    {
      "id": 1,
      "title": "Project title",
      "objective": "What the learner will practice or demonstrate",
      "description": "What to create",
      "materials": ["item 1", "item 2"],
      "estimated_time": "X minutes",
      "steps": ["Step 1", "Step 2"]
    }
  ]
}`
    };

    const prompt = `You are creating a parent-administered ${assessmentType} for: ${lesson.title} (${lesson.subject}).

**LESSON:**
${lesson.description || 'No description provided'}

**LEARNER PROFILE:**
Name: ${kid.displayname}
Learning Style: ${kid.learning_style || 'Not specified'}

This assessment must not assume the child logs into HomeschoolReady. Write it so a parent can administer it offline, orally, printed, or side-by-side, then record the result in the adult account.

${typeInstructions[assessmentType]}

CRITICAL: Return ONLY the JSON object. No markdown, no backticks, no explanatory text.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    });

    const textContent = message.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    let assessmentData;
    try {
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

    // Normalize to questions array
    if (assessmentType === 'worksheet' && assessmentData.problems) {
      console.log('Worksheet problems before normalization:', assessmentData.problems);
      
      assessmentData.questions = assessmentData.problems.map((problem: any) => ({
        id: problem.id,
        question: problem.problem || "Question text missing",  // Fallback if empty
        type: 'short_answer',
        correct_answer: problem.sample_answer || '',
        explanation: problem.hint || ''
      }));
      
      console.log('Normalized questions:', assessmentData.questions);
    }

    if (assessmentType === 'project' && assessmentData.projects) {
      assessmentData.questions = [{
        id: 1,
        question: "Select which project you completed:",
        type: 'project_selection',
        options: assessmentData.projects.map((p: any) => p.id),
        correct_answer: 'any'
      }];
    }

    if (!assessmentData.questions || !Array.isArray(assessmentData.questions)) {
      console.error('Assessment data missing questions array:', assessmentData);
      return NextResponse.json({ 
        error: 'Invalid assessment format',
        assessmentType,
        rawData: assessmentData
      }, { status: 500 });
    }

    // Validate that questions have text
    const emptyQuestions = assessmentData.questions.filter((q: any) => !q.question || q.question.trim() === '');
    if (emptyQuestions.length > 0) {
      console.error('Some questions have no text:', emptyQuestions);
    }

    const now = new Date().toISOString();
    const { data: savedAssessment, error: saveError } = await supabase
      .from('assessments')
      .insert({
        title: assessmentData.title || `${lesson.title} Assessment`,
        description: assessmentData.instructions || null,
        lesson_id: lessonId,
        kid_id: kidId,
        organization_id: lesson.organization_id,
        subject: lesson.subject || null,
        question_count: assessmentData.questions.length,
        status: 'generated',
        type: assessmentType,
        assessment_type: assessmentType,
        difficulty: difficulty,
        content: assessmentData,
        created_at: now,
        updated_at: now
      })
      .select('id')
      .single();

    if (saveError || !savedAssessment?.id) {
      console.error('Failed to save assessment:', saveError);
      return NextResponse.json({
        error: 'Assessment was generated, but the record could not be saved.',
        details: saveError?.message || 'No assessment id returned from database.',
        code: saveError?.code,
        hint: saveError?.hint
      }, { status: 500 });
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