import { generateText } from 'ai'
import { getModel } from '@/lib/ai'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { kidId, subject, topic, vibe } = await request.json()

    // Fetch kid profile
    const { data: kid } = await supabase
      .from('kids')
      .select('displayname, age, grade, learning_style, current_hook')
      .eq('id', kidId)
      .single()

    if (!kid) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

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
Subject: ${subject}
${topic ? `Topic/focus: ${topic}` : ''}
Activity vibe: ${vibeDesc[vibe] || vibe}

Each activity should:
- Take 10–30 minutes
- Require minimal prep (common household materials)
- Feel fun, not like "more school"
- Match the vibe requested

Return ONLY valid JSON:
{
  "activities": [
    {
      "title": "Catchy title",
      "emoji": "one relevant emoji",
      "duration_minutes": 20,
      "description": "One sentence: what the student actually does",
      "materials": ["item 1", "item 2"],
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
