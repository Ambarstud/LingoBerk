import type { Metadata, Viewport } from 'next';
import './globals.css';
import { BottomNav } from '@/components/layout/BottomNav';
import { StoreInitializer } from '@/components/layout/StoreInitializer';

export const metadata: Metadata = {
  title: 'LingoBerk',
  description: 'Personal English learning app with YDS focus',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'LingoBerk',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  themeColor: '#2563EB',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var settings = JSON.parse(localStorage.getItem('lingoberk_settings') || '{}');
                if (settings.darkMode) {
                  document.documentElement.classList.add('dark');
                }
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body className="bg-[#FAFAF8] dark:bg-[#1A1A1A] text-[#1A1A1A] dark:text-[#F5F5F5]">
        <StoreInitializer />
        <div className="max-w-[480px] mx-auto min-h-screen pb-20 relative">
          {children}
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
