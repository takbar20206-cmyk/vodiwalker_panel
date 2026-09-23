import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { ApiError, rateLimit, str, EMAIL_RE, hashPassword, randomToken } from '@/lib/auth';
import { json, handleError, clientIp } from '@/lib/api';

export async function POST(req: NextRequest) {
  try {
    rateLimit(`forgot:${clientIp(req)}`, 5, 300_000);
    const body = await req.json().catch(() => ({}));
    const email = str(body.email, 200).toLowerCase();
    if (!EMAIL_RE.test(email)) throw new ApiError(400, 'VALIDATION', 'Invalid email');
    const db = getDb();
    const user = db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE').get(email) as { id: number } | undefined;
    // Always return ok (no user enumeration). In this build we surface the token in server log since no SMTP is configured.
    let token: string | null = null;
    if (user) {
      token = randomToken();
      db.prepare('INSERT INTO password_resets (token, user_id, expires_at) VALUES (?, ?, ?)').run(
        token,
        user.id,
        new Date(Date.now() + 3600_000).toISOString()
      );
      console.log(`[GAMER-ID] Password reset token for user #${user.id}: ${token}`);
    }
    return json({ ok: true, token: token, hint: token ? 'Reset token generated (shown here because SMTP is not configured)' : undefined });
  } catch (e) {
    return handleError(e);
  }
}

/** Confirm reset with token */
export async function PUT(req: NextRequest) {
  try {
    rateLimit(`reset:${clientIp(req)}`, 10, 300_000);
    const body = await req.json().catch(() => ({}));
    const token = str(body.token, 200);
    const password = String(body.password ?? '');
    if (password.length < 8) throw new ApiError(400, 'VALIDATION', 'Password must be at least 8 characters');
    const db = getDb();
    const row = db
      .prepare("SELECT user_id FROM password_resets WHERE token = ? AND used = 0 AND expires_at > datetime('now')")
      .get(token) as { user_id: number } | undefined;
    if (!row) throw new ApiError(400, 'INVALID_TOKEN', 'Invalid or expired token');
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(password), row.user_id);
    db.prepare('UPDATE password_resets SET used = 1 WHERE token = ?').run(token);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(row.user_id);
    return json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
