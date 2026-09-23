import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { json, handleError } from '@/lib/api';
import { awardXp } from '@/lib/xp';

/** POST claim daily login XP manually (from UI button) */
export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) return json({ ok: false, error: 'Login required' }, 401);
    const db = getDb();
    const today = new Date().toISOString().slice(0, 10);
    const row = db.prepare('SELECT last_daily_claim FROM users WHERE id = ?').get(user.id) as { last_daily_claim: string | null };
    if (row.last_daily_claim === today) {
      return json({ ok: false, already: true, amount: 0 });
    }
    db.prepare('UPDATE users SET last_daily_claim = ? WHERE id = ?').run(today, user.id);
    const res = awardXp(user.id, 'DAILY_LOGIN');
    return json({ ok: true, amount: 20, ...res });
  } catch (e) {
    return handleError(e);
  }
}
