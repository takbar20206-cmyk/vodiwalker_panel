import { NextRequest } from 'next/server';
import { getDb, type SqlParam } from '@/lib/db';
import { requireUser, ApiError, rateLimit, str, int, getCurrentUser } from '@/lib/auth';
import { json, handleError, saveUpload } from '@/lib/api';
import { awardXp, createNotification, evaluateAchievements } from '@/lib/xp';

/** GET clips with tab filtering + pagination */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tab = searchParams.get('tab') || 'trending'; // trending | new | liked | following
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const userId = Number(searchParams.get('userId') || 0);
    const limit = 12;
    const db = getDb();
    const viewer = await getCurrentUser();

    let where = '1=1';
    const args: SqlParam[] = [];
    if (userId) { where = 'c.user_id = ?'; args.push(userId); }
    else if (tab === 'new') { where = '1=1'; }
    else if (tab === 'following') {
      if (!viewer) return json({ clips: [], total: 0, page, pages: 0, requiresAuth: true });
      where = 'c.user_id IN (SELECT followee_id FROM followers WHERE follower_id = ?)';
      args.push(viewer.id);
    } else if (tab === 'liked') {
      where = 'c.likes_count > 0';
    } else {
      // trending = views + likes weighted recency (simple: views desc for recent week, else likes)
      where = '1=1';
    }

    let orderBy = 'c.id DESC';
    if (tab === 'trending') orderBy = '(c.views + c.likes_count * 10) DESC, c.id DESC';
    if (tab === 'liked') orderBy = 'c.likes_count DESC, c.id DESC';

    const total = (db.prepare(`SELECT COUNT(*) AS c FROM clips c WHERE ${where}`).get(...args) as { c: number }).c;
    const clips = db
      .prepare(
        `SELECT c.*, g.name AS game_name, g.accent AS game_accent, g.cover_path AS game_cover,
                u.username, p.display_name, p.avatar_path, p.level
         FROM clips c
         LEFT JOIN games g ON g.id = c.game_id
         JOIN users u ON u.id = c.user_id JOIN profiles p ON p.user_id = c.user_id
         WHERE ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`
      )
      .all(...args, limit, (page - 1) * limit) as Record<string, unknown>[];

    let liked: number[] = [];
    if (viewer && clips.length) {
      const ids = clips.map((c) => c.id as number);
      liked = (
        db
          .prepare(`SELECT target_id FROM likes WHERE user_id = ? AND target_type = 'clip' AND target_id IN (${ids.map(() => '?').join(',')})`)
          .all(viewer.id, ...ids) as { target_id: number }[]
      ).map((r) => r.target_id);
    }
    const saved = viewer
      ? (
          db
            .prepare(
              `SELECT entity_id FROM notifications WHERE user_id = ? AND type = 'clip_saved' AND entity_type = 'clip' AND entity_id IN (${clips.map(() => '?').join(',') || '-1'})`
            )
            .all(viewer.id, ...(clips.length ? clips.map((c) => c.id as number) : [-1])) as { entity_id: number }[]
        ).map((r) => r.entity_id)
      : [];

    return json({ clips: clips.map((c) => ({ ...c, liked: liked.includes(c.id as number), saved: saved.includes(c.id as number) })), total, page, pages: Math.ceil(total / limit) });
  } catch (e) {
    return handleError(e);
  }
}

/** POST upload a clip */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    rateLimit(`clip:${user.id}`, 10, 300_000);
    const form = await req.formData();
    const title = str(form.get('title') ?? '', 120);
    const gameId = Number(form.get('game_id') || 0);
    const tags = str(form.get('tags') ?? '', 200);
    const video = form.get('video');
    if (!title) throw new ApiError(400, 'VALIDATION', 'Title required');
    if (!(video instanceof File) || video.size === 0) throw new ApiError(400, 'VALIDATION', 'Video file required');

    const videoPath = await saveUpload(video, 'video', 'clip');
    const thumb = form.get('thumb');
    let thumbPath = '';
    if (thumb instanceof File && thumb.size > 0) {
      thumbPath = (await saveUpload(thumb, 'image', 'thumb')) || '';
    }

    const db = getDb();
    const res = db
      .prepare('INSERT INTO clips (user_id, game_id, title, tags, video_path, thumb_path) VALUES (?, ?, ?, ?, ?, ?)')
      .run(user.id, gameId || null, title, tags, videoPath, thumbPath);
    const clipId = Number(res.lastInsertRowid);
    awardXp(user.id, 'UPLOAD_CLIP');
    db.prepare('INSERT INTO posts (user_id, type, content, meta) VALUES (?, ?, ?, ?)').run(
      user.id, 'clip', title, JSON.stringify({ clipId })
    );
    db.prepare('UPDATE profiles SET posts_count = posts_count + 1 WHERE user_id = ?').run(user.id);
    evaluateAchievements(user.id);
    const clip = db.prepare('SELECT * FROM clips WHERE id = ?').get(clipId);
    return json({ ok: true, clip }, 201);
  } catch (e) {
    return handleError(e);
  }
}

/** DELETE own clip / admin */
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const id = int(searchParams.get('id'), 1);
    const db = getDb();
    const clip = db.prepare('SELECT user_id FROM clips WHERE id = ?').get(id) as { user_id: number } | undefined;
    if (!clip) throw new ApiError(404, 'NOT_FOUND', 'Not found');
    if (clip.user_id !== user.id && user.role !== 'admin') throw new ApiError(403, 'FORBIDDEN', 'Not yours');
    db.prepare('DELETE FROM clips WHERE id = ?').run(id);
    return json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
