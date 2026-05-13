import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { QueryProvider } from '@/core/providers/query-provider';
import { TourProvider, AppTour } from '@/shared/components/tour';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/features/auth';
import { DatasetProvider } from '@/features/dataset';
import { Toaster } from '@/components/ui/sonner';
import { YoutubeDownloadProvider } from '@/features/classification/context/youtube-download-context';
import { FileUploadProvider } from '@/features/classification/context/file-upload-context';
import { DownloadUploadContainer } from '@/features/classification/components/download-upload-container';
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
              <DatasetProvider>
                <YoutubeDownloadProvider>
                  <FileUploadProvider>
                    <TourProvider>
                      {children}
                      <AppTour />
                      <DownloadUploadContainer />
                    </TourProvider>
                  </FileUploadProvider>
                </YoutubeDownloadProvider>
              </DatasetProvider>
            </AuthProvider>
          </TooltipProvider>
        </QueryProvider>
        <Toaster />
      </body>
    </html>
  );
}
