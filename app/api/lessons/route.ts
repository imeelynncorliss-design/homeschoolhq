import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { child_id, title, subject, description, date, duration } = body;

    const { data, error } = await supabase
      .from('lessons')
      .insert([{
        kid_id: child_id,
        title,
        subject,
        description,
        lesson_date: date,
        duration: duration || null,
        completed: false
      }])
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ lesson: data[0] });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create lesson' }, { status: 500 });
  }
}