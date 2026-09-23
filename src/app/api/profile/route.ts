import { NextRequest } from 'next/server';
import { getDb, type SqlParam } from '@/lib/db';
import { ApiError, rateLimit, str, hashPassword, verifyPassword, requireUser } from '@/lib/auth';
import { json, handleError, clientIp } from '@/lib/api';
import { saveUpload } from '@/lib/api';
import { maybeAwardProfileComplete } from '@/lib/xp';
import { USERNAME_RE } from '@/lib/auth';

/** PATCH = update own profile */
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    rateLimit(`profile:${user.id}`, 30, 60_000);
    const db = getDb();
    const contentType = req.headers.get('content-type') ?? '';
    let body: Record<string, unknown> = {};
    let avatar: File | null = null;
    let cover: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      for (const [k, v] of form.entries()) {
        if (k === 'avatar' && v instanceof File) avatar = v;
        else if (k === 'cover' && v instanceof File) cover = v;
        else body[k] = v;
      }
    } else {
      body = await req.json().catch(() => ({}));
    }

    const displayName = body.display_name !== undefined ? str(body.display_name, 60) : null;
    const bio = body.bio !== undefined ? str(body.bio, 300) : null;
    const country = body.country !== undefined ? str(body.country, 60) : null;
    const isPublic = body.is_public !== undefined ? (Number(body.is_public) ? 1 : 0) : null;
    const showEmail = body.show_email !== undefined ? (Number(body.show_email) ? 1 : 0) : null;
    const showCountry = body.show_country !== undefined ? (Number(body.show_country) ? 1 : 0) : null;
    const showActivity = body.show_activity !== undefined ? (Number(body.show_activity) ? 1 : 0) : null;

    const sets: string[] = [];
    const args: SqlParam[] = [];
    if (displayName !== null) { sets.push('display_name = ?'); args.push(displayName); }
    if (bio !== null) { sets.push('bio = ?'); args.push(bio); }
    if (country !== null) { sets.push('country = ?'); args.push(country); }
    if (isPublic !== null) { sets.push('is_public = ?'); args.push(isPublic); }
    if (showEmail !== null) { sets.push('show_email = ?'); args.push(showEmail); }
    if (showCountry !== null) { sets.push('show_country = ?'); args.push(showCountry); }
    if (showActivity !== null) { sets.push('show_activity = ?'); args.push(showActivity); }

    const avatarPath = await saveUpload(avatar, 'image', 'avatar');
    if (avatarPath) { sets.push('avatar_path = ?'); args.push(avatarPath); }
    const coverPath = await saveUpload(cover, 'image', 'cover');
    if (coverPath) { sets.push('cover_path = ?'); args.push(coverPath); }

    if (sets.length) {
      db.prepare(`UPDATE profiles SET ${sets.join(', ')} WHERE user_id = ?`).run(...args, user.id);
    }
    maybeAwardProfileComplete(user.id);
    const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(user.id);
    return json({ ok: true, profile });
  } catch (e) {
    return handleError(e);
  }
}

/** POST = account-level settings (language/theme/username/email) */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const db = getDb();

    if (body.language !== undefined) {
      const lang = body.language === 'en' ? 'en' : 'fa';
      db.prepare('UPDATE users SET language = ? WHERE id = ?').run(lang, user.id);
    }
    if (body.theme !== undefined) {
      const theme = ['dark', 'neon', 'midnight'].includes(String(body.theme)) ? String(body.theme) : 'dark';
      db.prepare('UPDATE users SET theme = ? WHERE id = ?').run(theme, user.id);
    }
    if (body.username !== undefined) {
      const username = str(body.username, 24);
      if (!USERNAME_RE.test(username)) throw new ApiError(400, 'VALIDATION', 'Invalid username');
      if (db.prepare('SELECT 1 FROM users WHERE username = ? COLLATE NOCASE AND id != ?').get(username, user.id))
        throw new ApiError(409, 'USERNAME_TAKEN', 'Username already taken');
      db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username, user.id);
    }
    if (body.email !== undefined) {
      const email = str(body.email, 200).toLowerCase();
      if (db.prepare('SELECT 1 FROM users WHERE email = ? COLLATE NOCASE AND id != ?').get(email, user.id))
        throw new ApiError(409, 'EMAIL_TAKEN', 'Email already registered');
      db.prepare('UPDATE users SET email = ? WHERE id = ?').run(email, user.id);
    }
    if (body.currentPassword && body.newPassword) {
      const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(user.id) as { password_hash: string };
      if (!verifyPassword(String(body.currentPassword), row.password_hash))
        throw new ApiError(400, 'INVALID_PASSWORD', 'Current password is wrong');
      const np = String(body.newPassword);
      if (np.length < 8) throw new ApiError(400, 'VALIDATION', 'Password must be at least 8 characters');
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(np), user.id);
      // Revoke all other sessions, keep the current one
      const { cookies } = await import('next/headers');
      const jar = await cookies();
      const cur = jar.get('gid_session')?.value;
      if (cur) db.prepare('DELETE FROM sessions WHERE user_id = ? AND token != ?').run(user.id, cur);
      else db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
    }
    if (body.logoutAll) {
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
      const { destroySession } = await import('@/lib/auth');
      await destroySession();
      return json({ ok: true, loggedOut: true });
    }

    const fresh = db
      .prepare('SELECT id, username, email, role, language, theme FROM users WHERE id = ?')
      .get(user.id);
    return json({ ok: true, user: fresh });
  } catch (e) {
    return handleError(e);
  }
}
