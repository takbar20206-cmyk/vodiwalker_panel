import { NextRequest } from 'next/server';
import { getDb, type SqlParam } from '@/lib/db';
import { requireUser, ApiError, rateLimit, str, getCurrentUser } from '@/lib/auth';
import { json, handleError } from '@/lib/api';
import { awardXp, evaluateAchievements } from '@/lib/xp';

function safeJson(s: unknown): Record<string, unknown> {
  try { return JSON.parse(String(s || '{}')); } catch { return {}; }
}

/** GET feed posts (public + people you follow), paginated */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const scope = searchParams.get('scope') || 'all'; // all | mine | user | following
    const userIdParam = Number(searchParams.get('userId') || 0);
    const limit = 15;
    const db = getDb();
    const viewer = await getCurrentUser();

    let where = '1=1';
    const args: SqlParam[] = [];
    if (scope === 'mine') {
      where = 'p.user_id = ?';
      args.push(viewer?.id ?? (userIdParam || -1));
      if (!viewer && !userIdParam) throw new ApiError(401, 'UNAUTHORIZED', 'Login required');
      if (!viewer && userIdParam) args[args.length - 1] = userIdParam;
    } else if (scope === 'user' && userIdParam) {
      where = 'p.user_id = ?';
      args.push(userIdParam);
    } else if (scope === 'following') {
      if (!viewer) throw new ApiError(401, 'UNAUTHORIZED', 'Login required');
      where = '(p.user_id IN (SELECT followee_id FROM followers WHERE follower_id = ?) OR p.user_id = ?)';
      args.push(viewer.id, viewer.id);
    }

    const total = (db.prepare(`SELECT COUNT(*) AS c FROM posts p WHERE ${where}`).get(...args) as { c: number }).c;
    const posts = db
      .prepare(
        `SELECT p.*, u.username, pr.display_name, pr.avatar_path, pr.level
         FROM posts p JOIN users u ON u.id = p.user_id JOIN profiles pr ON pr.user_id = p.user_id
         WHERE ${where} ORDER BY p.id DESC LIMIT ? OFFSET ?`
      )
      .all(...args, limit, (page - 1) * limit) as Record<string, unknown>[];

    // liked flags for viewer
    const likedSet = new Set<number>();
    if (viewer && posts.length) {
      const ids = posts.map((p) => p.id as number);
      const rows = db
        .prepare(`SELECT target_id FROM likes WHERE user_id = ? AND target_type = 'post' AND target_id IN (${ids.map(() => '?').join(',')})`)
        .all(viewer.id, ...ids) as { target_id: number }[];
      rows.forEach((r) => likedSet.add(r.target_id));
    }

    const enriched = posts.map((p) => ({ ...p, meta: safeJson(p.meta), liked: likedSet.has(p.id as number) }));
    return json({ posts: enriched, total, page, pages: Math.ceil(total / limit) });
  } catch (e) {
    return handleError(e);
  }
}

/** POST create a post */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    rateLimit(`post:${user.id}`, 10, 60_000);
    const body = await req.json().catch(() => ({}));
    const content = str(body.content ?? '', 1000);
    const type = ['text', 'achievement_unlocked', 'game_added', 'clip', 'clan_joined', 'challenge_completed'].includes(String(body.type))
      ? String(body.type)
      : 'text';
    if (type === 'text' && !content) throw new ApiError(400, 'VALIDATION', 'Content required');

    const db = getDb();
    const res = db
      .prepare('INSERT INTO posts (user_id, type, content, meta) VALUES (?, ?, ?, ?)')
      .run(user.id, type, content, JSON.stringify(body.meta ?? {}));
    db.prepare('UPDATE profiles SET posts_count = posts_count + 1 WHERE user_id = ?').run(user.id);
    awardXp(user.id, 'CREATE_POST');
    evaluateAchievements(user.id);
    const post = db
      .prepare(
        `SELECT p.*, u.username, pr.display_name, pr.avatar_path, pr.level
         FROM posts p JOIN users u ON u.id = p.user_id JOIN profiles pr ON pr.user_id = p.user_id WHERE p.id = ?`
      )
      .get(Number(res.lastInsertRowid)) as Record<string, unknown>;
    return json({ ok: true, post: { ...post, meta: safeJson(post.meta), liked: false } }, 201);
  } catch (e) {
    return handleError(e);
  }
}

/** DELETE own post (or any if admin) */
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get('id'));
    const db = getDb();
    const post = db.prepare('SELECT user_id FROM posts WHERE id = ?').get(id) as { user_id: number } | undefined;
    if (!post) throw new ApiError(404, 'NOT_FOUND', 'Post not found');
    if (post.user_id !== user.id && user.role !== 'admin') throw new ApiError(403, 'FORBIDDEN', 'Not yours');
    db.prepare('DELETE FROM posts WHERE id = ?').run(id);
    db.prepare('UPDATE profiles SET posts_count = MAX(0, posts_count - 1) WHERE user_id = ?').run(post.user_id);
    db.prepare("DELETE FROM comments WHERE target_type = 'post' AND target_id = ?").run(id);
    db.prepare("DELETE FROM likes WHERE target_type = 'post' AND target_id = ?").run(id);
    return json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
