import { NextRequest } from 'next/server';
import { getDb, type SqlParam } from '@/lib/db';
import { requireAdmin, str, int, ApiError, getCurrentUser } from '@/lib/auth';
import { json, handleError } from '@/lib/api';
import { awardXp, evaluateAchievements } from '@/lib/xp';

/** GET /api/admin?tab=dashboard|users|posts|clips|comments|games|achievements|clans|reports|challenges */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const tab = searchParams.get('tab') || 'dashboard';
    const db = getDb();

    if (tab === 'dashboard') {
      const stats = {
        total_users: (db.prepare('SELECT COUNT(*) AS c FROM users').get() as { c: number }).c,
        active_users: (db.prepare("SELECT COUNT(*) AS c FROM users WHERE last_login_at >= datetime('now', '-7 days')").get() as { c: number }).c,
        total_clips: (db.prepare('SELECT COUNT(*) AS c FROM clips').get() as { c: number }).c,
        total_posts: (db.prepare('SELECT COUNT(*) AS c FROM posts').get() as { c: number }).c,
        total_clans: (db.prepare('SELECT COUNT(*) AS c FROM clans').get() as { c: number }).c,
        reports_open: (db.prepare("SELECT COUNT(*) AS c FROM reports WHERE status = 'open'").get() as { c: number }).c,
        total_games: (db.prepare('SELECT COUNT(*) AS c FROM games').get() as { c: number }).c,
        total_xp: (db.prepare('SELECT COALESCE(SUM(xp),0) AS c FROM profiles').get() as { c: number }).c,
      };
      const recentUsers = db
        .prepare(
          `SELECT u.id, u.username, u.email, u.role, u.created_at, p.level, p.xp
           FROM users u JOIN profiles p ON p.user_id = u.id ORDER BY u.id DESC LIMIT 8`
        )
        .all();
      const recentReports = db
        .prepare(
          `SELECT r.*, u.username AS reporter FROM reports r JOIN users u ON u.id = r.reporter_id
           ORDER BY r.id DESC LIMIT 8`
        )
        .all();
      return json({ stats, recentUsers, recentReports });
    }

    if (tab === 'users') {
      const rows = db
        .prepare(
          `SELECT u.id, u.username, u.email, u.role, u.is_active, u.created_at, u.last_login_at, p.level, p.xp, p.display_name
           FROM users u JOIN profiles p ON p.user_id = u.id ORDER BY u.id DESC LIMIT 200`
        )
        .all();
      return json({ rows });
    }
    if (tab === 'posts') {
      const rows = db
        .prepare(
          `SELECT p.*, u.username FROM posts p JOIN users u ON u.id = p.user_id ORDER BY p.id DESC LIMIT 200`
        )
        .all();
      return json({ rows });
    }
    if (tab === 'clips') {
      const rows = db
        .prepare(
          `SELECT c.*, u.username FROM clips c JOIN users u ON u.id = c.user_id ORDER BY c.id DESC LIMIT 200`
        )
        .all();
      return json({ rows });
    }
    if (tab === 'comments') {
      const rows = db
        .prepare(
          `SELECT c.*, u.username FROM comments c JOIN users u ON u.id = c.user_id ORDER BY c.id DESC LIMIT 200`
        )
        .all();
      return json({ rows });
    }
    if (tab === 'games') {
      const rows = db.prepare('SELECT * FROM games ORDER BY name').all();
      return json({ rows });
    }
    if (tab === 'achievements') {
      const rows = db
        .prepare(
          `SELECT a.*, (SELECT COUNT(*) FROM user_achievements ua WHERE ua.achievement_id = a.id) AS unlocked_count
           FROM achievements a ORDER BY a.id`
        )
        .all();
      return json({ rows });
    }
    if (tab === 'clans') {
      const rows = db
        .prepare(
          `SELECT c.*, u.username AS leader_username FROM clans c JOIN users u ON u.id = c.leader_id ORDER BY c.id DESC LIMIT 200`
        )
        .all();
      return json({ rows });
    }
    if (tab === 'reports') {
      const status = str(searchParams.get('status') ?? '', 20);
      let sql = `SELECT r.*, u.username AS reporter,
                 (SELECT username FROM users WHERE id = r.target_id) AS target_username
                 FROM reports r JOIN users u ON u.id = r.reporter_id`;
        const args: SqlParam[] = [];
      if (['open', 'resolved', 'dismissed'].includes(status)) { sql += ' WHERE r.status = ?'; args.push(status); }
      sql += ' ORDER BY r.id DESC LIMIT 200';
      const rows = db.prepare(sql).all(...args);
      return json({ rows });
    }
    if (tab === 'challenges') {
      const rows = db
        .prepare(
          `SELECT ch.*, (SELECT COUNT(*) FROM user_challenges uc WHERE uc.challenge_id = ch.id) AS participants,
                  (SELECT COUNT(*) FROM user_challenges uc WHERE uc.challenge_id = ch.id AND uc.status = 'completed') AS completions
           FROM challenges ch ORDER BY ch.id`
        )
        .all();
      return json({ rows });
    }
    throw new ApiError(400, 'VALIDATION', 'Unknown tab');
  } catch (e) {
    return handleError(e);
  }
}

