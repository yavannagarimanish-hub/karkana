import { NextResponse } from 'next/server';
import { getMetrics } from '@/lib/db';

export async function GET() {
  try {
    const metrics = getMetrics();
    return NextResponse.json({ success: true, metrics });
  } catch (error) {
    console.error('Failed to get metrics:', error);
    return NextResponse.json({ error: 'Failed to retrieve metrics' }, { status: 500 });
  }
}
