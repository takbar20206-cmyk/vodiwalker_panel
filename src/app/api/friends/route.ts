import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireUser, ApiError, int, rateLimit } from '@/lib/auth';
import { json, handleError } from '@/lib/api';
import { createNotification, awardXp, evaluateAchievements } from '@/lib/xp';

/** POST: action = request | accept | decline | remove */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    rateLimit(`friend:${user.id}`, 30, 60_000);
    const body = await req.json().catch(() => ({}));
    const targetId = int(body.user_id, 1);
    const action = String(body.action || 'request');
    if (targetId === user.id) throw new ApiError(400, 'VALIDATION', 'Invalid target');
    const db = getDb();
    const target = db.prepare('SELECT id FROM users WHERE id = ? AND is_active = 1').get(targetId);
    if (!target) throw new ApiError(404, 'NOT_FOUND', 'User not found');

    if (action === 'request') {
      const outgoing = db.prepare('SELECT status FROM friends WHERE user_id = ? AND friend_id = ?').get(user.id, targetId) as { status: string } | undefined;
      const incoming = db.prepare('SELECT status FROM friends WHERE user_id = ? AND friend_id = ?').get(targetId, user.id) as { status: string } | undefined;
      if (outgoing?.status === 'accepted' || incoming?.status === 'accepted') return json({ ok: true, status: 'accepted' });
      if (outgoing?.status === 'pending') return json({ ok: true, status: 'pending' });
      if (incoming?.status === 'pending') {
        // auto-accept: they already asked us
        db.prepare("UPDATE friends SET status = 'accepted' WHERE user_id = ? AND friend_id = ?").run(targetId, user.id);
        db.prepare('UPDATE profiles SET friends_count = friends_count + 1 WHERE user_id IN (?, ?)').run(user.id, targetId);
        createNotification(user.id, 'friend_accept', targetId, 'user', targetId, {});
        awardXp(user.id, 'FRIEND'); awardXp(targetId, 'FRIEND');
        return json({ ok: true, status: 'accepted' });
      }
      db.prepare('INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, ?)').run(user.id, targetId, 'pending');
      createNotification(targetId, 'friend_request', user.id, 'user', user.id, { username: user.username });
      return json({ ok: true, status: 'pending' }, 201);
    }

    if (action === 'accept') {
      const incoming = db.prepare("SELECT status FROM friends WHERE user_id = ? AND friend_id = ?").get(targetId, user.id);
      if (!incoming) throw new ApiError(404, 'NOT_FOUND', 'No request');
      db.prepare("UPDATE friends SET status = 'accepted' WHERE user_id = ? AND friend_id = ?").run(targetId, user.id);
      db.prepare('UPDATE profiles SET friends_count = friends_count + 1 WHERE user_id IN (?, ?)').run(user.id, targetId);
      createNotification(targetId, 'friend_accept', user.id, 'user', user.id, { username: user.username });
      awardXp(user.id, 'FRIEND'); awardXp(targetId, 'FRIEND');
      evaluateAchievements(user.id); evaluateAchievements(targetId);
      return json({ ok: true, status: 'accepted' });
    }

    if (action === 'decline' || action === 'remove') {
      db.prepare('DELETE FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)').run(user.id, targetId, targetId, user.id);
      const wasAccepted = action === 'remove';
      if (wasAccepted) {
        db.prepare('UPDATE profiles SET friends_count = MAX(0, friends_count - 1) WHERE user_id IN (?, ?)').run(user.id, targetId);
      }
      return json({ ok: true, status: 'none' });
    }
    throw new ApiError(400, 'VALIDATION', 'Bad action');
  } catch (e) {
    return handleError(e);
  }
}

/** GET friend list + incoming requests */
export async function GET() {
  try {
    const user = await requireUser();
    const db = getDb();
    const friends = db
      .prepare(
        `SELECT CASE WHEN f.user_id = ? THEN f.friend_id ELSE f.user_id END AS id,
                u.username, p.display_name, p.avatar_path, p.level
         FROM friends f
         JOIN users u ON u.id = CASE WHEN f.user_id = ? THEN f.friend_id ELSE f.user_id END
         JOIN profiles p ON p.user_id = u.id
         WHERE f.status = 'accepted' AND (f.user_id = ? OR f.friend_id = ?)
         ORDER BY u.username LIMIT 200`
      )
      .all(user.id, user.id, user.id, user.id);
    const incoming = db
      .prepare(
        `SELECT u.id, u.username, p.display_name, p.avatar_path, p.level FROM friends f
         JOIN users u ON u.id = f.user_id JOIN profiles p ON p.user_id = u.id
         WHERE f.friend_id = ? AND f.status = 'pending' ORDER BY f.created_at DESC LIMIT 50`
      )
      .all(user.id);
    const outgoing = db
      .prepare(
        `SELECT u.id, u.username, p.display_name, p.avatar_path, p.level FROM friends f
         JOIN users u ON u.id = f.friend_id JOIN profiles p ON p.user_id = u.id
         WHERE f.user_id = ? AND f.status = 'pending' ORDER BY f.created_at DESC LIMIT 50`
      )
      .all(user.id);
    return json({ friends, incoming, outgoing });
  } catch (e) {
    return handleError(e);
  }
}