/** POST admin mutations */
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await req.json().catch(() => ({}));
    const action = str(body.action, 40);
    const db = getDb();

    if (action === 'ban_user' || action === 'unban_user') {
      const id = int(body.user_id, 1);
      if (id === admin.id) throw new ApiError(400, 'VALIDATION', 'Cannot ban yourself');
      const isActive = action === 'unban_user' ? 1 : 0;
      db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(isActive, id);
      if (!isActive) db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
      return json({ ok: true, is_active: isActive });
    }

    if (action === 'delete_post') {
      const id = int(body.id, 1);
      const p = db.prepare('SELECT user_id FROM posts WHERE id = ?').get(id) as { user_id: number } | undefined;
      if (p) {
        db.prepare('DELETE FROM posts WHERE id = ?').run(id);
        db.prepare('UPDATE profiles SET posts_count = MAX(0, posts_count - 1) WHERE user_id = ?').run(p.user_id);
        db.prepare("DELETE FROM comments WHERE target_type='post' AND target_id=?").run(id);
        db.prepare("DELETE FROM likes WHERE target_type='post' AND target_id=?").run(id);
      }
      return json({ ok: true });
    }

    if (action === 'delete_clip') {
      db.prepare('DELETE FROM clips WHERE id = ?').run(int(body.id, 1));
      return json({ ok: true });
    }

    if (action === 'delete_comment') {
      db.prepare('DELETE FROM comments WHERE id = ?').run(int(body.id, 1));
      return json({ ok: true });
    }

    if (action === 'delete_clan') {
      const id = int(body.id, 1);
      db.prepare('DELETE FROM clan_members WHERE clan_id = ?').run(id);
      db.prepare('DELETE FROM clans WHERE id = ?').run(id);
      return json({ ok: true });
    }

    if (action === 'resolve_report') {
      const id = int(body.id, 1);
      const status = body.status === 'dismissed' ? 'dismissed' : 'resolved';
      db.prepare('UPDATE reports SET status = ?, resolver_id = ?, resolution_note = ?, resolved_at = datetime(\'now\') WHERE id = ?').run(
        status,
        admin.id,
        str(body.note ?? '', 500),
        id
      );
      const rep = db.prepare('SELECT reporter_id, target_type, target_id FROM reports WHERE id = ?').get(id) as { reporter_id: number } | undefined;
      if (rep) createNotificationSafe(rep.reporter_id, 'report_update', admin.id, 'report', id, { status });
      return json({ ok: true, status });
    }

    if (action === 'add_game') {
      const name = str(body.name, 80);
      if (!name) throw new ApiError(400, 'VALIDATION', 'Name required');
      const slug = str(body.slug ?? '', 80) || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      db.prepare('INSERT INTO games (slug, name, name_fa, genre, accent, platforms) VALUES (?, ?, ?, ?, ?, ?)').run(
        slug,
        name,
        str(body.name_fa ?? name, 80),
        str(body.genre ?? '', 60),
        str(body.accent ?? '#00a8ff', 20),
        str(body.platforms ?? 'PC', 100)
      );
      return json({ ok: true }, 201);
    }

    if (action === 'delete_game') {
      db.prepare('DELETE FROM games WHERE id = ?').run(int(body.id, 1));
      return json({ ok: true });
    }

    if (action === 'add_achievement') {
      const slug = str(body.slug, 60);
      if (!slug) throw new ApiError(400, 'VALIDATION', 'Slug required');
      db.prepare(
        'INSERT INTO achievements (slug, name, name_fa, description, description_fa, icon, xp_reward) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(
        slug,
        str(body.name, 60),
        str(body.name_fa ?? body.name, 60),
        str(body.description ?? '', 300),
        str(body.description_fa ?? body.description ?? '', 300),
        str(body.icon ?? 'trophy', 30),
        int(body.xp_reward ?? 50, 0, 100000)
      );
      return json({ ok: true }, 201);
    }

    if (action === 'delete_achievement') {
      db.prepare('DELETE FROM achievements WHERE id = ?').run(int(body.id, 1));
      return json({ ok: true });
    }

    if (action === 'add_challenge') {
      const slug = str(body.slug, 60);
      if (!slug) throw new ApiError(400, 'VALIDATION', 'Slug required');
      db.prepare(
        `INSERT INTO challenges (slug, title, title_fa, description, description_fa, kind, xp_reward, proof_required, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`
      ).run(
        slug,
        str(body.title, 120),
        str(body.title_fa ?? body.title, 120),
        str(body.description ?? '', 300),
        str(body.description_fa ?? '', 300),
        ['daily', 'weekly', 'special'].includes(String(body.kind)) ? String(body.kind) : 'daily',
        int(body.xp_reward ?? 100, 0, 1000000),
        body.proof_required === false || body.proof_required === '0' ? 0 : 1
      );
      return json({ ok: true }, 201);
    }

    if (action === 'toggle_challenge') {
      db.prepare('UPDATE challenges SET active = CASE active WHEN 1 THEN 0 ELSE 1 END WHERE id = ?').run(int(body.id, 1));
      return json({ ok: true });
    }

    if (action === 'delete_challenge') {
      db.prepare('DELETE FROM challenges WHERE id = ?').run(int(body.id, 1));
      return json({ ok: true });
    }

    if (action === 'grant_xp') {
      const uid = int(body.user_id, 1);
      const amount = int(body.amount, 0, 100000);
      awardXp(uid, 'ADMIN', amount);
      evaluateAchievements(uid);
      return json({ ok: true });
    }

    throw new ApiError(400, 'VALIDATION', 'Unknown action');
  } catch (e) {
    return handleError(e);
  }
}

function createNotificationSafe(...args: Parameters<typeof import('@/lib/xp').createNotification>) {
  // helper to avoid circular import issues at module init
  import('@/lib/xp').then((m) => m.createNotification(...args)).catch(() => {});
}
