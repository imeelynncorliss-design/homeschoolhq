import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const childId = formData.get('childId') as string;
    
    console.log('File received:', file.name, 'Size:', file.size, 'bytes');

// Check file size (15MB limit)
const maxSize = 15 * 1024 * 1024;
if (file.size > maxSize) {
  return NextResponse.json(
    { error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Please upload just the table of contents (max 15MB), not the entire curriculum.` },
    { status: 400 }
  );
}

if (!file) {
  return NextResponse.json({ error: 'No file provided' }, { status: 400 });
}

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000, //NEW enough rrom for 100+ tokens
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: base64
            }
          },
          {
            type: 'text',
            text: `Extract all lesson plans from this curriculum document. For each lesson, identify title, subject, duration, and brief description.

            CRITICAL: Return ONLY a valid JSON array. No markdown, no explanation, no code blocks.
            All string values must have quotes escaped properly.
            Keep descriptions under 100 characters.
            
            Format:
            [{"title":"Lesson 1","subject":"Math","duration":"30 min","lesson_date":"","description":"Brief summary"}]`
          }
        ]
      }]
    });

    const textContent = message.content.find(block => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in response');
    }
    
    // Clean the response
    let cleanedText = textContent.text.trim();
    cleanedText = cleanedText.replace(/```json\n?/g, '');
    cleanedText = cleanedText.replace(/```\n?/g, '');
    cleanedText = cleanedText.trim();
    
    console.log('Claude response:', cleanedText);  // Show the WHOLE thing, not just first 500 chars;
    
    let lessons;
try {
  lessons = JSON.parse(cleanedText);
} catch (parseError) {
  console.log('JSON parse failed, attempting to fix...');
  
  // Try to fix truncated JSON by closing it properly
  let fixedText = cleanedText.trim();
  
  // If the JSON doesn't end with ], try to close it
  if (!fixedText.endsWith(']')) {
    // Remove any incomplete last object
    const lastCompleteObject = fixedText.lastIndexOf('},');
    if (lastCompleteObject > 0) {
      fixedText = fixedText.substring(0, lastCompleteObject + 1) + ']';
    }
  }
  
  // Try parsing the fixed version
  try {
    lessons = JSON.parse(fixedText);
    console.log(`Successfully parsed ${lessons.length} lessons after fixing truncation`);
  } catch (secondError) {
    console.error('Failed to parse even after fixing:', fixedText.substring(0, 500));
    throw new Error('Could not parse curriculum - PDF format may be too complex. Try a simpler PDF or contact support.');
  }
}
    // Return the parsed lessons
    return NextResponse.json({ lessons });

  } catch (error) {
    console.error('Import curriculum error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process curriculum' },
      { status: 500 }
    );
  }
}