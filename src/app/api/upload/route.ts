// app/api/upload/route.ts
import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    console.log('Upload request received');

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.log('No file in formData');
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    console.log('File received:', file.name, file.size, file.type);

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('BLOB_READ_WRITE_TOKEN missing');
      return NextResponse.json({ error: 'Storage token missing' }, { status: 500 });
    }

    // 关键修改：加 addRandomSuffix: true，避免同名冲突
    const blob = await put(file.name, file, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: true,  // ← 加这一行！自动生成唯一文件名
      // 如果你想允许覆盖同名文件，可以改成：allowOverwrite: true
    });

    console.log('Upload success:', blob.url);

    return NextResponse.json({ url: blob.url });
  } catch (error: any) {
    console.error('Upload failed:', error.message, error.stack);
    return NextResponse.json(
      { error: error.message || 'Upload failed - check Vercel logs' },
      { status: 500 }
    );
  }
}