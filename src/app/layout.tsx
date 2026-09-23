import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import './globals.css';
import { AppProvider } from '@/components/AppProvider';
import { Navbar, BottomNav } from '@/components/Nav';

export const metadata: Metadata = {
  title: { default: 'GAMER ID — Your Gaming Identity', template: '%s · GAMER ID' },
  description:
    'Create your gaming profile, showcase your achievements and find players who play like you. The social platform for gamers.',
  applicationName: 'GAMER ID',
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#05060a',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const lang = jar.get('gid_lang')?.value === 'en' ? 'en' : 'fa';
  const dir = lang === 'fa' ? 'rtl' : 'ltr';

  return (
    <html lang={lang} dir={dir} className="dark">
      <body>
        <AppProvider>
          <Navbar />
          <main className="min-h-[calc(100vh-4rem)] pb-24 md:pb-10">{children}</main>
          <BottomNav />
        </AppProvider>
      </body>
    </html>
  );
}
