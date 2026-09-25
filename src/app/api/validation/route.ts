import { NextResponse } from 'next/server';
import { runCatalogueValidation } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const report = runCatalogueValidation();
    return NextResponse.json({ success: true, report });
  } catch (error) {
    console.error('Validation engine error:', error);
    return NextResponse.json({ error: 'Failed to run catalogue validation' }, { status: 500 });
  }
}
