// app/api/students/[id]/proficiency/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { updateStudentProficiency, getStudentAllProficiencies } from '@/lib/utils-standards';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const proficiencies = await getStudentAllProficiencies(id);
    return NextResponse.json({ success: true, data: proficiencies });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const body = await request.json();
    const result = await updateStudentProficiency(
      id,
      body.standard_id,
      body.proficiency_level,
      body.organization_id,
      body.notes,
      body.user_id
    );
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 });
  }
}