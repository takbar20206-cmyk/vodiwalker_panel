import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser, str, int } from '@/lib/auth';
import { json, handleError } from '@/lib/api';

/** GET /api/search?q=...&type=all|players|games|clans|clips */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = str(searchParams.get('q') ?? '', 80).trim();
    const type = searchParams.get('type') || 'all';
    const viewer = await getCurrentUser();
    const db = getDb();
    if (q.length < 1) return json({ players: [], games: [], clans: [], clips: [] });

    const like = `%${q}%`;
    const players =
      type === 'all' || type === 'players'
        ? db
            .prepare(
              `SELECT u.id, u.username, p.display_name, p.avatar_path, p.level, p.country, p.bio
               FROM users u JOIN profiles p ON p.user_id = u.id
               WHERE u.is_active = 1 AND (u.username LIKE ? OR p.display_name LIKE ?)
               ORDER BY p.xp DESC LIMIT 20`
            )
            .all(like, like)
        : [];
    const games =
      type === 'all' || type === 'games'
        ? db
            .prepare('SELECT id, name, name_fa, slug, cover_path, accent FROM games WHERE name LIKE ? OR name_fa LIKE ? OR slug LIKE ? ORDER BY name LIMIT 20')
            .all(like, like, like)
        : [];
    const clans =
      type === 'all' || type === 'clans'
        ? db
            .prepare(
              `SELECT c.id, c.name, c.slug, c.logo_path, c.level, c.xp, c.members_count
               FROM clans c WHERE c.name LIKE ? ORDER BY c.xp DESC LIMIT 20`
            )
            .all(like)
        : [];
    const clips =
      type === 'all' || type === 'clips'
        ? db
            .prepare(
              `SELECT c.id, c.title, c.thumb_path, c.views, c.likes_count, u.username
               FROM clips c JOIN users u ON u.id = c.user_id
               WHERE c.title LIKE ? OR c.tags LIKE ? ORDER BY c.views DESC LIMIT 20`
            )
            .all(like, like)
        : [];

    return json({ players, games, clans, clips, q });
  } catch (e) {
    return handleError(e);
  }
}
