import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireUser, getCurrentUser } from '@/lib/auth';
import { json, handleError } from '@/lib/api';

/** GET notifications for current user (paginated) */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return json({ notifications: [], unread: 0 });
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = 20;
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT n.*, a.username AS actor_username, ap.avatar_path AS actor_avatar, ap.display_name AS actor_name
         FROM notifications n
         LEFT JOIN users a ON a.id = n.actor_id
         LEFT JOIN profiles ap ON ap.user_id = n.actor_id
         WHERE n.user_id = ? ORDER BY n.id DESC LIMIT ? OFFSET ?`
      )
      .all(user.id, limit, (page - 1) * limit) as Record<string, unknown>[];
    const unread = (db.prepare('SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND read_at IS NULL').get(user.id) as { c: number }).c;
    const total = (db.prepare('SELECT COUNT(*) AS c FROM notifications WHERE user_id = ?').get(user.id) as { c: number }).c;
    const notifications = rows.map((r) => {
      let payload: Record<string, unknown> = {};
      try { payload = JSON.parse(String(r.payload || '{}')); } catch {}
      return { ...r, payload };
    });
    return json({ notifications, unread, total, page, pages: Math.ceil(total / limit) });
  } catch (e) {
    return handleError(e);
  }
}

/** POST mark read (all or by id) */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const db = getDb();
    if (body.id) {
      db.prepare("UPDATE notifications SET read_at = datetime('now') WHERE id = ? AND user_id = ?").run(Number(body.id), user.id);
    } else {
      db.prepare("UPDATE notifications SET read_at = datetime('now') WHERE user_id = ? AND read_at IS NULL").run(user.id);
    }
    return json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
