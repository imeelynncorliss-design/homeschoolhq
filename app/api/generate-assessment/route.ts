// app/api/generate-assessment/route.ts

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lesson, assessmentType, difficulty, questionCount } = body;

    if (!lesson || !lesson.title || !lesson.subject) {
      return NextResponse.json({ error: 'Missing lesson information' }, { status: 400 });
    }

    // ✅ Type definitions
    type DifficultyLevel = 'easy' | 'medium' | 'hard';
    type AssessmentType = 'quiz' | 'worksheet' | 'project';

    const difficultyMap: Record<DifficultyLevel, string> = {
      easy: 'appropriate for beginners with basic understanding',
      medium: 'grade-level appropriate with moderate challenge',
      hard: 'challenging questions that require deeper thinking and application'
    };

    const typeInstructions: Record<AssessmentType, string> = {
      quiz: `Create a quiz with ${questionCount} questions that includes:
- Multiple choice questions (with 4 options each)
- Short answer questions
- Include an answer key at the end

Format each question clearly with numbering.`,
      
      worksheet: `Create a practice worksheet with ${questionCount} problems that includes:
- Step-by-step practice problems
- Word problems when appropriate
- Space for students to show their work
- Include an answer key at the end

Format problems clearly with numbering.`,
      
      project: `Create ${questionCount} creative project ideas that:
- Apply the lesson concepts in hands-on ways
- Are appropriate for home learning
- Include materials needed and estimated time
- Explain what the student will learn

Format each project idea clearly with numbering.`
    };

    const prompt = `You are creating an educational assessment for a homeschool student.

**Lesson Information:**
- Title: ${lesson.title}
- Subject: ${lesson.subject}
${lesson.description ? `- Description: ${lesson.description}` : ''}

**Assessment Requirements:**
- Type: ${assessmentType}
- Difficulty: ${difficulty} (${difficultyMap[difficulty as DifficultyLevel]})
- Number of items: ${questionCount}

${typeInstructions[assessmentType as AssessmentType]}

**Important Guidelines:**
1. Make questions/problems age-appropriate and engaging
2. Cover key concepts from the lesson
3. Vary the difficulty within the set
4. Provide clear instructions
5. Include an answer key (except for project ideas)
6. Format for easy printing

Create the assessment now:`;

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

    return NextResponse.json({ 
      assessment: textContent.text,
      lessonTitle: lesson.title
    });

  } catch (error) {
    console.error('Generate assessment error:', error);
    return NextResponse.json(
      { error: 'Failed to generate assessment', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}