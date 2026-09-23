import { getCurrentUser } from '@/lib/auth';
import { HomeHero } from '@/components/HomeHero';
import { Feed } from '@/components/Feed';
import { FeaturesSection } from '@/components/FeaturesSection';
import { DailyRewardClient } from '@/components/DailyRewardClient';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const user = await getCurrentUser();

  if (user) {
    return <LoggedInHome username={user.username} level={user.level} xp={user.xp} />;
  }
  return (
    <>
      <HomeHero />
      <FeaturesSection />
    </>
  );
}

function LoggedInHome({ username, level, xp }: { username: string; level: number; xp: number }) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Feed />
        </div>
        <aside className="space-y-4">
          <DailyRewardClient />
          <div className="card p-5">
            <div className="text-xs font-extrabold tracking-widest text-[#00a8ff] mb-3 uppercase">Quick Links</div>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/squads" className="btn-ghost !py-2.5 text-xs text-center">🎯 Squad Finder</Link>
              <Link href="/challenges" className="btn-ghost !py-2.5 text-xs text-center">⚡ Challenges</Link>
              <Link href="/create" className="btn-ghost !py-2.5 text-xs text-center">✂ ClipZone</Link>
              <Link href="/clans" className="btn-ghost !py-2.5 text-xs text-center">🛡 Clans</Link>
              <Link href="/leaderboard" className="btn-ghost !py-2.5 text-xs text-center">🏆 Leaderboard</Link>
              <Link href="/players" className="btn-ghost !py-2.5 text-xs text-center">👥 Players</Link>
            </div>
          </div>
          <div className="card p-5">
            <div className="text-xs font-extrabold tracking-widest text-[#00a8ff] mb-3 uppercase">Your Rank</div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-black neon-text">LV {level}</div>
                <div className="text-mute text-xs mt-1">{xp} XP total</div>
              </div>
              <Link href={`/${username}`} className="btn-neon !py-2 text-xs">{username} →</Link>
            </div>
          </div>
          <div className="card p-5 text-xs text-mute leading-relaxed">
            <div className="font-extrabold text-[#7cc9ff] mb-2">GAMER ID</div>
            Your Gaming Identity. — پروفایل، Achievement، کلن و کلیپ‌هات رو یکجا بساز.
            <div className="mt-3 flex gap-3">
              <Link href="/settings" className="hover:text-white">Settings</Link>
              <Link href="/explore" className="hover:text-white">Explore</Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
