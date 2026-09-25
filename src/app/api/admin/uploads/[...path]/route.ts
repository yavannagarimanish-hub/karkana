import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth-token';
import { getPersonalizationAssetStream } from '@/lib/storage';

interface RouteContext {
  params: { path: string[] };
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    // 1. Authenticate administrative session
    const sessionCookie = req.cookies.get('karkana_admin_session');
    if (!sessionCookie?.value) {
      return NextResponse.json(
        { error: 'Unauthorized. Administrative session required to access customer personalization assets.' },
        { status: 401 }
      );
    }

    const session = await verifySessionToken(sessionCookie.value);
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Invalid administrative session.' },
        { status: 401 }
      );
    }

    // 2. Resolve object key
    const subPath = params.path.join('/');
    const asset = await getPersonalizationAssetStream(subPath);

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found.' }, { status: 404 });
    }

    // Convert node stream / web stream to Response body
    const headers = new Headers();
    headers.set('Content-Type', asset.contentType);
    headers.set('Cache-Control', 'private, max-age=3600');

    // If web ReadableStream
    if ('getReader' in asset.stream) {
      return new Response(asset.stream as unknown as BodyInit, { headers });
    }

    // If node ReadableStream
    const chunks: Buffer[] = [];
    for await (const chunk of asset.stream as unknown as AsyncIterable<Uint8Array | Buffer | string>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const fullBuffer = Buffer.concat(chunks);

    return new Response(fullBuffer, { headers });
  } catch (error) {
    console.error('Failed to retrieve protected asset:', error);
    return NextResponse.json({ error: 'Failed to retrieve asset' }, { status: 500 });
  }
}
