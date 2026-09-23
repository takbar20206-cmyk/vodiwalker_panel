import { NextRequest } from 'next/server';
import { getDb, type SqlParam } from '@/lib/db';
import { requireUser, ApiError, str, int, getCurrentUser } from '@/lib/auth';
import { json, handleError } from '@/lib/api';
import { awardXp, createNotification, evaluateAchievements, createPost } from '@/lib/xp';

/** GET clan detail: /api/clans/[id] */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const db = getDb();
    const clan = db
      .prepare(
        `SELECT c.*, u.username AS leader_username, p.avatar_path AS leader_avatar, p.display_name AS leader_name
         FROM clans c JOIN users u ON u.id = c.leader_id JOIN profiles p ON p.user_id = c.leader_id
         WHERE c.id = ? OR c.slug = ?`
      )
      .get(Number(id) || 0, id) as Record<string, unknown> | undefined;
    if (!clan) throw new ApiError(404, 'NOT_FOUND', 'Clan not found');
    const members = db
      .prepare(
        `SELECT cm.role, cm.joined_at, u.id, u.username, p.display_name, p.avatar_path, p.level, p.xp
         FROM clan_members cm JOIN users u ON u.id = cm.user_id JOIN profiles p ON p.user_id = u.id
         WHERE cm.clan_id = ? ORDER BY CASE cm.role WHEN 'leader' THEN 0 WHEN 'co-leader' THEN 1 ELSE 2 END, p.xp DESC`
      )
      .all(clan.id as number);
    const viewer = await getCurrentUser();
    let viewerMembership: { role: string; status: string } | null = null;
    if (viewer) {
      const m = db.prepare('SELECT role FROM clan_members WHERE clan_id = ? AND user_id = ?').get(clan.id as number, viewer.id) as { role: string } | undefined;
      if (m) viewerMembership = { role: m.role, status: 'member' };
      else {
        const inv = db
          .prepare("SELECT status FROM clan_invites WHERE clan_id = ? AND invitee_id = ? AND status = 'pending'")
          .get(clan.id as number, viewer.id) as { status: string } | undefined;
        if (inv) viewerMembership = { role: '', status: 'invited' };
      }
    }
    return json({ clan, members, viewerMembership });
  } catch (e) {
    return handleError(e);
  }
}

