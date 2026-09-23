'use client';
import { useApp } from './AppProvider';

const FEATS = [
  { icon: '🎮', titleKey: 'feat_profile_title', descKey: 'feat_profile_desc', href: '/register' },
  { icon: '🏆', titleKey: 'feat_ach_title', descKey: 'feat_ach_desc', href: '/leaderboard' },
  { icon: '🛡️', titleKey: 'feat_clan_title', descKey: 'feat_clan_desc', href: '/clans' },
  { icon: '🎬', titleKey: 'feat_clip_title', descKey: 'feat_clip_desc', href: '/explore' },
  { icon: '📈', titleKey: 'feat_lb_title', descKey: 'feat_lb_desc', href: '/leaderboard' },
  { icon: '⚡', titleKey: 'feat_challenge_title', descKey: 'feat_challenge_desc', href: '/challenges' },
];

export function FeaturesSection({ feats }: { feats?: unknown }) {
  const { t } = useApp();
  return (
    <section className="max-w-7xl mx-auto px-4 py-16">
      <div className="text-center mb-10">
        <div className="text-xs font-black tracking-[0.3em] text-[#00a8ff] mb-3">PLATFORM</div>
        <h2 className="text-2xl sm:text-4xl font-black">
          Everything for your <span className="neon-text">gaming identity</span>
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {FEATS.map((f) => (
          <a key={f.titleKey} href={f.href} className="card card-hover p-6 block group">
            <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-200">{f.icon}</div>
            <div className="font-extrabold text-lg mb-1.5">{t(f.titleKey)}</div>
            <div className="text-mute text-sm leading-relaxed">{t(f.descKey)}</div>
          </a>
        ))}
      </div>
    </section>
  );
}
