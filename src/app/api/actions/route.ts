import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser, ApiError, int, str } from '@/lib/auth';
import { json, handleError } from '@/lib/api';
import { createNotification } from '@/lib/xp';

/**
 * POST /api/actions — misc state-changing helpers
 * body: { action, ... }
 *  - clip_view { clip_id }         -> bump view count
 *  - clip_save { clip_id }         -> toggle save
 *  - share { url }                 -> log share
 *  - start_chat { user_id }        -> returns threadId
 *  - language { lang }             -> set UI language cookie handled client side; persists for user
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json().catch(() => ({}));
    const action = str(body.action, 40);
    const db = getDb();

    if (action === 'clip_view') {
      const id = int(body.clip_id, 1);
      const clip = db.prepare('SELECT user_id FROM clips WHERE id = ?').get(id);
      if (!clip) throw new ApiError(404, 'NOT_FOUND', 'Clip not found');
      // simple per-session de-dupe via cookie-less counter (increment always; rate-limited client)
      db.prepare('UPDATE clips SET views = views + 1 WHERE id = ?').run(id);
      return json({ ok: true });
    }

    if (action === 'clip_save') {
      if (!user) throw new ApiError(401, 'UNAUTHORIZED', 'Login required');
      const id = int(body.clip_id, 1);
      const clip = db.prepare('SELECT id FROM clips WHERE id = ?').get(id);
      if (!clip) throw new ApiError(404, 'NOT_FOUND', 'Clip not found');
      const existing = db
        .prepare("SELECT id FROM notifications WHERE user_id = ? AND type = 'clip_saved' AND entity_type = 'clip' AND entity_id = ?")
        .get(user.id, id);
      if (existing) {
        db.prepare("DELETE FROM notifications WHERE user_id = ? AND type = 'clip_saved' AND entity_id = ?").run(user.id, id);
        return json({ ok: true, saved: false });
      }
      db.prepare("INSERT INTO notifications (user_id, type, entity_type, entity_id) VALUES (?, 'clip_saved', 'clip', ?)").run(user.id, id);
      return json({ ok: true, saved: true });
    }

    if (action === 'language') {
      if (!user) throw new ApiError(401, 'UNAUTHORIZED', 'Login required');
      const lang = body.lang === 'en' ? 'en' : 'fa';
      db.prepare('UPDATE users SET language = ? WHERE id = ?').run(lang, user.id);
      return json({ ok: true, lang });
    }

    if (action === 'start_chat') {
      if (!user) throw new ApiError(401, 'UNAUTHORIZED', 'Login required');
      const otherId = int(body.user_id, 1);
      if (otherId === user.id) throw new ApiError(400, 'VALIDATION', 'Cannot message yourself');
      const other = db.prepare('SELECT id FROM users WHERE id = ? AND is_active = 1').get(otherId);
      if (!other) throw new ApiError(404, 'NOT_FOUND', 'User not found');
      const existing = db
        .prepare(
          `SELECT t.id FROM threads t WHERE t.is_group = 0
           AND EXISTS (SELECT 1 FROM thread_members tm WHERE tm.thread_id = t.id AND tm.user_id = ?)
           AND EXISTS (SELECT 1 FROM thread_members tm WHERE tm.thread_id = t.id AND tm.user_id = ?) LIMIT 1`
        )
        .get(user.id, otherId) as { id: number } | undefined;
      if (existing) return json({ ok: true, threadId: existing.id });
      const res = db.prepare('INSERT INTO threads (is_group, title) VALUES (0, ?)').run('');
      const threadId = Number(res.lastInsertRowid);
      db.prepare('INSERT INTO thread_members (thread_id, user_id) VALUES (?, ?)').run(threadId, user.id);
      db.prepare('INSERT INTO thread_members (thread_id, user_id) VALUES (?, ?)').run(threadId, otherId);
      return json({ ok: true, threadId }, 201);
    }

    if (action === 'profile_view') {
      // track profile views (no auth required)
      const username = str(body.username, 24);
      const target = db.prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE').get(username) as { id: number } | undefined;
      if (target && (!user || target.id !== user.id)) {
        db.prepare('UPDATE profiles SET profile_views = profile_views + 1 WHERE user_id = ?').run(target.id);
      }
      return json({ ok: true });
    }

    throw new ApiError(400, 'VALIDATION', 'Unknown action');
  } catch (e) {
    return handleError(e);
  }
}
