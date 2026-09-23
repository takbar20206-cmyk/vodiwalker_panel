import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireUser, ApiError, int, str, rateLimit } from '@/lib/auth';
import { json, handleError } from '@/lib/api';
import { awardXp, createNotification, evaluateAchievements } from '@/lib/xp';

/** GET comments for a target */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetType = str(searchParams.get('target_type') ?? '', 20);
    const targetId = int(searchParams.get('target_id') ?? 0, 1);
    const db = getDb();
    const comments = db
      .prepare(
        `SELECT c.*, u.username, p.display_name, p.avatar_path, p.level
         FROM comments c JOIN users u ON u.id = c.user_id JOIN profiles p ON p.user_id = c.user_id
         WHERE c.target_type = ? AND c.target_id = ? ORDER BY c.id ASC LIMIT 200`
      )
      .all(targetType, targetId);
    return json({ comments });
  } catch (e) {
    return handleError(e);
  }
}

/** POST add comment */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    rateLimit(`comment:${user.id}`, 20, 60_000);
    const body = await req.json().catch(() => ({}));
    const targetType = str(body.target_type, 20);
    const targetId = int(body.target_id, 1);
    const content = str(body.content, 800);
    if (!content) throw new ApiError(400, 'VALIDATION', 'Comment required');
    if (!['post', 'clip'].includes(targetType)) throw new ApiError(400, 'VALIDATION', 'Bad target');

    const db = getDb();
    const table = targetType === 'post' ? 'posts' : 'clips';
    const target = db.prepare(`SELECT user_id FROM ${table} WHERE id = ?`).get(targetId) as { user_id: number } | undefined;
    if (!target) throw new ApiError(404, 'NOT_FOUND', 'Target not found');

    const res = db
      .prepare('INSERT INTO comments (user_id, target_type, target_id, content) VALUES (?, ?, ?, ?)')
      .run(user.id, targetType, targetId, content);
    db.prepare(`UPDATE ${table} SET comments_count = comments_count + 1 WHERE id = ?`).run(targetId);
    awardXp(user.id, 'COMMENT');
    if (target.user_id !== user.id) {
      createNotification(target.user_id, 'comment', user.id, targetType, targetId, { username: user.username, excerpt: content.slice(0, 80) });
    }
    evaluateAchievements(user.id);
    const comment = db
      .prepare(
        `SELECT c.*, u.username, p.display_name, p.avatar_path, p.level
         FROM comments c JOIN users u ON u.id = c.user_id JOIN profiles p ON p.user_id = c.user_id WHERE c.id = ?`
      )
      .get(Number(res.lastInsertRowid));
    return json({ ok: true, comment }, 201);
  } catch (e) {
    return handleError(e);
  }
}

/** DELETE own comment or target owner moderates */
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const id = int(searchParams.get('id'), 1);
    const db = getDb();
    const c = db.prepare('SELECT * FROM comments WHERE id = ?').get(id) as { user_id: number; target_type: string; target_id: number } | undefined;
    if (!c) throw new ApiError(404, 'NOT_FOUND', 'Not found');
    if (c.user_id !== user.id && user.role !== 'admin') throw new ApiError(403, 'FORBIDDEN', 'Not yours');
    db.prepare('DELETE FROM comments WHERE id = ?').run(id);
    const table = c.target_type === 'post' ? 'posts' : 'clips';
    db.prepare(`UPDATE ${table} SET comments_count = MAX(0, comments_count - 1) WHERE id = ?`).run(c.target_id);
    return json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
