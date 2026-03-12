'use client';

import { ExternalLink } from 'lucide-react';
import { Video } from '@/features/classification/types/classification.types';

interface VideoPlayerProps {
  video: Video;
}

/**
 * Native HTML5 Video Player for MinIO/Storage URLs.
 */
export function VideoPlayer({ video }: VideoPlayerProps) {
  return (
    <div id="tour-video-player">
      {/* HTML5 Video Player */}
      <div className="bg-black rounded-xl overflow-hidden shadow-lg aspect-video relative mb-3 z-0">
        <video
          key={video.id} // forces reload when video changes
          src={video.videoUrl}
          controls
          controlsList="nodownload"
          className="absolute inset-0 w-full h-full"
        >
          Browser Anda tidak mendukung elemen video.
        </video>
      </div>

      {/* Helper */}
      <div className="flex justify-between items-center mb-6 px-1">
        <p className="text-xs text-slate-400">
          Putar video untuk memeriksa apakah menggunakan SIBI atau BISINDO.
        </p>
      </div>
    </div>
  );
}
