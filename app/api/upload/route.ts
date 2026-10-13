import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf']);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    const uploadedBy = (formData.get('uploadedBy') as string) || 'Authorized Staff';

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided for upload' }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'proofs');
    await mkdir(uploadDir, { recursive: true });

    const now = new Date();
    const formattedTimestamp = now.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const attachments = [];

    for (const file of files) {
      // Validate file type
      const mimeType = file.type?.toLowerCase() || '';
      const originalName = file.name || 'unnamed-proof';
      const ext = path.extname(originalName).toLowerCase();

      const isAllowedMime = ALLOWED_MIME_TYPES.has(mimeType);
      const isAllowedExt = ALLOWED_EXTENSIONS.has(ext);

      if (!isAllowedMime && !isAllowedExt) {
        return NextResponse.json(
          {
            error: `Unsupported file format for "${originalName}". Only JPG, PNG, WEBP, and PDF documents are supported.`,
          },
          { status: 400 }
        );
      }

      const cleanBaseName = path
        .basename(originalName, ext)
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .substring(0, 50);

      const uniqueSuffix = `${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const savedFileName = `${cleanBaseName}-${uniqueSuffix}${ext || (mimeType === 'application/pdf' ? '.pdf' : '.png')}`;
      const savedFilePath = path.join(uploadDir, savedFileName);

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      await writeFile(savedFilePath, buffer);

      const fileUrl = `/uploads/proofs/${savedFileName}`;
      const relativeFilePath = `public/uploads/proofs/${savedFileName}`;

      attachments.push({
        id: `att-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        fileName: originalName,
        filePath: relativeFilePath,
        fileType: mimeType || (ext === '.pdf' ? 'application/pdf' : 'image/jpeg'),
        fileSize: file.size,
        fileUrl,
        uploadedBy,
        uploadedTimestamp: formattedTimestamp,
      });
    }

    return NextResponse.json({ success: true, attachments });
  } catch (err: any) {
    console.error('File upload error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to process file upload. Please try again.' },
      { status: 500 }
    );
  }
}
