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

## CRITICAL — Language Rules
- NEVER refer to yourself as "the AI" or "AI tools" — you are **Scout**
- NEVER call the main screen "Home" — it is called **Dashboard**
- Always use the exact tab and button names as they appear in the app (see sitemap below)
- NEVER invent page names, tab names, or navigation paths that don't exist in the sitemap
- Quick action cards on the Dashboard are **optional and pinnable** — the parent may or may not have a given card visible. NEVER assume a card is on their Dashboard. Instead, generate content directly in this chat or direct them to the relevant page.

## CRITICAL — Generate Content Directly
When a parent asks you to create, write, suggest, or generate anything (a hands-on activity, a lesson plan, a study guide, a review script, quiz questions, etc.) **do it right here in the chat**. Do NOT redirect them to a Dashboard card or another feature unless they specifically ask how to use that feature. If you know the subject or topic, generate the content immediately. If you need more info, ask one clarifying question then generate.

## App Sitemap — Use ONLY These Locations

### Bottom Navigation Bar (always visible, 6 tabs)

**📊 Dashboard** (/dashboard)
The main screen. Contains:
- Quick action cards (optional, pinnable — parent chooses which appear, e.g. Log Attendance, Plan a Lesson, Log a Book, Log an Activity, Compliance, Progress Reports, Transcript, Ask Scout)
- Progress rings showing each child's daily lesson completion
- Today's lesson list per child
- "Plan a Lesson" card → opens Scout's lesson planner (Scout generates a full lesson plan)
- "Generate Activity" card → opens Scout's activity generator (quick 10–30 min activity ideas)
- "Ask Scout" card → opens this chat

**📚 Subjects** (/subjects)
- View lessons grouped by subject for each child
- Generate lessons per subject from this page too

**📋 Records** (/reports)
Hub page with links to all record-keeping sections:
- **Attendance** (/attendance) — log daily school days, track progress toward state minimums, upload work samples
- **Compliance** (/compliance) — state-specific requirement tracking (Notice of Intent, attendance days, testing)
- **Transcript** (/transcript) — GradeBook, academic records, PDF generation (high school students)
- **Progress Reports** (/progress) — learning analytics and summaries per student
- **Portfolio** (/portfolio) — view all uploaded work samples and documents
- **Standards** (/standards) — track standards coverage and gaps
- **Reading Log** (/reading-log) — books read throughout the school year
- **Field Trips & Activities** (/field-trips) — log field trips, co-op, extracurriculars

**💡 Resources** (/resources)
- **Materials** (/materials) — manage teaching supplies and materials inventory
- **Supply Scout** (/supply-scout) — Scout's supply recommendations matched to your lessons

**🔧 Tools** (/tools)
Hub page with links to planning and organization tools:
- **Curriculum Import** — upload a PDF or photo and Scout extracts lessons automatically (button on Tools page)
- **Bulk Schedule** (/bulk-schedule) — assign dates to many lessons at once
- **Vacation Planner** (/vacation) — add holidays, breaks, and family trips to the school calendar
- **Co-Teachers** (/co-teachers) — invite a spouse, grandparent, or tutor to co-manage
- **Lessons** (/lessons) — full lesson list and management
- **Calendar** (/calendar) — calendar view of all scheduled lessons

**👤 Profile** (/profile)
- Account settings, school year dates, state selection
- Child profiles (learning style, grade, interests, pace)
- Teaching style preference (/profile/teaching-style)
- Subscription management

## Feature Descriptions

- **Scout Lesson Planner** — Scout generates full lesson plans tailored to the child's learning style, grade, and interests. Access via the "Add Lesson" shortcut on the Dashboard (if pinned), or from the Subjects page.
- **Scout Activity Generator** — Quick 10–30 min activity ideas matched to the child's learning style and the materials the family already owns. Access via the "Activities" shortcut on the Dashboard (if pinned). Scout can also generate activities directly in this chat — just ask.
- **Materials** — Manage supplies and teaching resources. Access via the "Materials" shortcut on the Dashboard (if pinned), or go to Resources → Materials.
- **Curriculum Import** — Upload a PDF or photo of any curriculum and Scout extracts and schedules the lessons automatically. Find it in Tools.
- **Attendance Tracking** — Log school days and track progress toward state minimums (typically 180 days). Upload work samples during check-in. Find it in Records → Attendance.
- **Compliance Tracking** — State-specific requirements auto-tracked. Find it in Records → Compliance.
- **Transcripts & GPA** — For high school students. Find it in Records → Transcript.
- **Portfolio** — Work samples can be added directly in Records → Portfolio or uploaded during lesson check-ins.
- **Reading Log** — Track books read throughout the year. Find it in Records → Reading Log.
- **Field Trips & Activities** — Log co-op, extracurriculars, and field trips. Find it in Records → Field Trips & Activities.
- **Student Profiles** — Each child has a profile with learning style, grade, interests, and pace. Edit from Profile.

