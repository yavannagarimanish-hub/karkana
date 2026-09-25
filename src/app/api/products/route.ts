import { NextRequest, NextResponse } from 'next/server';
import { getProducts, createProduct } from '@/lib/db';
import { ProductModule } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const moduleParam = searchParams.get('module') as ProductModule | null;
    const is_featured = searchParams.get('featured') === 'true' ? true : undefined;
    const is_popular = searchParams.get('popular') === 'true' ? true : undefined;
    const is_visible = searchParams.get('all') === 'true' ? undefined : true; // Storefront only sees visible by default
    const search = searchParams.get('search') || undefined;
    const category = searchParams.get('category') || undefined;

    const products = await getProducts({
      module: moduleParam || undefined,
      is_featured,
      is_popular,
      is_visible,
      search,
      category,
    });

    return NextResponse.json({ success: true, products });
  } catch (error) {
    console.error('Failed to get products:', error);
    return NextResponse.json({ error: 'Failed to retrieve products' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.name || !body.price || !body.module) {
      return NextResponse.json(
        { error: 'Name, price, and module are required' },
        { status: 400 }
      );
    }

    const validModules: ProductModule[] = ['BASIC', 'CUSTOMIZED', 'PERSONALIZED'];
    if (!validModules.includes(body.module)) {
      return NextResponse.json(
        { error: 'Module must be BASIC, CUSTOMIZED, or PERSONALIZED' },
        { status: 400 }
      );
    }

    const product = await createProduct({
      name: body.name.trim(),
      images: Array.isArray(body.images) ? body.images : body.images ? [body.images] : [],
      description: body.description || '',
      price: Number(body.price),
      original_price: body.original_price ? Number(body.original_price) : undefined,
      module: body.module,
      category: body.category || 'General',
      is_featured: Boolean(body.is_featured),
      is_popular: Boolean(body.is_popular),
      is_visible: body.is_visible !== undefined ? Boolean(body.is_visible) : true,
      in_stock: body.in_stock !== undefined ? Boolean(body.in_stock) : true,
      display_position: body.display_position ? Number(body.display_position) : undefined,
    });

    return NextResponse.json({ success: true, product }, { status: 201 });
  } catch (error) {
    console.error('Failed to create product:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
