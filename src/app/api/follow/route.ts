import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireUser, ApiError, int, rateLimit } from '@/lib/auth';
import { json, handleError } from '@/lib/api';
import { awardXp, createNotification, evaluateAchievements } from '@/lib/xp';

/** POST toggle follow */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    rateLimit(`follow:${user.id}`, 60, 60_000);
    const body = await req.json().catch(() => ({}));
    const targetId = int(body.user_id, 1);
    if (targetId === user.id) throw new ApiError(400, 'VALIDATION', 'Cannot follow yourself');
    const db = getDb();
    const target = db.prepare('SELECT id FROM users WHERE id = ? AND is_active = 1').get(targetId);
    if (!target) throw new ApiError(404, 'NOT_FOUND', 'User not found');

    const existing = db.prepare('SELECT 1 FROM followers WHERE follower_id = ? AND followee_id = ?').get(user.id, targetId);
    if (existing) {
      db.prepare('DELETE FROM followers WHERE follower_id = ? AND followee_id = ?').run(user.id, targetId);
      db.prepare('UPDATE profiles SET following_count = MAX(0, following_count - 1) WHERE user_id = ?').run(user.id);
      db.prepare('UPDATE profiles SET followers_count = MAX(0, followers_count - 1) WHERE user_id = ?').run(targetId);
      return json({ ok: true, following: false });
    }
    db.prepare('INSERT INTO followers (follower_id, followee_id) VALUES (?, ?)').run(user.id, targetId);
    db.prepare('UPDATE profiles SET following_count = following_count + 1 WHERE user_id = ?').run(user.id);
    db.prepare('UPDATE profiles SET followers_count = followers_count + 1 WHERE user_id = ?').run(targetId);
    createNotification(targetId, 'follow', user.id, 'user', user.id, { username: user.username });
    awardXp(user.id, 'FOLLOW');
    evaluateAchievements(user.id);
    return json({ ok: true, following: true });
  } catch (e) {
    return handleError(e);
  }
}

/** GET followers/following list */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = int(searchParams.get('userId') ?? 0, 1);
    const kind = searchParams.get('kind') === 'following' ? 'following' : 'followers';
    const db = getDb();
    const rows =
      kind === 'followers'
        ? db
            .prepare(
              `SELECT u.id, u.username, p.display_name, p.avatar_path, p.level FROM followers f
               JOIN users u ON u.id = f.follower_id JOIN profiles p ON p.user_id = u.id
               WHERE f.followee_id = ? ORDER BY f.created_at DESC LIMIT 100`
            )
            .all(userId)
        : db
            .prepare(
              `SELECT u.id, u.username, p.display_name, p.avatar_path, p.level FROM followers f
               JOIN users u ON u.id = f.followee_id JOIN profiles p ON p.user_id = u.id
               WHERE f.follower_id = ? ORDER BY f.created_at DESC LIMIT 100`
            )
            .all(userId);
    return json({ users: rows });
  } catch (e) {
    return handleError(e);
  }
}
