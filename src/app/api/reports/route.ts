import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireUser, ApiError, str, rateLimit } from '@/lib/auth';
import { json, handleError, clientIp } from '@/lib/api';
import { createNotification } from '@/lib/xp';

const REASONS = ['spam', 'harassment', 'inappropriate', 'cheating', 'other'];
const TARGETS = ['user', 'post', 'clip', 'comment'];

/** POST create report */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    rateLimit(`report:${user.id}`, 5, 600_000);
    const body = await req.json().catch(() => ({}));
    const targetType = str(body.target_type, 20);
    const targetId = Number(body.target_id);
    const reason = str(body.reason, 40);
    const details = str(body.details ?? '', 500);
    if (!TARGETS.includes(targetType)) throw new ApiError(400, 'VALIDATION', 'Bad target');
    if (!REASONS.includes(reason)) throw new ApiError(400, 'VALIDATION', 'Bad reason');
    if (!targetId) throw new ApiError(400, 'VALIDATION', 'target_id required');

    const db = getDb();
    const dup = db
      .prepare("SELECT 1 FROM reports WHERE reporter_id = ? AND target_type = ? AND target_id = ? AND status = 'open'")
      .get(user.id, targetType, targetId);
    if (dup) throw new ApiError(409, 'DUPLICATE', 'You already reported this');

    db.prepare('INSERT INTO reports (reporter_id, target_type, target_id, reason, details) VALUES (?, ?, ?, ?, ?)').run(
      user.id,
      targetType,
      targetId,
      reason,
      details
    );
    return json({ ok: true }, 201);
  } catch (e) {
    return handleError(e);
  }
}

/** GET my reports */
export async function GET() {
  try {
    const user = await requireUser();
    const db = getDb();
    const reports = db
      .prepare('SELECT * FROM reports WHERE reporter_id = ? ORDER BY id DESC LIMIT 50')
      .all(user.id);
    return json({ reports });
  } catch (e) {
    return handleError(e);
  }
}
