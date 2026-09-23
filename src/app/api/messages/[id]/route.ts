import { NextRequest } from 'next/server';
import { getDb, type SqlParam } from '@/lib/db';
import { getCurrentUser, ApiError, str } from '@/lib/auth';
import { json, handleError, saveUpload } from '@/lib/api';
import { createNotification } from '@/lib/xp';

/** GET messages in thread: /api/messages/[id] */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError(401, 'UNAUTHORIZED', 'Login required');
    const { id } = await ctx.params;
    const threadId = Number(id);
    const db = getDb();
    const member = db.prepare('SELECT 1 FROM thread_members WHERE thread_id = ? AND user_id = ?').get(threadId, user.id);
    if (!member) throw new ApiError(403, 'FORBIDDEN', 'Not a member of this thread');

    const { searchParams } = new URL(req.url);
    const before = Number(searchParams.get('before') || 0);
    let sql = `SELECT m.*, u.username, p.display_name, p.avatar_path FROM messages m
               JOIN users u ON u.id = m.sender_id JOIN profiles p ON p.user_id = m.sender_id
               WHERE m.thread_id = ?`;
    const args: SqlParam[] = [threadId];
    if (before) { sql += ' AND m.id < ?'; args.push(before); }
    sql += ' ORDER BY m.id DESC LIMIT 50';
    const messages = (db.prepare(sql).all(...args) as Record<string, unknown>[]).reverse();

    const members = db
      .prepare(
        `SELECT u.id, u.username, p.display_name, p.avatar_path, p.level FROM thread_members tm
         JOIN users u ON u.id = tm.user_id JOIN profiles p ON p.user_id = u.id WHERE tm.thread_id = ?`
      )
      .all(threadId);
    const thread = db.prepare('SELECT id, is_group, title FROM threads WHERE id = ?').get(threadId);
    if (!thread) throw new ApiError(404, 'NOT_FOUND', 'Thread not found');

    // mark read
    db.prepare("UPDATE thread_members SET last_read_at = datetime('now') WHERE thread_id = ? AND user_id = ?").run(threadId, user.id);
    db.prepare("UPDATE messages SET read_at = datetime('now') WHERE thread_id = ? AND sender_id != ? AND read_at IS NULL").run(threadId, user.id);

    return json({ thread, messages, members });
  } catch (e) {
    return handleError(e);
  }
}

/** POST send message: text or multipart with media (image/clip) */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError(401, 'UNAUTHORIZED', 'Login required');
    const { id } = await ctx.params;
    const threadId = Number(id);
    const db = getDb();
    const member = db.prepare('SELECT 1 FROM thread_members WHERE thread_id = ? AND user_id = ?').get(threadId, user.id);
    if (!member) throw new ApiError(403, 'FORBIDDEN', 'Not a member');

    const contentType = req.headers.get('content-type') || '';
    let kind = 'text';
    let content = '';
    let mediaPath = '';

    if (contentType.includes('multipart')) {
      const form = await req.formData();
      content = str(form.get('content') ?? '', 1000);
      const media = form.get('media');
      const mediaKind = String(form.get('kind') || 'image');
      if (media instanceof File && media.size > 0) {
        mediaPath = (await saveUpload(media, mediaKind === 'clip' ? 'video' : 'image', 'msg')) || '';
        kind = mediaKind === 'clip' ? 'clip' : 'image';
      }
    } else {
      const body = await req.json().catch(() => ({}));
      content = str(body.content ?? '', 1000);
    }
    if (!content && !mediaPath) throw new ApiError(400, 'VALIDATION', 'Message empty');

    const res = db
      .prepare('INSERT INTO messages (thread_id, sender_id, kind, content, media_path) VALUES (?, ?, ?, ?, ?)')
      .run(threadId, user.id, kind, content, mediaPath);
    db.prepare("UPDATE thread_members SET last_read_at = datetime('now') WHERE thread_id = ? AND user_id = ?").run(threadId, user.id);

    // notify other members
    const others = db.prepare('SELECT user_id FROM thread_members WHERE thread_id = ? AND user_id != ?').all(threadId, user.id) as { user_id: number }[];
    others.forEach((o) => createNotification(o.user_id, 'message', user.id, 'thread', threadId, { username: user.username, excerpt: (content || '📎').slice(0, 60) }));

    const message = db
      .prepare(
        `SELECT m.*, u.username, p.display_name, p.avatar_path FROM messages m
         JOIN users u ON u.id = m.sender_id JOIN profiles p ON p.user_id = m.sender_id WHERE m.id = ?`
      )
      .get(Number(res.lastInsertRowid));
    return json({ ok: true, message }, 201);
  } catch (e) {
    return handleError(e);
  }
}
