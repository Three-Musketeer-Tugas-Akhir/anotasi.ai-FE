import { useEffect, useState } from 'react';
import { ClassificationJob } from '@/features/classification/types/classification.types';
import { ZoomIn, ZoomOut } from 'lucide-react';

interface VideoPlayerProps {
  job: ClassificationJob;
}

/**
 * Native HTML5 Video Player for the Classification page.
 *
 * Uses the original_video_url provided by the backend API.
 * The backend has disabled authorization for this endpoint.
 *
 * Features a Zoom JBI button for detailed sign language inspection.
 */
export function VideoPlayer({ job }: VideoPlayerProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Use original_video_url directly from the backend response.
  // #t=0,60 restricts playback to 1 minute max for large files.
  const videoUrl = isMounted && job.original_video_url
    ? `${job.original_video_url}#t=0,60`
    : null;

  return (
    <div id="tour-video-player">
      {/* HTML5 Video Player Container */}
      <div className="bg-black rounded-xl overflow-hidden shadow-lg aspect-video max-h-[40vh] md:max-h-[45vh] lg:max-h-[50vh] relative z-0 flex items-center justify-center group">

        {videoUrl ? (
          <video
            key={job.job_id}
            src={videoUrl}
            controls
            controlsList="nodownload"
            preload="auto"
            className={`absolute inset-0 w-full h-full transition-transform duration-500 ease-in-out ${isZoomed
              ? 'object-cover origin-[100%_70%] scale-[4]'
              : 'object-contain object-center'
              }`}
          >
            Browser Anda tidak mendukung elemen video.
          </video>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            <span className="text-sm">Video tidak tersedia</span>
          </div>
        )}

        {/* Zoom Toggle feature for JBI detection */}
        <button
          onClick={() => setIsZoomed(!isZoomed)}
          className={`absolute top-4 right-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium shadow-md transition-all ${isZoomed
            ? 'bg-teal-600/90 text-white hover:bg-teal-500'
            : 'bg-black/60 text-white backdrop-blur-sm hover:bg-black/80'
            }`}
          title="Zoom ke arah Juru Bahasa Isyarat"
        >
          {isZoomed ? (
            <>
              <ZoomOut size={16} />
              Reset Zoom
            </>
          ) : (
            <>
              <ZoomIn size={16} />
              Zoom JBI
            </>
          )}
        </button>
      </div>

      {/* Progress */}
      {job.progress && job.status !== 'READY_FOR_ANNOTATION' && job.status !== 'COMPLETED' && (
        <div className="flex justify-end mt-2 px-1">
          <div className="w-48 text-right">
            <p className="text-xs text-slate-500 mb-1">
              Pemrosesan: {job.progress.phase} ({job.progress.percent.toFixed(0)}%)
            </p>
            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden w-full flex justify-end">
              <div
                className="h-full bg-teal-500 rounded-full transition-all"
                style={{ width: `${job.progress.percent}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
