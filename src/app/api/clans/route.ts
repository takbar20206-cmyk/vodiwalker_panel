import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireUser, ApiError, rateLimit, str, int, getCurrentUser } from '@/lib/auth';
import { json, handleError } from '@/lib/api';
import { awardXp, createNotification, evaluateAchievements, createPost } from '@/lib/xp';

/** GET clans list or single */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = str(searchParams.get('q') ?? '', 80);
    const db = getDb();
    if (q) {
      const rows = db
        .prepare(
          `SELECT c.*, u.username AS leader_username, p.avatar_path AS leader_avatar
           FROM clans c JOIN users u ON u.id = c.leader_id JOIN profiles p ON p.user_id = c.leader_id
           WHERE c.name LIKE ? ORDER BY c.xp DESC LIMIT 50`
        )
        .all(`%${q}%`);
      return json({ clans: rows });
    }
    const rows = db
      .prepare(
        `SELECT c.*, u.username AS leader_username, p.avatar_path AS leader_avatar
         FROM clans c JOIN users u ON u.id = c.leader_id JOIN profiles p ON p.user_id = c.leader_id
         ORDER BY c.xp DESC LIMIT 100`
      )
      .all();
    return json({ clans: rows });
  } catch (e) {
    return handleError(e);
  }
}

/** POST create clan */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    rateLimit(`clan:${user.id}`, 5, 600_000);
    const formOrJson = req.headers.get('content-type') || '';
    let name = '', description = '', games = '';
    let logo: File | null = null, banner: File | null = null;
    if (formOrJson.includes('multipart')) {
      const form = await req.formData();
      name = str(form.get('name') ?? '', 40);
      description = str(form.get('description') ?? '', 500);
      games = str(form.get('games') ?? '', 200);
      if (form.get('logo') instanceof File) logo = form.get('logo') as File;
      if (form.get('banner') instanceof File) banner = form.get('banner') as File;
    } else {
      const body = await req.json().catch(() => ({}));
      name = str(body.name ?? '', 40);
      description = str(body.description ?? '', 500);
      games = str(body.games ?? '', 200);
    }
    if (!name) throw new ApiError(400, 'VALIDATION', 'Clan name required');
    const db = getDb();
    if (db.prepare('SELECT 1 FROM clans WHERE name = ? COLLATE NOCASE').get(name))
      throw new ApiError(409, 'TAKEN', 'Clan name already exists');
    const inClan = db.prepare('SELECT 1 FROM clan_members WHERE user_id = ?').get(user.id);
    if (inClan) throw new ApiError(409, 'IN_CLAN', 'Leave your current clan first');

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `clan-${Date.now()}`;
    const { saveUpload } = await import('@/lib/api');
    const logoPath = await saveUpload(logo, 'image', 'clan-logo');
    const bannerPath = await saveUpload(banner, 'image', 'clan-banner');

    const res = db
      .prepare('INSERT INTO clans (name, slug, description, logo_path, banner_path, leader_id, games) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(name, slug, description, logoPath || '', bannerPath || '', user.id, games);
    const clanId = Number(res.lastInsertRowid);
    db.prepare("INSERT INTO clan_members (clan_id, user_id, role) VALUES (?, ?, 'leader')").run(clanId, user.id);
    awardXp(user.id, 'CREATE_CLAN');
    createPost(user.id, 'clan_joined', '', { clanId, clanName: name });
    evaluateAchievements(user.id);
    const clan = db.prepare('SELECT * FROM clans WHERE id = ?').get(clanId);
    return json({ ok: true, clan }, 201);
  } catch (e) {
    return handleError(e);
  }
}
