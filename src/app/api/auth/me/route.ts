import { getCurrentUser } from '@/lib/auth';
import { json, handleError } from '@/lib/api';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return json({ user: null });
    const db = getDb();
    const unread = (db
      .prepare('SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND read_at IS NULL')
      .get(user.id) as { c: number }).c;
    const unreadMessages = (db
      .prepare(
        `SELECT COUNT(*) AS c FROM messages m
         JOIN thread_members tm ON tm.thread_id = m.thread_id AND tm.user_id = ?
         WHERE m.sender_id != ? AND (tm.last_read_at IS NULL OR m.created_at > tm.last_read_at)`
      )
      .get(user.id, user.id) as { c: number }).c;
    return json({ user, unread, unreadMessages });
  } catch (e) {
    return handleError(e);
  }
}
