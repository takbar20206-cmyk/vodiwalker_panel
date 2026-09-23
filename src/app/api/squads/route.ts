import { NextRequest } from 'next/server';
import { getDb, type SqlParam } from '@/lib/db';
import { requireUser, ApiError, rateLimit, str, int, getCurrentUser } from '@/lib/auth';
import { json, handleError } from '@/lib/api';
import { createNotification } from '@/lib/xp';

/** GET squad posts */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const gameId = Number(searchParams.get('game_id') || 0);
    const mine = searchParams.get('mine') === '1';
    const db = getDb();
    const viewer = await getCurrentUser();
    let where = "s.status = 'looking'";
    const args: SqlParam[] = [];
    if (mine) {
      if (!viewer) throw new ApiError(401, 'UNAUTHORIZED', 'Login required');
      where = 's.user_id = ?';
      args.push(viewer.id);
    } else if (gameId) {
      where = "s.status = 'looking' AND s.game_id = ?";
      args.push(gameId);
    }
    const rows = db
      .prepare(
        `SELECT s.*, g.name AS game_name, g.accent AS game_accent, g.cover_path AS game_cover,
                u.username, p.display_name, p.avatar_path, p.level
         FROM squads s JOIN games g ON g.id = s.game_id
         JOIN users u ON u.id = s.user_id JOIN profiles p ON p.user_id = s.user_id
         WHERE ${where} ORDER BY s.id DESC LIMIT 100`
      )
      .all(...args) as Record<string, unknown>[];
    // join states
    const withState = rows.map((s) => ({
      ...s,
      joined: viewer
        ? !!(db.prepare('SELECT 1 FROM squad_joins WHERE squad_id = ? AND user_id = ?').get(s.id as number, viewer.id))
        : false,
      isMine: viewer ? s.user_id === viewer.id : false,
    }));
    return json({ squads: withState });
  } catch (e) {
    return handleError(e);
  }
}

/** POST create squad post */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    rateLimit(`squad:${user.id}`, 15, 600_000);
    const body = await req.json().catch(() => ({}));
    const db = getDb();
    // one open squad at a time
    const open = db.prepare("SELECT 1 FROM squads WHERE user_id = ? AND status = 'looking'").get(user.id);
    if (open) throw new ApiError(409, 'ONE_AT_ATIME', 'Close your current squad post first');

    const res = db
      .prepare(
        `INSERT INTO squads (user_id, game_id, mode, rank_needed, players_needed, mic, language, status, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        user.id,
        int(body.game_id, 1),
        str(body.mode ?? '', 60),
        str(body.rank_needed ?? '', 60),
        int(body.players_needed ?? 1, 1, 10),
        str(body.mic ?? 'required', 20),
        str(body.language ?? 'persian', 30),
        'looking',
        str(body.note ?? '', 300)
      );
    const squad = db.prepare('SELECT * FROM squads WHERE id = ?').get(Number(res.lastInsertRowid));
    return json({ ok: true, squad }, 201);
  } catch (e) {
    return handleError(e);
  }
}

/** PATCH close squad / DELETE remove */
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const id = int(body.id, 1);
    const db = getDb();
    const squad = db.prepare('SELECT * FROM squads WHERE id = ? AND user_id = ?').get(id, user.id) as Record<string, unknown> | undefined;
    if (!squad) throw new ApiError(404, 'NOT_FOUND', 'Not yours');
    const status = ['looking', 'full', 'closed'].includes(String(body.status)) ? String(body.status) : 'closed';
    db.prepare('UPDATE squads SET status = ? WHERE id = ?').run(status, id);
    if (status !== 'looking') {
      const joins = db.prepare('SELECT user_id FROM squad_joins WHERE squad_id = ?').all(id) as { user_id: number }[];
      joins.forEach((j) => createNotification(j.user_id, 'squad_closed', user.id, 'squad', id, {}));
    }
    return json({ ok: true, status });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const id = int(searchParams.get('id'), 1);
    const db = getDb();
    const squad = db.prepare('SELECT user_id FROM squads WHERE id = ?').get(id) as { user_id: number } | undefined;
    if (!squad) throw new ApiError(404, 'NOT_FOUND', 'Not found');
    if (squad.user_id !== user.id && user.role !== 'admin') throw new ApiError(403, 'FORBIDDEN', 'Not yours');
    db.prepare('DELETE FROM squads WHERE id = ?').run(id);
    return json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
