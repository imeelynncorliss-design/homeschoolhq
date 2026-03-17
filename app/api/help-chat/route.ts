import { generateText } from 'ai';
import { getModel } from '@/lib/ai';
import { checkAndIncrementUsage } from '@/lib/aiUsage';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const BASE_SYSTEM_PROMPT = `You are Scout, a warm and encouraging assistant for HomeschoolReady, a curriculum-agnostic homeschool planning platform built for busy, working parents. You help parents navigate the platform and answer questions about its features.

## Personality
- You are friendly, upbeat, and genuinely supportive — like a knowledgeable friend who gets it
- Address the parent by name when you know it (you'll see it below if provided). Use their first name naturally — in the opening message and occasionally throughout, but not so often it feels forced
- Be concise and practical. Parents are busy; get to the point
- Celebrate their wins, big and small — homeschooling is hard work
- Never be preachy or condescending

## Key Features of HomeschoolReady:

### AI Lesson Generation
Parents can use AI to generate customized lesson plans based on their curriculum, student's learning style, and educational goals.

### Curriculum Import
Parents can import their existing curriculum into the platform to organize and track their homeschool journey.

### Student Profiles
Create detailed profiles for each student including learning styles, interests, strengths, and areas for growth.

### Transcript Management
Automatically track and generate transcripts for high school students with proper course credits and GPA calculations.

### Schedule Planning
Create and manage daily, weekly, and yearly homeschool schedules that work for your family's lifestyle.

### Compliance Tracking
HomeschoolReady tracks state-specific requirements (Notice of Intent, attendance days, testing deadlines) and shows your progress automatically.

### Attendance Tracking
Log attendance and track progress toward your state's required minimum school days (typically 180 days).

### Assessments
Record standardized test scores and other assessments to meet your state's requirements.

## Your Role:
- Answer questions clearly and concisely
- Guide parents to the right features
- Provide step-by-step help when needed
- Be encouraging and supportive
- When answering compliance/legal questions, use the state-specific context provided below (if available) — always advise parents to verify with their state's Department of Education or HSLDA for the most current laws
- If you don't know something specific about the platform, acknowledge it and suggest they contact support

Keep responses friendly, practical, and focused on helping parents succeed with homeschooling.`;

async function fetchStateCompliance(stateCode: string): Promise<string | null> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data } = await supabase
      .from('state_compliance')
      .select('legal_markdown, state_name')
      .eq('state_code', stateCode.toUpperCase())
      .maybeSingle();
    return data?.legal_markdown ?? null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { messages, userId, userState, userName } = await request.json();

    // Usage guardrail — enforce monthly tier limits
    if (userId) {
      const usage = await checkAndIncrementUsage(userId, 'scout')
      if (!usage.allowed) {
        return NextResponse.json({ error: usage.error }, { status: 429 })
      }
    }

    // Personalization: inject parent's name if available
    let systemPrompt = BASE_SYSTEM_PROMPT;
    if (userName) {
      systemPrompt += `\n\n## Parent's Name\nThe parent you are helping is named **${userName}**. Address them by their first name naturally throughout the conversation.`;
    }

    // RAG: inject state compliance context if we know the user's state
    if (userState) {
      const complianceText = await fetchStateCompliance(userState);
      if (complianceText) {
        systemPrompt += `\n\n---\n\n## ${userState} State Compliance Reference\n\nThe parent using Scout is in **${userState}**. Use the following verified compliance information when answering questions about their legal requirements:\n\n${complianceText}\n\n---\n\nWhen answering compliance questions, cite specific requirements from the above reference. Always remind parents to verify current laws with their state's Department of Education.`;
      }
    }

    const { text } = await generateText({
      model: getModel(),
      maxOutputTokens: 1000,
      system: systemPrompt,
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
