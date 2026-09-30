// app/api/import-curriculum/route.ts

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { CLAUDE_SONNET_MODEL } from '@/lib/ai';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    // 'files' carries one or more images, or a single PDF. Fall back to the
    // older singular 'file' field for any caller still using it.
    const files = formData.getAll('files').filter((f): f is File => f instanceof File);
    const legacyFile = formData.get('file') as File | null;
    const allFiles = files.length > 0 ? files : (legacyFile ? [legacyFile] : []);
    const subject = formData.get('subject') as string;

    if (allFiles.length === 0) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const isPDF = allFiles[0].type === 'application/pdf';
    const isImage = (f: File) => f.type.startsWith('image/');

    if (isPDF && allFiles.length > 1) {
      return NextResponse.json({ error: 'Only one PDF can be uploaded at a time.' }, { status: 400 });
    }
    if (!isPDF && !allFiles.every(isImage)) {
      return NextResponse.json({ error: 'Invalid file type. Please upload a PDF or image(s).' }, { status: 400 });
    }

    // Prepare content based on file type
    let content: any[];

    if (isPDF) {
      const bytes = await allFiles[0].arrayBuffer();
      const base64Data = Buffer.from(bytes).toString('base64');
      content = [
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: base64Data,
          },
        },
        {
          type: 'text',
          text: `Extract lesson information from this ${subject || ''} curriculum table of contents.

For each lesson, provide:
- title: The lesson name/number
- description: Brief description of what the lesson covers
- duration: Estimated time if mentioned (optional)

Return ONLY a valid JSON array with this structure:
[
  {
    "title": "Lesson 1: Introduction",
    "description": "Overview of the subject",
    "duration": "1 week"
  }
]

Important:
- Extract ALL lessons you find
- Keep titles concise
- Include lesson numbers if present
- Return valid JSON only, no other text`
        },
      ];
    } else {
      // Handle one or more image pages, in order, as a single table of contents.
      const imageBlocks = await Promise.all(allFiles.map(async (f) => {
        const bytes = await f.arrayBuffer();
        const base64Data = Buffer.from(bytes).toString('base64');
        const mediaType = f.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
        return {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType,
            data: base64Data,
          },
        };
      }));

      const pageNote = allFiles.length > 1
        ? `This is a set of ${allFiles.length} photos/screenshots, in order, of a single ${subject || ''} curriculum table of contents that spans multiple pages. Treat them as one continuous table of contents.`
        : `This is a photo/screenshot of a ${subject || ''} curriculum table of contents.`;

      content = [
        ...imageBlocks,
        {
          type: 'text',
          text: `${pageNote} Extract lesson information from it.

For each lesson, provide:
- title: The lesson name/number
- description: Brief description of what the lesson covers
- duration: Estimated time if mentioned (optional)

Return ONLY a valid JSON array with this structure:
[
  {
    "title": "Lesson 1: Introduction",
    "description": "Overview of the subject",
    "duration": "1 week"
  }
]

Important:
- Read all text carefully from every image, in the order given
- Extract ALL lessons you find, without duplicating lessons that appear across page boundaries
- Keep titles concise
- Include lesson numbers if present
- Return valid JSON only, no other text`
        },
      ];
    }

    // Call Claude API
    const message = await anthropic.messages.create({
      model: CLAUDE_SONNET_MODEL,
      max_tokens: 8000, // ✅ INCREASED from 4096 to handle larger curricula
      messages: [
        {
          role: 'user',
          content: content,
        },
      ],
    });

    // ✅ CHECK: Did we hit the token limit?
    if (message.stop_reason === 'max_tokens') {
      return NextResponse.json({ 
        error: 'Curriculum too large - response was truncated',
        hint: 'Try uploading fewer pages at once, or just the first 20-30 lessons',
        details: 'The AI hit its response limit before finishing. Break your curriculum into smaller sections.'
      }, { status: 500 });
    }

    // Extract the text response
    const textContent = message.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json({ error: 'No text response from AI' }, { status: 500 });
    }

    // ✅ IMPROVED: Robust JSON extraction
    let responseText = textContent.text.trim();
    
    // Remove markdown code blocks if present
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    // ✅ NEW: Try to extract JSON array if there's extra text around it
    const jsonMatch = responseText.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (jsonMatch) {
      responseText = jsonMatch[0];
    }
    
    let lessons;
    try {
      lessons = JSON.parse(responseText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Failed to parse response:', responseText.substring(0, 500));
      return NextResponse.json({ 
        error: 'Failed to parse AI response as JSON',
        details: parseError instanceof Error ? parseError.message : 'Unknown error',
        hint: 'The AI response was not valid JSON. This sometimes happens with complex PDFs. Try uploading a clearer image or a different page.'
      }, { status: 500 });
    }

    // Validate that we got an array
    if (!Array.isArray(lessons)) {
      return NextResponse.json({ 
        error: 'AI response was not an array of lessons',
        hint: 'Try uploading just the table of contents page'
      }, { status: 500 });
    }

    // Add subject to each lesson if provided
    const lessonsWithSubject = lessons.map((lesson: any) => ({
      ...lesson,
      subject: subject || lesson.subject || 'General',
    }));

    return NextResponse.json({ 
      lessons: lessonsWithSubject,
      message: `Successfully extracted ${lessonsWithSubject.length} lessons`
    });

  } catch (error) {
    console.error('Import curriculum error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process curriculum', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}