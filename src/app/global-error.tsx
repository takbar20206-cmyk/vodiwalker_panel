'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ background: '#05060a', color: '#e8ecf6', fontFamily: 'system-ui, sans-serif', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 480, padding: 24 }}>
          <div style={{ fontSize: 84, fontWeight: 900, color: '#ff2e63' }}>500</div>
          <h1 style={{ fontSize: 20, marginTop: 8 }}>GAMER ID — Server Error</h1>
          <p style={{ color: '#8b93a7', fontSize: 14, marginTop: 8 }}>
            خطای سرور رخ داد. دوباره تلاش کن.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 24,
              background: 'linear-gradient(135deg,#00a8ff,#4d5cff)',
              color: '#fff',
              border: 0,
              borderRadius: 12,
              padding: '12px 28px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ⟳ Retry
          </button>
        </div>
      </body>
    </html>
  );
}
