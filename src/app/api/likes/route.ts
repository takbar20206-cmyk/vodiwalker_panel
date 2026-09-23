import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireUser, ApiError, int, str, rateLimit } from '@/lib/auth';
import { json, handleError } from '@/lib/api';
import { awardXp, createNotification, evaluateAchievements } from '@/lib/xp';

const TARGETS = ['post', 'clip', 'comment', 'challenge'] as const;

/** POST toggle like */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    rateLimit(`like:${user.id}`, 60, 60_000);
    const body = await req.json().catch(() => ({}));
    const targetType = str(body.target_type, 20);
    const targetId = int(body.target_id, 1);
    if (!TARGETS.includes(targetType as (typeof TARGETS)[number])) throw new ApiError(400, 'VALIDATION', 'Bad target');

    const db = getDb();
    const table = targetType === 'post' ? 'posts' : targetType === 'clip' ? 'clips' : targetType === 'comment' ? 'comments' : null;
    if (!table) throw new ApiError(400, 'VALIDATION', 'Cannot like this target');
    const target = db.prepare(`SELECT user_id FROM ${table} WHERE id = ?`).get(targetId) as { user_id: number } | undefined;
    if (!target) throw new ApiError(404, 'NOT_FOUND', 'Target not found');

    const existing = db
      .prepare('SELECT 1 FROM likes WHERE user_id = ? AND target_type = ? AND target_id = ?')
      .get(user.id, targetType, targetId);

    if (existing) {
      db.prepare('DELETE FROM likes WHERE user_id = ? AND target_type = ? AND target_id = ?').run(user.id, targetType, targetId);
      db.prepare(`UPDATE ${table} SET likes_count = MAX(0, likes_count - 1) WHERE id = ?`).run(targetId);
      const row = db.prepare(`SELECT likes_count FROM ${table} WHERE id = ?`).get(targetId) as { likes_count: number };
      return json({ ok: true, liked: false, likes: row.likes_count });
    }

    db.prepare('INSERT INTO likes (user_id, target_type, target_id) VALUES (?, ?, ?)').run(user.id, targetType, targetId);
    db.prepare(`UPDATE ${table} SET likes_count = likes_count + 1 WHERE id = ?`).run(targetId);
    if (target.user_id !== user.id) {
      awardXp(target.user_id, 'LIKE_RECEIVED');
      createNotification(target.user_id, targetType === 'clip' ? 'clip_like' : 'like', user.id, targetType, targetId, {
        username: user.username,
      });
    }
    awardXp(user.id, 'LIKE_GIVEN');
    evaluateAchievements(user.id);
    const row = db.prepare(`SELECT likes_count FROM ${table} WHERE id = ?`).get(targetId) as { likes_count: number };
    return json({ ok: true, liked: true, likes: row.likes_count });
  } catch (e) {
    return handleError(e);
  }
}

/** GET liked ids for viewer given target type */
export async function GET(req: NextRequest) {
  try {
    const { getCurrentUser } = await import('@/lib/auth');
    const user = await getCurrentUser();
    const { searchParams } = new URL(req.url);
    const targetType = str(searchParams.get('target_type') ?? '', 20);
    const ids = (searchParams.get('ids') ?? '')
      .split(',')
      .map((x) => Number(x))
      .filter((x) => x > 0)
      .slice(0, 100);
    if (!user) return json({ liked: [] });
    const db = getDb();
    const liked = new Set(
      (
        db
          .prepare(
            `SELECT target_id FROM likes WHERE user_id = ? AND target_type = ? AND target_id IN (${ids.map(() => '?').join(',') || '-1'})`
          )
          .all(user.id, targetType, ...ids) as { target_id: number }[]
      ).map((r) => r.target_id)
    );
    return json({ liked: ids.filter((id) => liked.has(id)) });
  } catch (e) {
    return handleError(e);
  }
}
