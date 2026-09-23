import { getDb } from './db';

/**
 * Level curve:
 *   Level 1 -> 0 XP, Level 2 -> 100 XP, Level 3 -> 250 XP, ...
 *   step(L -> L+1) = 50 * (L + 1)
 *   total(n) = 25 * (n - 1) * (n + 2)
 */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return 25 * (level - 1) * (level + 2);
}

export function levelForXp(xp: number): number {
  let level = 1;
  while (level < 500 && xpForLevel(level + 1) <= xp) level++;
  return level;
}

export const XP_REWARDS = {
  PROFILE_COMPLETE: 100,
  ADD_GAME: 25,
  DAILY_LOGIN: 20,
  CREATE_POST: 15,
  LIKE_RECEIVED: 5,
  LIKE_GIVEN: 1,
  COMMENT: 5,
  WIN_CHALLENGE: 150,
  UPLOAD_CLIP: 40,
  JOIN_CLAN: 30,
  CREATE_CLAN: 50,
  FOLLOW: 2,
  FRIEND: 10,
  FIRST_CLAN: 0,
} as const;

export type XpReason = keyof typeof XP_REWARDS | 'ACHIEVEMENT' | 'ADMIN';

/** Award XP to a user, recompute level, log event, return new state. */
export function awardXp(userId: number, reason: XpReason | string, customAmount?: number): { xp: number; level: number; leveledUp: boolean } {
  const db = getDb();
  const amount = customAmount ?? (XP_REWARDS[reason as keyof typeof XP_REWARDS] ?? 0);
  if (!amount) {
    const cur = db.prepare('SELECT xp, level FROM profiles WHERE user_id = ?').get(userId) as { xp: number; level: number } | undefined;
    return { xp: cur?.xp ?? 0, level: cur?.level ?? 1, leveledUp: false };
  }
  const row = db.prepare('SELECT xp, level FROM profiles WHERE user_id = ?').get(userId) as { xp: number; level: number } | undefined;
  if (!row) return { xp: 0, level: 1, leveledUp: false };
  const newXp = row.xp + amount;
  const newLevel = levelForXp(newXp);
  db.prepare('UPDATE profiles SET xp = ?, level = ? WHERE user_id = ?').run(newXp, newLevel, userId);
  db.prepare('INSERT INTO xp_events (user_id, amount, reason) VALUES (?, ?, ?)').run(userId, amount, reason);
  // Clan XP share when the user is in a clan
  if (['CREATE_POST', 'WIN_CHALLENGE', 'UPLOAD_CLIP', 'ACHIEVEMENT', 'LIKE_RECEIVED'].includes(reason)) {
    const clan = db.prepare('SELECT clan_id FROM clan_members WHERE user_id = ?').get(userId) as { clan_id: number } | undefined;
    if (clan) {
      const share = Math.max(1, Math.round(amount / 2));
      const c = db.prepare('SELECT xp FROM clans WHERE id = ?').get(clan.clan_id) as { xp: number };
      db.prepare('UPDATE clans SET xp = ? WHERE id = ?').run(c.xp + share, clan.clan_id);
      recalcClanLevel(clan.clan_id);
    }
  }
  return { xp: newXp, level: newLevel, leveledUp: newLevel > row.level };
}

export function recalcClanLevel(clanId: number): void {
  const db = getDb();
  const c = db.prepare('SELECT xp FROM clans WHERE id = ?').get(clanId) as { xp: number };
  const level = levelForXp(c.xp);
  db.prepare('UPDATE clans SET level = ? WHERE id = ?').run(level, clanId);
}

/** Daily login XP — once per calendar day. */
export function claimDailyLogin(userId: number): number {
  const db = getDb();
  const u = db.prepare('SELECT last_daily_claim FROM users WHERE id = ?').get(userId) as { last_daily_claim: string | null };
  const today = new Date().toISOString().slice(0, 10);
  if (u.last_daily_claim === today) return 0;
  db.prepare('UPDATE users SET last_daily_claim = ? WHERE id = ?').run(today, userId);
  awardXp(userId, 'DAILY_LOGIN');
  return XP_REWARDS.DAILY_LOGIN;
}

export function profileCompletionPercent(userId: number): number {
  const db = getDb();
  const p = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(userId) as Record<string, unknown>;
  const u = db.prepare('SELECT username FROM users WHERE id = ?').get(userId) as { username: string };
  const checks = [
    !!p?.display_name,
    !!p?.bio,
    !!p?.country,
    !!p?.avatar_path,
    !!p?.cover_path,
    (db.prepare('SELECT COUNT(*) AS c FROM user_games WHERE user_id = ?').get(userId) as { c: number }).c > 0,
    u.username.length >= 3,
  ];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}

