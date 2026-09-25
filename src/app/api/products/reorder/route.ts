import { NextRequest, NextResponse } from 'next/server';
import { reorderProducts } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderedIds } = body;

    if (!Array.isArray(orderedIds)) {
      return NextResponse.json(
        { error: 'orderedIds array is required' },
        { status: 400 }
      );
    }

    const updatedList = reorderProducts(orderedIds);
    return NextResponse.json({ success: true, products: updatedList });
  } catch (error) {
    console.error('Failed to reorder products:', error);
    return NextResponse.json({ error: 'Failed to reorder products' }, { status: 500 });
  }
}
