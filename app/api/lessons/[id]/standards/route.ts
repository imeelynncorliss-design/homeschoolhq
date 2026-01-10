// ============================================================================
// API Route: /api/lessons/[id]/standards
// Link standards to lessons
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

// GET - Get all standards linked to a lesson
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const { data, error } = await supabase
      .from('lesson_standards')
      .select(`
        *,
        standard:standards(*)
      `)
      .eq('lesson_id', id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: { standards: data || [] }
    });
  } catch (error) {
    console.error('Error fetching lesson standards:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch standards' },
      { status: 500 }
    );
  }
}

// POST - Link standards to a lesson
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { standard_ids } = body;

    if (!standard_ids || !Array.isArray(standard_ids)) {
      return NextResponse.json(
        { success: false, error: 'standard_ids array required' },
        { status: 400 }
      );
    }

    // Check for duplicates
    const { data: existing } = await supabase
      .from('lesson_standards')
      .select('standard_id')
      .eq('lesson_id', id);

    const existingIds = new Set(existing?.map(e => e.standard_id) || []);
    const newIds = standard_ids.filter(sid => !existingIds.has(sid));

    if (newIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: { added: 0, skipped: standard_ids.length }
      });
    }

    // Insert new links
    const records = newIds.map(standard_id => ({
      lesson_id: id,
      standard_id
    }));

    const { error } = await supabase
      .from('lesson_standards')
      .insert(records);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: { added: newIds.length, skipped: standard_ids.length - newIds.length }
    });
  } catch (error) {
    console.error('Error linking standards:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to link standards' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a standard from a lesson
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { lesson_standard_id } = body;

    if (!lesson_standard_id) {
      return NextResponse.json(
        { success: false, error: 'lesson_standard_id required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('lesson_standards')
      .delete()
      .eq('id', lesson_standard_id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Standard removed from lesson'
    });
  } catch (error) {
    console.error('Error removing standard:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove standard' },
      { status: 500 }
    );
  }
}