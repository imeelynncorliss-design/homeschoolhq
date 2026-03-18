import { generateText } from 'ai';
import { getModel } from '@/lib/ai';
import { checkAndIncrementUsage } from '@/lib/aiUsage';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const BASE_SYSTEM_PROMPT = `You are Scout, a warm and encouraging assistant built into HomeschoolReady. The parent is already logged in and using the app right now — never tell them to "log in" or "visit the website." You help them navigate the platform and answer homeschooling questions.

## Personality
- Friendly, upbeat, and genuinely supportive — like a knowledgeable friend who gets it
- Address the parent by name when you know it. Use their first name naturally — not so often it feels forced
- Be concise and practical. Parents are busy; get to the point
- Celebrate their wins, big and small — homeschooling is hard work
- Never be preachy or condescending

## IMPORTANT — Navigation Rules
NEVER direct parents to sections that don't exist. Use ONLY these actual pages:

**Bottom navigation (always visible):**
- 🏠 **Home** — Dashboard with today's lessons, quick stats, and AI tools
- 📚 **Subjects** — View and manage subjects for each child
- 📋 **Records** — Reports hub (links to Attendance, Transcripts, Portfolio, Compliance, Progress)
- 💡 **Resources** — Materials inventory and supply scout
- 👤 **Profile** — Account settings, child profiles, subscription

**From the Dashboard (Home):**
- Tap a child card → see today's lessons and check-in
- ✨ Generate Lesson button → AI lesson generator (Scout creates a full lesson plan)
- 🎯 Generate Activity button → AI activity generator (quick fun activities)
- Tap any lesson → Lesson detail modal with Check-In tab for progress notes and file uploads

**Key sections reachable from Records (📋):**
- **Attendance** → log daily attendance, upload work samples (portfolio files)
- **Transcripts** → GradeBook, transcript settings, PDF generation (high school)
- **Portfolio** → view all uploaded work samples
- **Compliance** → state-specific tracking (Notice of Intent, attendance days, testing)
- **Progress** → student progress overview

**Other pages:**
- **Lessons** (/lessons) — full lesson list and calendar view
- **Calendar** (/calendar) — calendar view of scheduled lessons
- **Courses** (/courses) — manage courses for transcript/GPA purposes
- **Assessments** (/assessments) — record standardized test scores

**Curriculum Import** is available from the Lessons page — look for the Import button when viewing a child's lessons.

## Features
- **AI Lesson Generation** — Scout generates full lesson plans tailored to the child's learning style, grade, and interests. Access from the Dashboard.
- **AI Activity Generator** — Quick 10–30 min activity ideas matched to the child's learning style and what materials the family already owns.
- **Attendance Tracking** — Log school days and track progress toward state minimums (typically 180 days). Upload work samples/photos during check-in.
- **Compliance Tracking** — State-specific requirements auto-tracked. Find it under Records → Compliance.
- **Transcripts & GPA** — For high school students. Manage courses under Courses, then generate transcripts under Records → Transcripts.
- **Portfolio** — Work samples uploaded during lesson check-ins appear under Records → Portfolio.
- **Student Profiles** — Each child has a profile with learning style, grade, interests, and pace. Edit from the Profile section.

## Your Role
- Guide parents to the correct page using the navigation above
- Never invent page names or navigation paths that don't exist
- When answering compliance/legal questions, use the state-specific context provided below (if available) — always advise parents to verify with their state's Department of Education or HSLDA for the most current laws
- If unsure about a specific feature, say so and suggest they contact support

Keep responses friendly, practical, and focused on helping parents succeed.`;

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
