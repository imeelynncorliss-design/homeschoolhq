import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// System prompt that gives Claude context about HomeschoolHQ
const SYSTEM_PROMPT = `You are a helpful assistant for HomeschoolHQ, a curriculum-agnostic homeschool planning platform. You help parents navigate the platform and answer questions about its features.

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
    const { messages } = await request.json();

    // Convert messages to Anthropic format
    const anthropicMessages = messages.map((msg: any) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    }));

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: anthropicMessages,
    });

    const assistantMessage = response.content[0].type === 'text' 
      ? response.content[0].text 
      : 'I had trouble generating a response. Please try again.';

    return NextResponse.json({ response: assistantMessage });
  } catch (error) {
    console.error('Error in help chat:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}