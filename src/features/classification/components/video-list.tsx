'use client';

import { Search, Clock, PlayCircle } from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { Video, VideoStatus } from '@/features/classification/types/classification.types';
import { StatusBadge } from './status-badge';

const FILTER_OPTIONS = [
  { value: 'all' as const, label: 'Semua' },
  { value: 'uncategorized' as const, label: 'Uncategorized' },
  { value: 'sibi' as const, label: 'SIBI' },
  { value: 'bisindo' as const, label: 'BISINDO' },
];

type FilterValue = 'all' | VideoStatus;

interface VideoListProps {
  videos: Video[];
  selectedVideoId: string | null;
  filter: FilterValue;
  searchQuery: string;
  onSelectVideo: (id: string) => void;
  onFilterChange: (filter: FilterValue) => void;
  onSearchChange: (query: string) => void;
}

/**
 * Filterable video list panel (left side of the classification workspace).
 */
export function VideoList({
  videos,
  selectedVideoId,
  filter,
  searchQuery,
  onSelectVideo,
  onFilterChange,
  onSearchChange,
}: VideoListProps) {
  // Filter videos
  const filteredVideos = videos.filter((v) => {
    const matchesFilter = filter === 'all' || v.status === filter;
    const matchesSearch =
      !searchQuery || v.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div id="tour-video-list" className="w-1/3 min-w-[320px] bg-white border-r border-gray-200 flex flex-col z-10">
      {/* Filter & Search */}
      <div className="p-4 border-b border-gray-100 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Cari judul video..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div className="flex gap-2">
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f.value}
              onClick={() => onFilterChange(f.value)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors',
                filter === f.value
                  ? 'bg-teal-100 text-teal-700'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-gray-100">
          {filteredVideos.map((video) => (
            <div
              key={video.id}
              onClick={() => onSelectVideo(video.id)}
              className={cn(
                'p-4 cursor-pointer hover:bg-gray-50 transition-colors flex gap-3 border-l-4',
                selectedVideoId === video.id
                  ? 'bg-teal-50 border-teal-500 hover:bg-teal-50'
                  : 'border-transparent',
              )}
            >
              {/* Thumbnail */}
              <div className="w-24 h-16 rounded-md flex-shrink-0 overflow-hidden bg-gray-200 relative group">
                <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-400">
                  <PlayCircle size={28} />
                </div>
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 flex items-center justify-center transition-all">
                  {selectedVideoId === video.id && (
                    <PlayCircle className="text-white opacity-80" size={20} />
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <h4
                    className={cn(
                      'text-sm font-semibold truncate pr-2',
                      selectedVideoId === video.id ? 'text-teal-700' : 'text-slate-700',
                    )}
                  >
                    {video.title}
                  </h4>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <StatusBadge status={video.status} />
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock size={10} /> {video.duration}
                  </span>
                  <span>•</span>
                  <span>{video.date}</span>
                </div>
              </div>
            </div>
          ))}

          {filteredVideos.length === 0 && (
            <div className="p-8 text-center text-gray-400 text-sm">
              Tidak ada video yang cocok dengan filter.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
