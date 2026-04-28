'use client';

import { Search, Clock, PlayCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { ClassificationJob, CategoryStatus } from '@/features/classification/types/classification.types';
import { StatusBadge } from './status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const FILTER_OPTIONS: { value: 'all' | CategoryStatus; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'uncategorized', label: 'Belum Diklasifikasikan' },
  { value: 'SIBI', label: 'SIBI' },
  { value: 'BISINDO', label: 'BISINDO' },
];

type FilterValue = 'all' | CategoryStatus;

interface VideoListProps {
  jobs: ClassificationJob[];
  selectedJobId: string | null;
  filter: FilterValue;
  searchQuery: string;
  onSelectJob: (id: string) => void;
  onFilterChange: (filter: FilterValue) => void;
  onSearchChange: (query: string) => void;
  /** Global progress — always reflects all videos, ignoring filter/page */
  categorisedCount: number;
  totalAll: number;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/**
 * Filterable job list panel (left side of the classification workspace).
 */
export function VideoList({
  jobs,
  selectedJobId,
  filter,
  searchQuery,
  onSelectJob,
  onFilterChange,
  onSearchChange,
  categorisedCount,
  totalAll,
  page,
  totalPages,
  onPageChange,
}: VideoListProps) {
  const progressPct = totalAll > 0 ? (categorisedCount / totalAll) * 100 : 0;

  return (
    <div id="tour-video-list" className="w-1/3 min-w-[320px] bg-white border-r border-gray-200 flex flex-col z-10">
      {/* Progress */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Progress Klasifikasi</span>
          <span className="text-xs font-bold text-teal-700">{categorisedCount}<span className="font-normal text-gray-400">/{totalAll} video</span></span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Filter & Search */}
      <div className="p-4 border-b border-gray-100 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            type="text"
            placeholder="Cari judul video..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 bg-gray-50 border-gray-200"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f.value}
              onClick={() => onFilterChange(f.value)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
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
          {filteredJobs.map((job) => (
            <div
              key={job.job_id}
              onClick={() => onSelectJob(job.job_id)}
              className={cn(
                'p-4 cursor-pointer hover:bg-gray-50 transition-colors flex gap-3 border-l-4',
                selectedJobId === job.job_id
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
                  {selectedJobId === job.job_id && (
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
                      selectedJobId === job.job_id ? 'text-teal-700' : 'text-slate-700',
                    )}
                  >
                    {job.video_title || 'Untitled Video'}
                  </h4>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <StatusBadge status={job.category} />
                  {/* Job status badge for processing state */}
                  {job.status !== 'READY_FOR_ANNOTATION' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-600 border border-blue-200">
                      {job.status}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock size={10} />
                    {new Date(job.created_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {filteredJobs.length === 0 && (
            <div className="p-8 text-center text-gray-400 text-sm">
              Tidak ada video yang cocok dengan filter.
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="border-t border-gray-100 px-4 py-2 flex items-center justify-between bg-white flex-shrink-0">
          <span className="text-xs text-gray-400">
            Hal. {page + 1} dari {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              disabled={page === 0}
              onClick={() => onPageChange(Math.max(0, page - 1))}
              className="h-7 w-7 hover:bg-gray-100 text-gray-600 disabled:opacity-40"
            >
              <ChevronLeft size={14} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled={page >= totalPages - 1}
              onClick={() => onPageChange(page + 1)}
              className="h-7 w-7 hover:bg-gray-100 text-gray-600 disabled:opacity-40"
            >
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
