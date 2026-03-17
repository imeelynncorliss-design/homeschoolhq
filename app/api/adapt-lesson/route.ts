import { generateText } from 'ai';
import { getModel } from '@/lib/ai';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { originalLesson, newChildName, newGradeLevel } = await request.json();

    const { text } = await generateText({
      model: getModel(),
      maxOutputTokens: 2000,
      prompt: `Adapt this lesson for ${newChildName} at ${newGradeLevel} grade level:

Original Lesson: ${JSON.stringify(originalLesson, null, 2)}

Adjust complexity, activities, and materials appropriately for the new grade level while keeping the core subject and approach.

Return ONLY valid JSON (no markdown, no explanation) with the same structure as the original.`,
    });

    const adaptedLesson = JSON.parse(text);
    return NextResponse.json({ adaptedLesson });
  } catch (error) {
    console.error('Adaptation error:', error);
    return NextResponse.json(
      { error: 'Failed to adapt lesson' },
      { status: 500 }
    );
  }
}
