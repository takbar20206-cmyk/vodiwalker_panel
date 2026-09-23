import { NextRequest } from 'next/server';
import { getDb, type SqlParam } from '@/lib/db';
import { getCurrentUser, requireUser, ApiError, str, int } from '@/lib/auth';
import { json, handleError } from '@/lib/api';
import { awardXp, evaluateAchievements, createPost } from '@/lib/xp';

/** GET challenges with viewer progress */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const kind = str(searchParams.get('kind') ?? '', 20);
    const db = getDb();
    const viewer = await getCurrentUser();

    let sql = 'SELECT * FROM challenges WHERE active = 1';
    const args: SqlParam[] = [];
    if (kind && ['daily', 'weekly', 'special'].includes(kind)) {
      sql += ' AND kind = ?';
      args.push(kind);
    }
    sql += " ORDER BY CASE kind WHEN 'daily' THEN 0 WHEN 'weekly' THEN 1 ELSE 2 END, id";
    const challenges = db.prepare(sql).all(...args) as Record<string, unknown>[];

    const progress = viewer
      ? (db
          .prepare(
            `SELECT uc.challenge_id, uc.status, uc.proof_note, uc.started_at, uc.completed_at
             FROM user_challenges uc WHERE uc.user_id = ?`
          )
          .all(viewer.id) as Record<string, unknown>[])
      : [];
    const map = new Map(progress.map((p) => [p.challenge_id, p]));
    return json({
      challenges: challenges.map((c) => ({ ...c, viewer: map.get(c.id as number) ?? null })),
    });
  } catch (e) {
    return handleError(e);
  }
}

/** POST actions: start | submit */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const challengeId = int(body.challenge_id, 1);
    const action = str(body.action, 20);
    const db = getDb();
    const challenge = db.prepare('SELECT * FROM challenges WHERE id = ? AND active = 1').get(challengeId) as Record<string, unknown> | undefined;
    if (!challenge) throw new ApiError(404, 'NOT_FOUND', 'Challenge not found');

    const existing = db
      .prepare('SELECT * FROM user_challenges WHERE user_id = ? AND challenge_id = ?')
      .get(user.id, challengeId) as Record<string, unknown> | undefined;

    if (action === 'start') {
      if (existing) return json({ ok: true, status: existing.status });
      db.prepare('INSERT INTO user_challenges (user_id, challenge_id, status) VALUES (?, ?, ?)').run(user.id, challengeId, 'active');
      return json({ ok: true, status: 'active' }, 201);
    }

    if (action === 'submit') {
      if (!existing) throw new ApiError(400, 'NOT_STARTED', 'Activate the challenge first');
      if (existing.status === 'completed') return json({ ok: true, status: 'completed' });
      const proof = str(body.proof_note ?? '', 500);
      if (challenge.proof_required && !proof) throw new ApiError(400, 'VALIDATION', 'Proof note required');
      db.prepare("UPDATE user_challenges SET status = 'completed', proof_note = ?, completed_at = datetime('now') WHERE id = ?").run(
        proof,
        existing.id as number
      );
      awardXp(user.id, 'WIN_CHALLENGE', challenge.xp_reward as number);
      createPost(user.id, 'challenge_completed', '', {
        challengeId,
        title: challenge.title,
        title_fa: challenge.title_fa,
      });
      evaluateAchievements(user.id);
      return json({ ok: true, status: 'completed', xp: challenge.xp_reward });
    }

    throw new ApiError(400, 'VALIDATION', 'Unknown action');
  } catch (e) {
    return handleError(e);
  }
}
