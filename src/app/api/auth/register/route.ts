import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { hashPassword, createSession, ApiError, rateLimit, requireFields, str, USERNAME_RE, EMAIL_RE } from '@/lib/auth';
import { json, handleError, browserKey, isHttps } from '@/lib/api';
import { awardXp } from '@/lib/xp';

export async function POST(req: NextRequest) {
  try {
    rateLimit(`register:${browserKey(req)}`, 15, 60_000);
    const body = await req.json().catch(() => ({}));
    requireFields(body, ['username', 'email', 'password', 'passwordConfirm']);
    const username = str(body.username, 24);
    const email = str(body.email, 200).toLowerCase();
    const password = String(body.password ?? '');
    const passwordConfirm = String(body.passwordConfirm ?? '');

    if (!USERNAME_RE.test(username))
      throw new ApiError(400, 'VALIDATION', 'Username must be 3-24 chars (letters, numbers, underscore)');
    if (!EMAIL_RE.test(email)) throw new ApiError(400, 'VALIDATION', 'Invalid email');
    if (password.length < 8) throw new ApiError(400, 'VALIDATION', 'Password must be at least 8 characters');
    if (password !== passwordConfirm) throw new ApiError(400, 'VALIDATION', 'Passwords do not match');

    const db = getDb();
    if (db.prepare('SELECT 1 FROM users WHERE username = ? COLLATE NOCASE').get(username))
      throw new ApiError(409, 'USERNAME_TAKEN', 'Username already taken');
    if (db.prepare('SELECT 1 FROM users WHERE email = ? COLLATE NOCASE').get(email))
      throw new ApiError(409, 'EMAIL_TAKEN', 'Email already registered');

    const hash = hashPassword(password);
    const isFirstUser = (db.prepare('SELECT COUNT(*) AS c FROM users').get() as { c: number }).c === 0;
    const role = isFirstUser ? 'admin' : 'user';

    const res = db
      .prepare('INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)')
      .run(username, email, hash, role);
    const userId = Number(res.lastInsertRowid);
    db.prepare('INSERT INTO profiles (user_id, display_name) VALUES (?, ?)').run(userId, username);

    awardXp(userId, 'DAILY_LOGIN'); // signup day
    await createSession(userId, req.headers.get('user-agent') ?? '', isHttps(req));

    return json({ ok: true, user: { id: userId, username, email, role } }, 201);
  } catch (e) {
    if (e instanceof ApiError && e.code === 'UNIQUE') return json({ error: 'Username or email taken', code: 'UNIQUE' }, 409);
    return handleError(e);
  }
}
