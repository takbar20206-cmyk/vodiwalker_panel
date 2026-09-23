import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { ApiError, rateLimit, str, int, requireUser } from '@/lib/auth';
import { json, handleError, clientIp } from '@/lib/api';
import { awardXp, evaluateAchievements } from '@/lib/xp';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = Number(searchParams.get('userId'));
    const db = getDb();
    if (userId) {
      const games = db
        .prepare(
          `SELECT ug.*, g.name, g.name_fa, g.slug, g.cover_path, g.accent, g.genre
           FROM user_games ug JOIN games g ON g.id = ug.game_id
           WHERE ug.user_id = ? ORDER BY ug.created_at DESC`
        )
        .all(userId);
      return json({ games });
    }
    const all = db.prepare('SELECT * FROM games ORDER BY name').all();
    return json({ games: all });
  } catch (e) {
    return handleError(e);
  }
}

/** POST add a game to own profile */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    rateLimit(`addgame:${user.id}`, 30, 60_000);
    const body = await req.json().catch(() => ({}));
    requireFieldsLocal(body);
    const db = getDb();
    const gameId = int(body.game_id, 1);
    const game = db.prepare('SELECT id FROM games WHERE id = ?').get(gameId);
    if (!game) throw new ApiError(404, 'NOT_FOUND', 'Game not found');
    const exists = db.prepare('SELECT 1 FROM user_games WHERE user_id = ? AND game_id = ?').get(user.id, gameId);
    if (exists) throw new ApiError(409, 'ALREADY', 'Game already added');

    db.prepare(
      `INSERT INTO user_games (user_id, game_id, hours, rank, level, main_character, main_weapon, platform)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      user.id,
      gameId,
      int(body.hours, 0, 1000000),
      str(body.rank ?? '', 60),
      int(body.level ?? 1, 1, 9999),
      str(body.main_character ?? '', 60),
      str(body.main_weapon ?? '', 60),
      str(body.platform ?? 'PC', 30)
    );
    awardXp(user.id, 'ADD_GAME');
    evaluateAchievements(user.id);
    const created = db
      .prepare(
        `SELECT ug.*, g.name, g.name_fa, g.slug, g.cover_path, g.accent FROM user_games ug
         JOIN games g ON g.id = ug.game_id WHERE ug.user_id = ? AND ug.game_id = ?`
      )
      .get(user.id, gameId);
    return json({ ok: true, game: created }, 201);
  } catch (e) {
    return handleError(e);
  }
}

/** PUT = update own game entry */
export async function PUT(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const id = int(body.id, 1);
    const db = getDb();
    const row = db.prepare('SELECT * FROM user_games WHERE id = ? AND user_id = ?').get(id, user.id);
    if (!row) throw new ApiError(404, 'NOT_FOUND', 'Not found or not yours');
    db.prepare(
      `UPDATE user_games SET hours = ?, rank = ?, level = ?, main_character = ?, main_weapon = ?, platform = ? WHERE id = ?`
    ).run(
      int(body.hours ?? row.hours, 0, 1000000),
      str(body.rank ?? row.rank, 60),
      int(body.level ?? row.level, 1, 9999),
      str(body.main_character ?? row.main_character, 60),
      str(body.main_weapon ?? row.main_weapon, 60),
      str(body.platform ?? row.platform, 30),
      id
    );
    evaluateAchievements(user.id);
    return json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}

/** DELETE remove own game */
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const id = int(searchParams.get('id'), 1);
    const db = getDb();
    const row = db.prepare('SELECT id FROM user_games WHERE id = ? AND user_id = ?').get(id, user.id);
    if (!row) throw new ApiError(404, 'NOT_FOUND', 'Not found or not yours');
    db.prepare('DELETE FROM user_games WHERE id = ?').run(id);
    return json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}

function requireFieldsLocal(body: Record<string, unknown>) {
  if (!body.game_id) throw new ApiError(400, 'VALIDATION', 'game_id required');
}
