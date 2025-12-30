import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { 
      childName, 
      subject, 
      gradeLevel, 
      duration, 
      learningObjectives, 
      materials, 
      learningStyle,
      variationCount = 3 
    } = await request.json();

    // Generate multiple variations in parallel
    const variations = await Promise.all(
      Array.from({ length: variationCount }, async (_, index) => {
        const message = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [{
            role: 'user',
            content: `Create homeschool lesson plan variation ${index + 1} of ${variationCount} for ${childName}:

Subject: ${subject}
Grade Level: ${gradeLevel}
Duration: ${duration} minutes
${learningObjectives ? `Learning Objectives: ${learningObjectives}` : ''}
${materials ? `Available Materials: ${materials}` : ''}
${learningStyle ? `Learning Style: ${learningStyle}` : ''}

Make each variation unique in approach (hands-on vs. discussion-based vs. creative, etc.).

Return ONLY valid JSON (no markdown, no explanation) with this exact structure:
{
  "title": "engaging lesson title",
  "approach": "brief description of teaching approach",
  "materials": ["item 1", "item 2"],
  "activities": [
    {
      "name": "activity name",
      "duration": "10 min",
      "description": "what to do"
    }
  ],
  "assessment": "how to check understanding",
  "extensions": ["enrichment idea 1", "enrichment idea 2"]
}`
          }]
        });

        // Parse the JSON response
const textContent = message.content.find(block => block.type === 'text');
if (!textContent || textContent.type !== 'text') {
  throw new Error('No text content in response');
}
return JSON.parse(textContent.text);
      })
    );

    return NextResponse.json({ variations });
  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate lessons' }, 
      { status: 500 }
    );
  }
}