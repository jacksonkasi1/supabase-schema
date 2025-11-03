import type { Metadata } from 'next';
import './globals.css';
import { RootProvider } from '@/components/RootProvider';
import { ThemeProvider } from '@/components/theme-provider';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://supabase-schema.vercel.app'),
  title: 'Supabase Schema',
  description: 'Visualize your Supabase database schema',
  openGraph: {
    title: 'Supabase Schema',
    description: 'Visualize your Supabase database schema',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider defaultTheme="light" storageKey="theme">
          <RootProvider>
            <main className="w-screen h-screen relative bg-background text-foreground overflow-hidden">
              {children}
            </main>
          </RootProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
