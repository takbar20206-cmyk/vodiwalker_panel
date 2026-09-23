import { getDb } from './db';

export type PublicUser = {
  id: number;
  username: string;
  display_name: string;
  bio: string;
  country: string;
  avatar_path: string | null;
  cover_path: string | null;
  xp: number;
  level: number;
  followers_count: number;
  following_count: number;
  friends_count: number;
  posts_count: number;
  created_at: string;
  role: string;
  is_active: number;
  email?: string;
  show_email?: number;
  show_country?: number;
  show_activity?: number;
  profile_views?: number;
};

export function getPublicUser(username: string): PublicUser | null {
  const db = getDb();
  const u = db
    .prepare(
      `SELECT u.id, u.username, u.email, u.role, u.is_active, u.created_at,
              p.display_name, p.bio, p.country, p.avatar_path, p.cover_path, p.xp, p.level,
              p.followers_count, p.following_count, p.friends_count, p.posts_count,
              p.profile_views, p.show_email, p.show_country, p.show_activity
       FROM users u JOIN profiles p ON p.user_id = u.id
       WHERE u.username = ? COLLATE NOCASE`
    )
    .get(username) as PublicUser | undefined;
  return u ?? null;
}

export function getUserById(id: number): PublicUser | null {
  const db = getDb();
  const u = db
    .prepare(
      `SELECT u.id, u.username, u.role, u.is_active, u.created_at,
              p.display_name, p.bio, p.country, p.avatar_path, p.cover_path, p.xp, p.level,
              p.followers_count, p.following_count, p.friends_count, p.posts_count
       FROM users u JOIN profiles p ON p.user_id = u.id WHERE u.id = ?`
    )
    .get(id) as PublicUser | undefined;
  return u ?? null;
}

export function relationsWith(viewerId: number | null, otherId: number) {
  if (!viewerId || viewerId === otherId) {
    return { following: false, friend: false, friendPending: false, friendIncoming: false, isSelf: viewerId === otherId };
  }
  const db = getDb();
  const following = !!db
    .prepare('SELECT 1 FROM followers WHERE follower_id = ? AND followee_id = ?')
    .get(viewerId, otherId);
  const out = db
    .prepare("SELECT status FROM friends WHERE user_id = ? AND friend_id = ?")
    .get(viewerId, otherId) as { status: string } | undefined;
  const inc = db
    .prepare("SELECT status FROM friends WHERE user_id = ? AND friend_id = ?")
    .get(otherId, viewerId) as { status: string } | undefined;
  const friend = out?.status === 'accepted' || inc?.status === 'accepted';
  const friendPending = out?.status === 'pending';
  const friendIncoming = inc?.status === 'pending';
  return { following, friend, friendPending, friendIncoming, isSelf: false };
}
