import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { getDb } from './db';

const SESSION_COOKIE = 'gid_session';
const SESSION_DAYS = 30;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
  return `scrypt$16384$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [algo, cost, salt, hash] = stored.split('$');
    if (algo !== 'scrypt') return false;
    const candidate = crypto.scryptSync(password, salt, 64, { N: Number(cost), r: 8, p: 1 });
    const expected = Buffer.from(hash, 'hex');
    return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}

function secret(): string {
  return process.env.SESSION_SECRET || 'dev-secret-change-me-in-production-0123456789abcdef';
}

export function signToken(payload: string): string {
  const data = Buffer.from(payload).toString('base64url');
  const sig = crypto.createHmac('sha256', secret()).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export function verifyToken(token: string): string | null {
  const idx = token.lastIndexOf('.');
  if (idx <= 0) return null;
  const data = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expected = crypto.createHmac('sha256', secret()).update(data).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    return Buffer.from(data, 'base64url').toString('utf8');
  } catch {
    return null;
  }
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

export type SessionUser = {
  id: number;
  username: string;
  email: string;
  role: string;
  language: string;
  theme: string;
  avatar_path: string | null;
  display_name: string;
  xp: number;
  level: number;
  country: string;
  bio: string;
  cover_path: string | null;
  followers_count: number;
  following_count: number;
  friends_count: number;
  posts_count: number;
  is_active: number;
};

export async function createSession(userId: number, userAgent = ''): Promise<string> {
  const db = getDb();
  const token = randomToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
  db.prepare('INSERT INTO sessions (token, user_id, user_agent, expires_at) VALUES (?, ?, ?, ?)').run(
    token, userId, userAgent.slice(0, 300), expires
  );
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 86400,
    secure: process.env.NODE_ENV === 'production' && process.env.FORCE_INSECURE_COOKIE !== '1',
  });
  return token;
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    getDb().prepare('DELETE FROM sessions WHERE token = ?').run(token);
  }
  jar.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = getDb();
  const session = db
    .prepare("SELECT user_id, expires_at FROM sessions WHERE token = ? AND expires_at > datetime('now')")
    .get(token) as { user_id: number; expires_at: string } | undefined;
  if (!session) return null;
  const user = db
    .prepare(
      `SELECT u.id, u.username, u.email, u.role, u.language, u.theme, u.is_active,
              p.avatar_path, p.display_name, p.xp, p.level, p.country, p.bio, p.cover_path,
              p.followers_count, p.following_count, p.friends_count, p.posts_count
       FROM users u JOIN profiles p ON p.user_id = u.id WHERE u.id = ?`
    )
    .get(session.user_id) as SessionUser | undefined;
  if (!user || !user.is_active) return null;
  return user;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, 'UNAUTHORIZED', 'Login required');
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== 'admin') throw new ApiError(403, 'FORBIDDEN', 'Admin access required');
  return user;
}

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/* ---------- Rate limiting (per-IP, in-memory) ---------- */
const buckets = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) if (now > v.reset) buckets.delete(k);
    }
    return;
  }
  b.count += 1;
  if (b.count > limit) {
    throw new ApiError(429, 'RATE_LIMITED', 'Too many requests, please slow down');
  }
}

/* ---------- Validation ---------- */
export function requireFields(body: Record<string, unknown>, fields: string[]): void {
  for (const f of fields) {
    const v = body[f];
    if (v === undefined || v === null || (typeof v === 'string' && !v.trim())) {
      throw new ApiError(400, 'VALIDATION', `Field required: ${f}`);
    }
  }
}

export function str(v: unknown, max = 500): string {
  const s = String(v ?? '').trim();
  if (s.length > max) throw new ApiError(400, 'VALIDATION', `Value too long (max ${max})`);
  return s;
}

export function int(v: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  const n = Math.trunc(Number(v));
  if (!Number.isFinite(n)) throw new ApiError(400, 'VALIDATION', 'Invalid number');
  return Math.min(Math.max(n, min), max);
}

export const USERNAME_RE = /^[a-zA-Z0-9_]{3,24}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
