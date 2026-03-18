import { generateText } from 'ai'
import { getModel } from '@/lib/ai'
import { checkAndIncrementUsage } from '@/lib/aiUsage'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { userId, kidId, organizationId, subject, topic, vibe } = await request.json()

    // Usage guardrail — enforce monthly tier limits
    if (userId) {
      const usage = await checkAndIncrementUsage(userId, 'activities')
      if (!usage.allowed) {
        return NextResponse.json({ error: usage.error }, { status: 429 })
      }
    }

    // Fetch kid profile and org materials in parallel
    const [{ data: kid }, { data: materials }] = await Promise.all([
      supabase
        .from('kids')
        .select('displayname, age, grade, learning_style, current_hook, curriculum')
        .eq('id', kidId)
        .single(),
      organizationId
        ? supabase
            .from('materials')
            .select('name, material_type, subject')
            .eq('organization_id', organizationId)
        : Promise.resolve({ data: [] }),
    ])

    if (!kid) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

    const materialNames = (materials ?? []).map((m: { name: string }) => m.name)
    const materialsSection = materialNames.length > 0
      ? `\nMATERIALS ALREADY OWNED:\n${materialNames.map(n => `- ${n}`).join('\n')}\nPrefer activities that use these materials. For each activity, identify which of the above materials are needed (materials_have) and what additional items are needed (materials_need).`
      : `\nFor each activity, list materials_have as [] and list all required items in materials_need.`

    const vibeDesc: Record<string, string> = {
      hands_on:    'hands-on, tactile, build/make/do',
      game:        'game-based, playful, competitive or cooperative',
      brain_break: 'movement-based, energizing, short — a brain break',
      review:      'review and practice, reinforcing something already learned',
    }

    const prompt = `You are Scout, a friendly homeschool co-pilot. Generate 3 quick, engaging activity ideas for a homeschool student.

STUDENT: ${kid.displayname}, Grade ${kid.grade || 'unknown'}, Age ${kid.age || 'unknown'}
Learning style: ${kid.learning_style || 'not specified'}
Current interests: ${kid.current_hook || 'not specified'}
${kid.curriculum ? `Curriculum: ${kid.curriculum}` : ''}
Subject: ${subject}
${topic ? `Topic/focus: ${topic}` : ''}
Activity vibe: ${vibeDesc[vibe] || vibe}
${materialsSection}

Each activity should:
- Take 10–30 minutes
- Feel fun, not like "more school"
- Match the vibe requested
- Be tailored to the student's learning style

Return ONLY valid JSON:
{
  "activities": [
    {
      "title": "Catchy title",
      "emoji": "one relevant emoji",
      "duration_minutes": 20,
      "description": "One sentence: what the student actually does",
      "materials_have": ["item from their inventory"],
      "materials_need": ["item they still need to get"],
      "steps": ["Step 1", "Step 2", "Step 3"]
    }
  ]
}`

    const { text } = await generateText({
      model: getModel(),
      maxOutputTokens: 2000,
      prompt,
    })

    const cleaned = text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '')
    const data = JSON.parse(cleaned)

    return NextResponse.json({ success: true, activities: data.activities ?? [] })
  } catch (error) {
    console.error('generate-activity error:', error)
    return NextResponse.json({ error: 'Failed to generate activities' }, { status: 500 })
  }
}