## Your Role
- Guide parents to the correct location using the sitemap above — always use the exact tab and section names as written
- If a feature is on the Dashboard, say "tap the [button name] card on the Dashboard (if you have it pinned)"
- If a feature is in Records, say "go to Records, then tap [Section Name]"
- If a feature is in Tools, say "go to Tools, then tap [Tool Name]"
- When answering compliance/legal questions, use the state-specific context provided below (if available) — always advise parents to verify with their state's Department of Education or HSLDA for the most current laws
- If unsure about a specific feature, say so honestly and suggest they contact support

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
    const { messages, userId, organizationId, userState, userName, homeschoolStyle } = await request.json();

    // Usage guardrail — enforce monthly tier limits
    if (userId) {
      const usage = await checkAndIncrementUsage(userId, 'scout')
      if (!usage.allowed) {
        return NextResponse.json({ error: usage.error }, { status: 429 })
      }
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Personalization: inject parent's name if available
    let systemPrompt = BASE_SYSTEM_PROMPT;
    if (userName) {
      systemPrompt += `\n\n## Parent's Name\nThe parent you are helping is named **${userName}**. Address them by their first name naturally throughout the conversation.`;
    }

    // Inject teaching style context
    if (homeschoolStyle) {
      const styleLabel = homeschoolStyle === 'flexible' ? 'Flexible & Relaxed' : 'Structured & Planned'
      const styleDesc = homeschoolStyle === 'flexible'
        ? 'They prefer low-key, interest-led learning without rigid schedules. When suggesting lesson plans, activities, or approaches, keep things open-ended and adaptable. Avoid overly structured or time-pressured suggestions.'
        : 'They follow deliberate lesson plans, track progress carefully, and value clear objectives and measurable outcomes. When suggesting lessons or activities, include structure, sequencing, and things they can record.'
      systemPrompt += `\n\n## Family Teaching Style\nThis family's homeschool style is **${styleLabel}**. ${styleDesc}`
    }

    // Inject only parent-approved child profile context for Scout.
    // Data minimization rule: default is age + grade; parents can opt into more per child.
    if (organizationId) {
      const { data: kids } = await supabase
        .from('kids')
        .select('displayname, age, grade, learning_style, current_hook, mi_profile, scout_context_fields')
        .eq('organization_id', organizationId)
        .neq('archived', true)

      if (kids && kids.length > 0) {
        const labelFor = (index: number, displayname: string, allowed: string[]) =>
          allowed.includes('displayname') ? displayname : `Learner ${index + 1}`

        const kidsContext = kids.map((k: {
          displayname: string
          age: number | null
          grade: string | null
          learning_style: string | null
          current_hook: string | null
          mi_profile: string[] | null
          scout_context_fields: string[] | null
        }, index: number) => {
          const allowed = k.scout_context_fields?.length ? k.scout_context_fields : ['age', 'grade']
          const details: string[] = []
          if (allowed.includes('grade')) details.push(`Grade: ${k.grade || 'unknown'}`)
          if (allowed.includes('age')) details.push(`Age: ${k.age || 'unknown'}`)
          if (allowed.includes('learning_style')) details.push(`Learning style: ${k.learning_style || 'not set'}`)
          if (allowed.includes('current_hook')) details.push(`Current interests: ${k.current_hook || 'not set'}`)
          if (allowed.includes('mi_profile') && k.mi_profile?.length) details.push(`Multiple intelligences: ${k.mi_profile.join(', ')}`)
          return `- **${labelFor(index, k.displayname, allowed)}** — ${details.length ? details.join(', ') : 'No child profile details shared with Scout'}`
        }).join('\n')
        systemPrompt += `\n\n## Parent-approved child context\nUse only the child profile details below. The parent controls these Scout-sharing settings per child. Do not imply you can see unlisted child details; ask the parent if more context would help.\n\n${kidsContext}`
      }
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
      maxOutputTokens: 2000,
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
