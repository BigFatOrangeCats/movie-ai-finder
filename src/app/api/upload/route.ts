// app/api/upload/route.ts
import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    console.log('Upload request received'); // 日志1：请求进来

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.log('No file in formData');
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    console.log('File received:', file.name, file.size, file.type); // 日志2：文件信息

    // 检查 token 是否存在
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('BLOB_READ_WRITE_TOKEN missing');
      return NextResponse.json({ error: 'Storage token missing' }, { status: 500 });
    }

    const blob = await put(file.name, file, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN, // 显式加，保险
    });

    console.log('Upload success:', blob.url); // 日志3：成功

    return NextResponse.json({ url: blob.url });
  } catch (error: any) {
    console.error('Upload failed:', error.message, error.stack); // 详细错误日志
    return NextResponse.json(
      { error: error.message || 'Upload failed - check Vercel logs' },
      { status: 500 }
    );
  }
}