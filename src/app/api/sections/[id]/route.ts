import { NextRequest, NextResponse } from 'next/server';
import { updateSection } from '@/lib/db';

interface RouteContext {
  params: { id: string };
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const body = await req.json();
    const updated = await updateSection(params.id, body);
    if (!updated) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, section: updated });
  } catch (error) {
    console.error('Failed to update section:', error);
    return NextResponse.json({ error: 'Failed to update section' }, { status: 500 });
  }
}
