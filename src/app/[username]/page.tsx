import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { ProfileView } from '@/components/ProfileView';

export const dynamic = 'force-dynamic';

export default async function ProfilePage({ params, searchParams }: { params: Promise<{ username: string }>; searchParams: Promise<{ edit?: string }> }) {
  const { username } = await params;
  const sp = await searchParams;
  const viewer = await getCurrentUser();
  const db = getDb();
  const exists = db.prepare('SELECT 1 FROM users WHERE username = ? COLLATE NOCASE').get(username);
  if (!exists) notFound();

  return <ProfileView username={username} initialEdit={sp.edit === '1'} viewerId={viewer?.id ?? null} viewerRole={viewer?.role ?? null} />;
}
