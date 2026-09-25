import { NextResponse } from 'next/server';
import { getSections } from '@/lib/db';

export async function GET() {
  try {
    const sections = getSections();
    return NextResponse.json({ success: true, sections });
  } catch (error) {
    console.error('Failed to get sections:', error);
    return NextResponse.json({ error: 'Failed to retrieve sections' }, { status: 500 });
  }
}
