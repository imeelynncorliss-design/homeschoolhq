import { generateText } from 'ai';
import { getModel } from '@/lib/ai';
import { checkAndIncrementUsage } from '@/lib/aiUsage';
import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are Scout, a helpful assistant for HomeschoolHQ, a curriculum-agnostic homeschool planning platform for primarily working parents. You help parents navigate the platform and answer questions about its features.

## Key Features of HomeschoolHQ:

### AI Lesson Generation
Parents can use AI to generate customized lesson plans based on their curriculum, student's learning style, and educational goals.

### Curriculum Import
Parents can import their existing curriculum into the platform to organize and track their homeschool journey.

### Student Profiles
Create detailed profiles for each student including learning styles, interests, strengths, and areas for growth.

### Social Collaboration
Connect with other homeschool families, share resources, and collaborate on lessons and activities.

### Transcript Management
Automatically track and generate transcripts for high school students with proper course credits and GPA calculations.

### Schedule Planning
Create and manage daily, weekly, and yearly homeschool schedules that work for your family's lifestyle.

## Your Role:
- Answer questions clearly and concisely
- Guide parents to the right features
- Provide step-by-step help when needed
- Be encouraging and supportive
- If you don't know something specific about the platform, acknowledge it and suggest they contact support

Keep responses friendly, practical, and focused on helping parents succeed with homeschooling.`;

export async function POST(request: NextRequest) {
  try {
    const { messages, userId } = await request.json();

    // Usage guardrail — enforce monthly tier limits
    if (userId) {
      const usage = await checkAndIncrementUsage(userId, 'scout')
      if (!usage.allowed) {
        return NextResponse.json({ error: usage.error }, { status: 429 })
      }
    }

    const { text } = await generateText({
      model: getModel(),
      maxOutputTokens: 1000,
      system: SYSTEM_PROMPT,
      messages: messages.map((msg: { role: string; content: string }) => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      })),
    });

    return NextResponse.json({ response: text });
  } catch (error) {
    console.error('Error in help chat:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
