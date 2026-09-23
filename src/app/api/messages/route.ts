import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireUser, getCurrentUser, ApiError, int, str } from '@/lib/auth';
import { json, handleError } from '@/lib/api';
import { createNotification } from '@/lib/xp';

/** GET threads list (with last message + unread count) */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new ApiError(401, 'UNAUTHORIZED', 'Login required');
    const db = getDb();
    const threads = db
      .prepare(
        `SELECT t.id, t.is_group, t.title,
                (SELECT content FROM messages m WHERE m.thread_id = t.id ORDER BY m.id DESC LIMIT 1) AS last_content,
                (SELECT created_at FROM messages m WHERE m.thread_id = t.id ORDER BY m.id DESC LIMIT 1) AS last_at,
                (SELECT COUNT(*) FROM messages m WHERE m.thread_id = t.id
                   AND m.sender_id != ?
                   AND (tm.last_read_at IS NULL OR m.created_at > tm.last_read_at)) AS unread
         FROM threads t
         JOIN thread_members tm ON tm.thread_id = t.id AND tm.user_id = ?
         ORDER BY last_at DESC NULLS LAST, t.id DESC LIMIT 100`
      )
      .all(user.id, user.id) as Record<string, unknown>[];

    // For DMs, attach the other participant
    const enriched = threads.map((t) => {
      const members = db
        .prepare(
          `SELECT u.id, u.username, p.display_name, p.avatar_path, p.level FROM thread_members tm
           JOIN users u ON u.id = tm.user_id JOIN profiles p ON p.user_id = u.id
           WHERE tm.thread_id = ? AND tm.user_id != ? LIMIT 5`
        )
        .all(t.id as number, user.id);
      return { ...t, members };
    });
    return json({ threads: enriched });
  } catch (e) {
    return handleError(e);
  }
}

/** POST start or continue a conversation
 * body: { user_id } for DM  |  { group: true, title, member_ids } for group
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const db = getDb();

    if (body.group) {
      const title = str(body.title ?? 'Group', 60);
      const memberIds: number[] = Array.isArray(body.member_ids)
        ? body.member_ids.map((x: unknown) => Number(x)).filter((x: number) => x > 0 && x !== user.id).slice(0, 50)
        : [];
      const res = db.prepare('INSERT INTO threads (is_group, title) VALUES (1, ?)').run(title);
      const threadId = Number(res.lastInsertRowid);
      db.prepare('INSERT INTO thread_members (thread_id, user_id) VALUES (?, ?)').run(threadId, user.id);
      memberIds.forEach((id) => db.prepare('INSERT OR IGNORE INTO thread_members (thread_id, user_id) VALUES (?, ?)').run(threadId, id));
      return json({ ok: true, threadId }, 201);
    }

    const otherId = int(body.user_id, 1);
    if (otherId === user.id) throw new ApiError(400, 'VALIDATION', 'Cannot message yourself');
    const other = db.prepare('SELECT id FROM users WHERE id = ? AND is_active = 1').get(otherId);
    if (!other) throw new ApiError(404, 'NOT_FOUND', 'User not found');

    // find existing DM
    const existing = db
      .prepare(
        `SELECT t.id FROM threads t
         WHERE t.is_group = 0
           AND EXISTS (SELECT 1 FROM thread_members tm WHERE tm.thread_id = t.id AND tm.user_id = ?)
           AND EXISTS (SELECT 1 FROM thread_members tm WHERE tm.thread_id = t.id AND tm.user_id = ?)
         LIMIT 1`
      )
      .get(user.id, otherId) as { id: number } | undefined;
    if (existing) return json({ ok: true, threadId: existing.id });

    const res = db.prepare('INSERT INTO threads (is_group, title) VALUES (0, ?)').run('');
    const threadId = Number(res.lastInsertRowid);
    db.prepare('INSERT INTO thread_members (thread_id, user_id) VALUES (?, ?)').run(threadId, user.id);
    db.prepare('INSERT INTO thread_members (thread_id, user_id) VALUES (?, ?)').run(threadId, otherId);
    return json({ ok: true, threadId }, 201);
  } catch (e) {
    return handleError(e);
  }
}
