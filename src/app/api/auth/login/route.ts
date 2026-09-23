import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyPassword, createSession, ApiError, rateLimit, str, requireFields } from '@/lib/auth';
import { json, handleError, clientIp } from '@/lib/api';
import { awardXp } from '@/lib/xp';

export async function POST(req: NextRequest) {
  try {
    rateLimit(`login:${clientIp(req)}`, 15, 60_000);
    const body = await req.json().catch(() => ({}));
    requireFields(body, ['identifier', 'password']);
    const identifier = str(body.identifier, 200);
    const password = String(body.password ?? '');
    if (!identifier || !password) throw new ApiError(400, 'VALIDATION', 'Fields required');

    const db = getDb();
    const user = db
      .prepare('SELECT id, password_hash, is_active FROM users WHERE email = ? COLLATE NOCASE OR username = ? COLLATE NOCASE')
      .get(identifier, identifier) as { id: number; password_hash: string; is_active: number } | undefined;

    if (!user || !verifyPassword(password, user.password_hash)) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email/username or password');
    }
    if (!user.is_active) throw new ApiError(403, 'BANNED', 'Your account is banned');

    db.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").run(user.id);
    // Daily login XP — once per calendar day
    const today = new Date().toISOString().slice(0, 10);
    const row = db.prepare('SELECT last_daily_claim FROM users WHERE id = ?').get(user.id) as { last_daily_claim: string | null };
    let dailyXp = 0;
    if (row.last_daily_claim !== today) {
      db.prepare('UPDATE users SET last_daily_claim = ? WHERE id = ?').run(today, user.id);
      awardXp(user.id, 'DAILY_LOGIN');
      dailyXp = 20;
    }

    await createSession(user.id, req.headers.get('user-agent') ?? '');
    const profile = db
      .prepare(
        `SELECT u.username, u.email, u.role, p.display_name, p.level, p.xp, p.avatar_path
         FROM users u JOIN profiles p ON p.user_id = u.id WHERE u.id = ?`
      )
      .get(user.id);

    return json({ ok: true, user: profile, dailyXp });
  } catch (e) {
    return handleError(e);
  }
}