/** Award "PROFILE COMPLETE" once when completion reaches 100%. */
export function maybeAwardProfileComplete(userId: number): void {
  const pct = profileCompletionPercent(userId);
  if (pct >= 100) {
    const db = getDb();
    const ach = db.prepare("SELECT id FROM achievements WHERE slug = 'profile-complete'").get() as { id: number } | undefined;
    if (ach) unlockAchievement(userId, ach.id);
  }
}

export function unlockAchievement(userId: number, achievementId: number): boolean {
  const db = getDb();
  const existing = db
    .prepare('SELECT id FROM user_achievements WHERE user_id = ? AND achievement_id = ?')
    .get(userId, achievementId);
  if (existing) return false;
  db.prepare('INSERT INTO user_achievements (user_id, achievement_id) VALUES (?, ?)').run(userId, achievementId);
  const ach = db.prepare('SELECT xp_reward FROM achievements WHERE id = ?').get(achievementId) as { xp_reward: number };
  awardXp(userId, 'ACHIEVEMENT', ach.xp_reward);
  const user = db.prepare('SELECT username FROM users WHERE id = ?').get(userId) as { username: string };
  createNotification(userId, 'achievement', userId, 'achievement', achievementId, {
    achievementId,
    username: user.username,
  });
  createPost(userId, 'achievement_unlocked', '', { achievementId });
  return true;
}

export function createNotification(
  userId: number,
  type: string,
  actorId: number | null,
  entityType = '',
  entityId = 0,
  payload: Record<string, unknown> = {}
): void {
  getDb()
    .prepare(
      'INSERT INTO notifications (user_id, type, actor_id, entity_type, entity_id, payload) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(userId, type, actorId, entityType, entityId, JSON.stringify(payload));
}

export function createPost(userId: number, type: string, content: string, meta: Record<string, unknown> = {}): number {
  const db = getDb();
  const res = db
    .prepare('INSERT INTO posts (user_id, type, content, meta) VALUES (?, ?, ?, ?)')
    .run(userId, type, content, JSON.stringify(meta));
  db.prepare('UPDATE profiles SET posts_count = posts_count + 1 WHERE user_id = ?').run(userId);
  awardXp(userId, 'CREATE_POST');
  return Number(res.lastInsertRowid);
}

/** Evaluate achievement conditions after activity. */
export function evaluateAchievements(userId: number): number[] {
  const db = getDb();
  const unlocked = new Set(
    (db.prepare('SELECT achievement_id FROM user_achievements WHERE user_id = ?').all(userId) as { achievement_id: number }[]).map(
      (r) => r.achievement_id
    )
  );
  const all = db.prepare('SELECT id, slug FROM achievements').all() as { id: number; slug: string }[];
  const newly: number[] = [];

  const kills = (db.prepare("SELECT COALESCE(SUM(hours),0) AS v FROM user_games WHERE user_id = ?").get(userId) as { v: number }).v;
  const gamesCount = (db.prepare('SELECT COUNT(*) AS v FROM user_games WHERE user_id = ?').get(userId) as { v: number }).v;
  const hoursTotal = kills;
  const postsCount = (db.prepare('SELECT COUNT(*) AS v FROM posts WHERE user_id = ?').get(userId) as { v: number }).v;
  const clipsCount = (db.prepare('SELECT COUNT(*) AS v FROM clips WHERE user_id = ?').get(userId) as { v: number }).v;
  const level = (db.prepare('SELECT level AS v FROM profiles WHERE user_id = ?').get(userId) as { v: number }).v;
  const lvl = level;

  for (const a of all) {
    if (unlocked.has(a.id)) continue;
    let cond = false;
    switch (a.slug) {
      case 'first-game':
        cond = gamesCount >= 1;
        break;
      case 'game-collector':
        cond = gamesCount >= 5;
        break;
      case '100-hours':
        cond = hoursTotal >= 100;
        break;
      case 'first-post':
        cond = postsCount >= 1;
        break;
      case 'first-clip':
        cond = clipsCount >= 1;
        break;
      case 'level-5':
        cond = lvl >= 5;
        break;
      case 'level-10':
        cond = lvl >= 10;
        break;
      case 'social-butterfly':
        cond = (db.prepare('SELECT COUNT(*) AS v FROM followers WHERE followee_id = ?').get(userId) as { v: number }).v >= 10;
        break;
      case 'clan-member':
        cond = (db.prepare('SELECT COUNT(*) AS v FROM clan_members WHERE user_id = ?').get(userId) as { v: number }).v >= 1;
        break;
      case 'night-owl': {
        const hour = new Date().getUTCHours();
        cond = hour >= 22 || hour < 5;
        break;
      }
    }
    if (cond) {
      if (unlockAchievement(userId, a.id)) newly.push(a.id);
    }
  }
  return newly;
}
