import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { QueryProvider } from '@/core/providers/query-provider';
import { TourProvider, AppTour } from '@/shared/components/tour';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/features/auth';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Anotasi.ai — SIBI Dataset Platform',
  description:
    'Sistem Informasi terpusat untuk orkestrasi dan kurasi dataset SIBI (Sistem Isyarat Bahasa Indonesia).',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <QueryProvider>
          <TooltipProvider>
            <AuthProvider>
              <TourProvider>
                {children}
                <AppTour />
              </TourProvider>
            </AuthProvider>
          </TooltipProvider>
        </QueryProvider>
        <Toaster />
      </body>
    </html>
  );
}
