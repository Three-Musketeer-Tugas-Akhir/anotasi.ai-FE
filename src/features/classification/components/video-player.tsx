'use client';

import { ExternalLink } from 'lucide-react';
import { Video } from '@/features/classification/types/classification.types';

interface VideoPlayerProps {
  video: Video;
}

/**
 * YouTube video embed player with external link fallback.
 */
export function VideoPlayer({ video }: VideoPlayerProps) {
  return (
    <div>
      {/* YouTube Player Embed */}
      <div className="bg-black rounded-xl overflow-hidden shadow-lg aspect-video relative mb-3 z-0">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=0&rel=0&modestbranding=1`}
          title={video.title}
          className="absolute inset-0 w-full h-full"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>

      {/* Fallback & Helper Link */}
      <div className="flex justify-between items-center mb-6 px-1">
        <p className="text-xs text-slate-400">
          Jika player error, kemungkinan video dibatasi oleh pemilik (Copyright).
        </p>
        <a
          href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors"
        >
          <ExternalLink size={12} />
          Tonton langsung di YouTube
        </a>
      </div>
    </div>
  );
}
