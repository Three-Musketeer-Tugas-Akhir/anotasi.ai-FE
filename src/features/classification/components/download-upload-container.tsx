'use client';

import { FileUploadBanner } from './file-upload-banner';
import { YTDownloadBanner } from './youtube-download-banner';
import { useAuth } from '@/features/auth';

export function DownloadUploadContainer() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3 pointer-events-none">
      <div className="pointer-events-auto">
        <YTDownloadBanner />
      </div>
      <div className="pointer-events-auto">
        <FileUploadBanner />
      </div>
    </div>
  );
}
