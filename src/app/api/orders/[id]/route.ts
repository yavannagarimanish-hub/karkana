import { NextRequest, NextResponse } from 'next/server';
import { getOrderById, updateOrderStatus } from '@/lib/db';
import { OrderStatus } from '@/types';

interface RouteContext {
  params: { id: string };
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const order = getOrderById(params.id);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error('Failed to get order:', error);
    return NextResponse.json({ error: 'Failed to retrieve order' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const body = await req.json();
    const { status } = body;

    const validStatuses: OrderStatus[] = [
      'NEW',
      'CONFIRMED',
      'PREPARING',
      'DISPATCHED',
      'DELIVERED',
      'CANCELLED',
    ];

    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid order status' },
        { status: 400 }
      );
    }

    const updated = updateOrderStatus(params.id, status);
    if (!updated) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, order: updated });
  } catch (error) {
    console.error('Failed to update order status:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}
