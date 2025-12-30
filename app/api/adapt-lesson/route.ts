import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { originalLesson, newChildName, newGradeLevel } = await request.json();

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `Adapt this lesson for ${newChildName} at ${newGradeLevel} grade level:

Original Lesson: ${JSON.stringify(originalLesson, null, 2)}

Adjust complexity, activities, and materials appropriately for the new grade level while keeping the core subject and approach.

Return ONLY valid JSON (no markdown, no explanation) with the same structure as the original.`
      }]
    });

    const textContent = message.content.find(block => block.type === 'text');
if (!textContent || textContent.type !== 'text') {
  throw new Error('No text content in response');
}
const adaptedLesson = JSON.parse(textContent.text);
    return NextResponse.json({ adaptedLesson });
  } catch (error) {
    console.error('Adaptation error:', error);
    return NextResponse.json(
      { error: 'Failed to adapt lesson' }, 
      { status: 500 }
    );
  }
}