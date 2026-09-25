import { NextRequest, NextResponse } from 'next/server';
import { getOrders, createOrder } from '@/lib/db';
import { OrderStatus } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as OrderStatus | null;

    const orders = getOrders({ status: status || undefined });
    return NextResponse.json({ success: true, orders });
  } catch (error) {
    console.error('Failed to get orders:', error);
    return NextResponse.json({ error: 'Failed to retrieve orders' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.customerName || !body.mobile || !body.address || !body.items || !body.items.length) {
      return NextResponse.json(
        { error: 'Customer name, mobile number, address, and items are required' },
        { status: 400 }
      );
    }

    const { houseFlat, streetLocality, city, state, pincode } = body.address;
    if (!houseFlat || !streetLocality || !city || !state || !pincode) {
      return NextResponse.json(
        { error: 'Complete delivery address (house/flat, street, city, state, pincode) is required' },
        { status: 400 }
      );
    }

    const newOrder = createOrder({
      customerName: body.customerName.trim(),
      mobile: body.mobile.trim(),
      address: {
        houseFlat: body.address.houseFlat.trim(),
        streetLocality: body.address.streetLocality.trim(),
        city: body.address.city.trim(),
        state: body.address.state.trim(),
        pincode: body.address.pincode.trim(),
        instructions: body.address.instructions?.trim() || '',
      },
      items: body.items,
      totalAmount: Number(body.totalAmount),
    });

    return NextResponse.json({ success: true, order: newOrder }, { status: 201 });
  } catch (error) {
    console.error('Failed to create order:', error);
    return NextResponse.json({ error: 'Failed to place order' }, { status: 500 });
  }
}
