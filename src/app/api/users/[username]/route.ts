import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser, ApiError, str } from '@/lib/auth';
import { json, handleError } from '@/lib/api';
import { relationsWith } from '@/lib/users';

/** GET /api/users/[username] — full public profile */
export async function GET(req: NextRequest, ctx: { params: Promise<{ username: string }> }) {
  try {
    const { username } = await ctx.params;
    const db = getDb();
    const row = db
      .prepare(
        `SELECT u.id, u.username, u.email, u.role, u.is_active, u.created_at,
                p.display_name, p.bio, p.country, p.avatar_path, p.cover_path, p.xp, p.level,
                p.followers_count, p.following_count, p.friends_count, p.posts_count,
                p.profile_views, p.is_public, p.show_email, p.show_country, p.show_activity
         FROM users u JOIN profiles p ON p.user_id = u.id
         WHERE u.username = ? COLLATE NOCASE`
      )
      .get(username) as Record<string, unknown> | undefined;
    if (!row) throw new ApiError(404, 'NOT_FOUND', 'User not found');
    if (!row.is_active && row.role !== 'admin') throw new ApiError(403, 'BANNED', 'Account banned');

    const viewer = await getCurrentUser();
    const uid = row.id as number;

    const games = db
      .prepare(
        `SELECT ug.*, g.name, g.name_fa, g.slug, g.cover_path, g.accent, g.genre
         FROM user_games ug JOIN games g ON g.id = ug.game_id WHERE ug.user_id = ? ORDER BY ug.created_at DESC`
      )
      .all(uid);
    const achievements = db
      .prepare(
        `SELECT a.*, ua.unlocked_at FROM user_achievements ua JOIN achievements a ON a.id = ua.achievement_id
         WHERE ua.user_id = ? ORDER BY ua.unlocked_at DESC`
      )
      .all(uid);
    const allAchievements = db.prepare('SELECT * FROM achievements ORDER BY id').all() as Record<string, unknown>[];
    const unlockedIds = new Set(achievements.map((a) => (a as { id: number }).id));
    const achievementsFull = allAchievements.map((a) => ({
      ...a,
      unlocked: unlockedIds.has(a.id as number),
      unlocked_at: achievements.find((u) => (u as { id: number }).id === a.id)?.['unlocked_at'] ?? null,
    }));

    const clan = db
      .prepare(
        `SELECT c.id, c.name, c.slug, c.logo_path, c.level, c.xp, cm.role
         FROM clan_members cm JOIN clans c ON c.id = cm.clan_id WHERE cm.user_id = ?`
      )
      .get(uid);

    const postsCount = (db.prepare('SELECT COUNT(*) AS c FROM posts WHERE user_id = ?').get(uid) as { c: number }).c;
    const clipsCount = (db.prepare('SELECT COUNT(*) AS c FROM clips WHERE user_id = ?').get(uid) as { c: number }).c;

    // global rank by xp
    const rank = (db
      .prepare('SELECT COUNT(*) + 1 AS r FROM profiles WHERE xp > (SELECT xp FROM profiles WHERE user_id = ?)')
      .get(uid) as { r: number }).r;

    const isSelf = viewer?.id === uid;
    const rel = relationsWith(viewer?.id ?? null, uid);
    const { email, show_email, is_public, ...safe } = row as Record<string, unknown> & { email: string; show_email: number; is_public: number };

    return json({
      profile: {
        ...safe,
        email: isSelf || show_email ? email : null,
        country: row.show_country ? row.country : '',
        rank,
        postsCount,
        clipsCount,
      },
      games,
      achievements: achievementsFull,
      clan,
      relations: rel,
      isSelf,
    });
  } catch (e) {
    return handleError(e);
  }
}
