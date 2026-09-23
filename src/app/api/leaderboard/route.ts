import { NextRequest } from 'next/server';
import { getDb, type SqlParam } from '@/lib/db';
import { str, getCurrentUser } from '@/lib/auth';
import { json, handleError } from '@/lib/api';

/** GET leaderboard
 * scope: global | country
 * period: all | weekly | monthly
 * game: game id (filters users who play that game)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get('scope') || 'global';
    const period = searchParams.get('period') || 'all';
    const game = Number(searchParams.get('game') || 0);
    const country = str(searchParams.get('country') ?? '', 60);
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = 25;
    const db = getDb();
    const viewer = await getCurrentUser();

    // period -> xp gained in window
    let periodCond = '';
    const periodArgs: string[] = [];
    if (period === 'weekly') { periodCond = "AND xe.created_at >= datetime('now', '-7 days')"; }
    else if (period === 'monthly') { periodCond = "AND xe.created_at >= datetime('now', '-30 days')"; }

    let where = 'u.is_active = 1';
    const args: SqlParam[] = [];
    if (scope === 'country' && country) { where += ' AND pr.country = ?'; args.push(country); }
    if (game) { where += ' AND EXISTS (SELECT 1 FROM user_games ug WHERE ug.user_id = u.id AND ug.game_id = ?)'; args.push(game); }

    const rows = db
      .prepare(
        `SELECT u.id, u.username, pr.display_name, pr.avatar_path, pr.level, pr.xp, pr.country,
                (SELECT COUNT(*) FROM user_achievements ua WHERE ua.user_id = u.id) AS achievements_count,
                (SELECT COALESCE(SUM(xe.amount),0) FROM xp_events xe WHERE xe.user_id = u.id ${periodCond}) AS period_xp
         FROM users u JOIN profiles pr ON pr.user_id = u.id
         WHERE ${where}
         ORDER BY ${period === 'all' ? 'pr.xp DESC' : 'period_xp DESC, pr.xp DESC'}
         LIMIT ? OFFSET ?`
      )
      .all(...args, limit, (page - 1) * limit) as Record<string, unknown>[];

    const total = (db.prepare(`SELECT COUNT(*) AS c FROM users u JOIN profiles pr ON pr.user_id = u.id WHERE ${where}`).get(...args) as { c: number }).c;

    const viewerRank = viewer
      ? (
          db
            .prepare(
              `SELECT COUNT(*) + 1 AS rank FROM users u JOIN profiles pr ON pr.user_id = u.id
               WHERE u.is_active = 1 AND pr.xp > (SELECT xp FROM profiles WHERE user_id = ?)`
            )
            .get(viewer.id) as { rank: number }
        ).rank
      : null;

    return json({ rows, total, page, pages: Math.ceil(total / limit), viewerRank });
  } catch (e) {
    return handleError(e);
  }
}
