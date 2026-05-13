'use client';

import { FileUploadBanner } from './file-upload-banner';
import { YTDownloadBanner } from './youtube-download-banner';

export function DownloadUploadContainer() {
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
