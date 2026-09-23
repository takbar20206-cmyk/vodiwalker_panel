'use client';
import Link from 'next/link';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GAMER-ID error]', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 hero-glow opacity-50" />
      <div className="relative text-center fade-in max-w-md">
        <div className="text-7xl sm:text-8xl font-black text-[#ff2e63]" style={{ textShadow: '0 0 40px rgba(255,46,99,0.4)' }}>
          500
        </div>
        <div className="text-xl font-bold mt-4">Something broke in the matrix.</div>
        <p className="text-mute mt-2 text-sm">
          خطای سرور رخ داد. لحظه‌ای دیگر دوباره تلاش کن — یا به خانه برگرد.
        </p>
        <div className="flex gap-3 justify-center mt-8">
          <button onClick={reset} className="btn-neon">⟳ Retry</button>
          <Link href="/" className="btn-ghost">← Home</Link>
        </div>
        {error.digest && <div className="text-xs text-mute mt-6 font-mono">digest: {error.digest}</div>}
      </div>
    </div>
  );
}
