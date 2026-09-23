import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireUser, ApiError, int, getCurrentUser } from '@/lib/auth';
import { json, handleError } from '@/lib/api';
import { createNotification } from '@/lib/xp';

/** POST join/leave squad: /api/squads/[id]/join */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const squadId = Number(id);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || 'join');
    const db = getDb();
    const squad = db.prepare("SELECT * FROM squads WHERE id = ? AND status = 'looking'").get(squadId) as Record<string, unknown> | undefined;
    if (!squad) throw new ApiError(404, 'NOT_FOUND', 'Squad not available');
    if (squad.user_id === user.id) throw new ApiError(400, 'VALIDATION', 'This is your own post');

    if (action === 'leave') {
      db.prepare('DELETE FROM squad_joins WHERE squad_id = ? AND user_id = ?').run(squadId, user.id);
      db.prepare('UPDATE squads SET seats_filled = MAX(0, seats_filled - 1) WHERE id = ?').run(squadId);
      return json({ ok: true, joined: false });
    }

    const existing = db.prepare('SELECT 1 FROM squad_joins WHERE squad_id = ? AND user_id = ?').get(squadId, user.id);
    if (existing) return json({ ok: true, joined: true });
    db.prepare('INSERT INTO squad_joins (squad_id, user_id) VALUES (?, ?)').run(squadId, user.id);
    db.prepare('UPDATE squads SET seats_filled = seats_filled + 1 WHERE id = ?').run(squadId);
    createNotification(squad.user_id as number, 'squad_join', user.id, 'squad', squadId, { username: user.username });
    const seats = db.prepare('SELECT seats_filled, players_needed FROM squads WHERE id = ?').get(squadId) as { seats_filled: number; players_needed: number };
    if (seats.seats_filled >= seats.players_needed) {
      db.prepare("UPDATE squads SET status = 'full' WHERE id = ?").run(squadId);
      db.prepare('SELECT user_id FROM squad_joins WHERE squad_id = ?').all(squadId);
      const joins = db.prepare('SELECT user_id FROM squad_joins WHERE squad_id = ?').all(squadId) as { user_id: number }[];
      joins.forEach((j) => createNotification(j.user_id, 'squad_full', squad.user_id as number, 'squad', squadId, {}));
    }
    return json({ ok: true, joined: true }, 201);
  } catch (e) {
    return handleError(e);
  }
}
