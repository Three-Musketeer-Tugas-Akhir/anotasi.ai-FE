'use client';

import { ClassificationJob } from '@/features/classification/types/classification.types';

interface VideoPlayerProps {
  job: ClassificationJob;
}

/**
 * Native HTML5 Video Player.
 *
 * For completed jobs (READY_FOR_ANNOTATION) we use the first segment's download URL.
 * For other jobs we show a placeholder since the original video isn't exposed via API.
 *
 * NOTE: When jbi-service adds a dedicated video streaming/presigned URL endpoint,
 * simply update the URL construction below.
 */
export function VideoPlayer({ job }: VideoPlayerProps) {
  // Build video URL — use segment download if job is ready, otherwise no video
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://152.118.31.36:8000/api/v1';
  const isReady = job.status === 'READY_FOR_ANNOTATION';
  const videoUrl = isReady ? `${apiBase}/jobs/${job.job_id}/segments/0/download` : null;

  return (
    <div id="tour-video-player">
      {/* HTML5 Video Player */}
      <div className="bg-black rounded-xl overflow-hidden shadow-lg aspect-video relative mb-3 z-0">
        {videoUrl ? (
          <video
            key={job.job_id}
            src={videoUrl}
            controls
            controlsList="nodownload"
            className="absolute inset-0 w-full h-full"
          >
            Browser Anda tidak mendukung elemen video.
          </video>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            <span className="text-sm">
              {job.status === 'FAILED'
                ? 'Video gagal diproses'
                : job.status === 'CANCELLED'
                  ? 'Job dibatalkan'
                  : 'Video sedang diproses...'}
            </span>
            {job.progress && (
              <div className="w-48 mt-1">
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-500 rounded-full transition-all"
                    style={{ width: `${job.progress.percent}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1 text-center">
                  {job.progress.phase} — {job.progress.percent.toFixed(0)}%
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Helper */}
      <div className="flex justify-between items-center mb-6 px-1">
        <p className="text-xs text-slate-400">
          {isReady
            ? 'Putar video untuk memeriksa apakah menggunakan SIBI atau BISINDO.'
            : 'Video preview tersedia setelah pemrosesan selesai.'}
        </p>
      </div>
    </div>
  );
}
