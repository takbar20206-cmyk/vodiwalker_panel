import { NextRequest, NextResponse } from 'next/server';
import { ApiError } from './auth';
import { cookies } from 'next/headers';
import type { Lang } from './i18n';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

export function json(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function handleError(e: unknown): NextResponse {
  if (e instanceof ApiError) {
    return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
  }
  console.error('[GAMER-ID]', e);
  return NextResponse.json({ error: 'Internal server error', code: 'INTERNAL' }, { status: 500 });
}

export async function getLang(): Promise<Lang> {
  const jar = await cookies();
  const c = jar.get('gid_lang')?.value;
  return c === 'en' ? 'en' : 'fa';
}

export function clientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'local'
  );
}

/* ---------------- Upload validation ---------------- */

const IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
};
const VIDEO_TYPES: Record<string, string> = {
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
};

export const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

export async function saveUpload(
  file: File | null | undefined,
  kind: 'image' | 'video' | 'any',
  prefix: string
): Promise<string | null> {
  if (!file || typeof file === 'string' || file.size === 0) return null;
  const max = Number(process.env.MAX_UPLOAD_BYTES || 52428800);
  if (file.size > max) throw new ApiError(413, 'FILE_TOO_LARGE', 'File too large');
  const type = file.type;
  let ext: string | undefined;
  if (kind === 'image' || kind === 'any') ext = IMAGE_TYPES[type];
  if (!ext && (kind === 'video' || kind === 'any')) ext = VIDEO_TYPES[type];
  if (!ext) throw new ApiError(400, 'INVALID_FILE', 'Unsupported file type');
  // magic-byte sniff for images
  if (ext && IMAGE_TYPES[type]) {
    const buf = Buffer.from(await file.slice(0, 12).arrayBuffer());
    const ok =
      (type === 'image/jpeg' && buf[0] === 0xff && buf[1] === 0xd8) ||
      (type === 'image/png' && buf[0] === 0x89 && buf[1] === 0x50) ||
      (type === 'image/gif' && buf.subarray(0, 3).toString() === 'GIF') ||
      (type === 'image/webp' && buf.subarray(0, 4).toString() === 'RIFF') ||
      type === 'image/avif';
    if (!ok) throw new ApiError(400, 'INVALID_FILE', 'File content does not match type');
  }
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const name = `${prefix}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
  const target = path.join(UPLOADS_DIR, name);
  const bytes = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(target, bytes);
  return `/uploads/${name}`;
}
