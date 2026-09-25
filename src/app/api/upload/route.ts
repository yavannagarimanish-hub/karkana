import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const type = (formData.get('type') as string) || 'product'; // 'product' | 'personalization'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = path.extname(file.name) || '.jpg';
    const cleanExt = ext.toLowerCase().match(/^\.(jpg|jpeg|png|webp|gif|svg)$/) ? ext : '.jpg';
    const filename = `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${cleanExt}`;

    if (type === 'personalization') {
      const { uploadPersonalizationFile } = await import('@/lib/storage');
      const result = await uploadPersonalizationFile(filename, buffer, file.type || 'image/jpeg');
      return NextResponse.json({
        success: true,
        url: result.url,
        filename,
      });
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'products');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/products/${filename}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename,
    });
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process file upload' },
      { status: 500 }
    );
  }
}