/** POST actions: join | leave | invite | kick | accept_invite | decline_invite | update */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const action = str(body.action, 30);
    const db = getDb();
    const clan = db.prepare('SELECT * FROM clans WHERE id = ? OR slug = ?').get(Number(id) || 0, id) as Record<string, unknown> | undefined;
    if (!clan) throw new ApiError(404, 'NOT_FOUND', 'Clan not found');
    const clanId = clan.id as number;

    const membership = db.prepare('SELECT role FROM clan_members WHERE clan_id = ? AND user_id = ?').get(clanId, user.id) as { role: string } | undefined;

    if (action === 'join') {
      if (membership) throw new ApiError(409, 'ALREADY', 'Already a member');
      const other = db.prepare('SELECT 1 FROM clan_members WHERE user_id = ?').get(user.id);
      if (other) throw new ApiError(409, 'IN_CLAN', 'Leave your current clan first');
      const pendingInvite = db
        .prepare("SELECT 1 FROM clan_invites WHERE clan_id = ? AND invitee_id = ? AND status = 'pending'")
        .get(clanId, user.id);
      // open join: allowed only via invite OR clan under 50 members (public join)
      if (!pendingInvite && clan.members_count as number >= 1000) throw new ApiError(403, 'FULL', 'Clan is full');
      db.prepare('INSERT INTO clan_members (clan_id, user_id, role) VALUES (?, ?, ?)').run(clanId, user.id, 'member');
      db.prepare("UPDATE clan_invites SET status = 'accepted' WHERE clan_id = ? AND invitee_id = ?").run(clanId, user.id);
      db.prepare('UPDATE clans SET members_count = members_count + 1 WHERE id = ?').run(clanId);
      awardXp(user.id, 'JOIN_CLAN');
      createPost(user.id, 'clan_joined', '', { clanId, clanName: clan.name });
      evaluateAchievements(user.id);
      createNotification(clan.leader_id as number, 'clan_join', user.id, 'clan', clanId, { username: user.username, clanName: clan.name });
      return json({ ok: true, status: 'member' });
    }

    if (action === 'leave') {
      if (!membership) throw new ApiError(404, 'NOT_FOUND', 'Not a member');
      if (membership.role === 'leader') {
        const count = (db.prepare('SELECT COUNT(*) AS c FROM clan_members WHERE clan_id = ?').get(clanId) as { c: number }).c;
        if (count > 1) throw new ApiError(400, 'LEADER', 'Transfer leadership or kick everyone before leaving');
        // disband empty clan
        db.prepare('DELETE FROM clans WHERE id = ?').run(clanId);
        return json({ ok: true, disbanded: true });
      }
      db.prepare('DELETE FROM clan_members WHERE clan_id = ? AND user_id = ?').run(clanId, user.id);
      db.prepare('UPDATE clans SET members_count = MAX(1, members_count - 1) WHERE id = ?').run(clanId);
      return json({ ok: true, status: 'none' });
    }

    if (action === 'invite') {
      if (!membership || membership.role === 'member') throw new ApiError(403, 'FORBIDDEN', 'Only leaders can invite');
      const invitee = int(body.user_id, 1);
      const exists = db.prepare('SELECT 1 FROM clan_members WHERE clan_id = ? AND user_id = ?').get(clanId, invitee);
      if (exists) throw new ApiError(409, 'ALREADY', 'Already a member');
      db.prepare(
        `INSERT INTO clan_invites (clan_id, inviter_id, invitee_id) VALUES (?, ?, ?)
         ON CONFLICT(clan_id, invitee_id) DO UPDATE SET status = 'pending'`
      ).run(clanId, user.id, invitee);
      createNotification(invitee, 'clan_invite', user.id, 'clan', clanId, { clanName: clan.name, username: user.username });
      return json({ ok: true }, 201);
    }

    if (action === 'respond_invite') {
      const accept = !!body.accept;
      const inv = db
        .prepare("SELECT id FROM clan_invites WHERE clan_id = ? AND invitee_id = ? AND status = 'pending'")
        .get(clanId, user.id);
      if (!inv) throw new ApiError(404, 'NOT_FOUND', 'No invite');
      if (accept) {
        const other = db.prepare('SELECT 1 FROM clan_members WHERE user_id = ?').get(user.id);
        if (other) throw new ApiError(409, 'IN_CLAN', 'Already in a clan');
        db.prepare('INSERT INTO clan_members (clan_id, user_id, role) VALUES (?, ?, ?)').run(clanId, user.id, 'member');
        db.prepare('UPDATE clans SET members_count = members_count + 1 WHERE id = ?').run(clanId);
        db.prepare("UPDATE clan_invites SET status = 'accepted' WHERE id = ?").run(inv.id as number);
        awardXp(user.id, 'JOIN_CLAN');
        createPost(user.id, 'clan_joined', '', { clanId, clanName: clan.name });
        evaluateAchievements(user.id);
        return json({ ok: true, status: 'member' });
      }
      db.prepare("UPDATE clan_invites SET status = 'declined' WHERE id = ?").run(inv.id as number);
      return json({ ok: true, status: 'none' });
    }

    if (action === 'kick') {
      if (!membership || membership.role === 'member') throw new ApiError(403, 'FORBIDDEN', 'Leaders only');
      const target = int(body.user_id, 1);
      const tm = db.prepare('SELECT role FROM clan_members WHERE clan_id = ? AND user_id = ?').get(clanId, target) as { role: string } | undefined;
      if (!tm) throw new ApiError(404, 'NOT_FOUND', 'Not a member');
      if (tm.role === 'leader') throw new ApiError(403, 'FORBIDDEN', 'Cannot kick the leader');
      if (membership.role === 'co-leader' && tm.role === 'co-leader') throw new ApiError(403, 'FORBIDDEN', 'Co-leaders cannot kick co-leaders');
      db.prepare('DELETE FROM clan_members WHERE clan_id = ? AND user_id = ?').run(clanId, target);
      db.prepare('UPDATE clans SET members_count = MAX(1, members_count - 1) WHERE id = ?').run(clanId);
      createNotification(target, 'clan_kick', user.id, 'clan', clanId, { clanName: clan.name });
      return json({ ok: true });
    }

    if (action === 'promote') {
      if (!membership || membership.role !== 'leader') throw new ApiError(403, 'FORBIDDEN', 'Leader only');
      const target = int(body.user_id, 1);
      const tm = db.prepare('SELECT role FROM clan_members WHERE clan_id = ? AND user_id = ?').get(clanId, target) as { role: string } | undefined;
      if (!tm) throw new ApiError(404, 'NOT_FOUND', 'Not a member');
      const newRole = tm.role === 'member' ? 'co-leader' : 'member';
      db.prepare('UPDATE clan_members SET role = ? WHERE clan_id = ? AND user_id = ?').run(newRole, clanId, target);
      return json({ ok: true, role: newRole });
    }

    if (action === 'update') {
      if (!membership || membership.role === 'member') throw new ApiError(403, 'FORBIDDEN', 'Leaders only');
      const sets: string[] = []; const args: SqlParam[] = [];
      if (body.description !== undefined) { sets.push('description = ?'); args.push(str(body.description, 500)); }
      if (body.games !== undefined) { sets.push('games = ?'); args.push(str(body.games, 200)); }
      if (sets.length) db.prepare(`UPDATE clans SET ${sets.join(', ')} WHERE id = ?`).run(...args, clanId);
      return json({ ok: true });
    }

    throw new ApiError(400, 'VALIDATION', 'Unknown action');
  } catch (e) {
    return handleError(e);
  }
}
