import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { data, error } = await supabase
      .from('lessons')
      .insert([
        {
          kid_id: body.child_id,           // Changed: kid_id instead of child_id
          title: body.title,
          subject: body.subject,
          description: body.description,
          lesson_date: body.date,
          // Removed: duration (doesn't exist in your table)
        },
      ])
      .select();

    if (error) {
      console.error('Error saving lesson:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, lesson: data[0] });
  } catch (error) {
    console.error('Save lesson error:', error);
    return NextResponse.json({ error: 'Failed to save lesson' }, { status: 500 });
  }
}