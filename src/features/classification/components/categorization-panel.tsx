'use client';

import { CheckCircle, Loader2, Type, HandMetal, X } from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { Video, VideoStatus } from '@/features/classification/types/classification.types';
import { StatusBadge } from './status-badge';

interface CategorizationPanelProps {
  video: Video;
  isPending: boolean;
  onCategorize: (status: VideoStatus) => void;
}

/**
 * Action panel for selecting SIBI or BISINDO classification.
 * Includes keyboard shortcut hints and a reset button.
 */
export function CategorizationPanel({ video, isPending, onCategorize }: CategorizationPanelProps) {
  return (
    <div id="tour-categorization-panel" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative overflow-hidden">
      {/* Loading overlay */}
      {isPending && (
        <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center backdrop-blur-[1px]">
          <div className="flex items-center gap-2 text-teal-600 font-medium bg-white px-4 py-2 rounded-full shadow-lg border border-teal-100">
            <Loader2 className="animate-spin" size={18} />
            Menyimpan...
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Kategorisasi JBI</h2>
          <p className="text-slate-500 text-sm">
            Tonton video di atas. Tekan <strong>1</strong> untuk SIBI, <strong>2</strong> untuk
            BISINDO.
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Status Saat Ini
          </span>
          <div className="mt-1">
            <StatusBadge status={video.status} />
          </div>
        </div>
      </div>

      {/* Decision Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* SIBI Button */}
        <button
          onClick={() => onCategorize('sibi')}
          disabled={isPending}
          className={cn(
            'relative group flex items-center p-4 rounded-xl border-2 transition-all duration-200 text-left hover:shadow-md',
            video.status === 'sibi'
              ? 'border-teal-500 bg-teal-50 ring-1 ring-teal-500'
              : 'border-gray-200 hover:border-teal-300 hover:bg-teal-50/50',
          )}
        >
          <div
            className={cn(
              'w-12 h-12 rounded-lg flex items-center justify-center mr-4 transition-colors',
              video.status === 'sibi'
                ? 'bg-teal-500 text-white'
                : 'bg-gray-100 text-gray-500 group-hover:bg-teal-200 group-hover:text-teal-700',
            )}
          >
            <Type size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-800">SIBI</h3>
              <span className="bg-gray-100 text-gray-500 text-[10px] px-1.5 py-0.5 rounded border border-gray-200">
                Tekan 1
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Struktur lisan (S-P-O-K). Biasanya digunakan di TVRI/Berita Formal.
            </p>
          </div>
          {video.status === 'sibi' && (
            <div className="absolute top-4 right-4 text-teal-500">
              <CheckCircle size={20} />
            </div>
          )}
        </button>

        {/* BISINDO Button */}
        <button
          onClick={() => onCategorize('bisindo')}
          disabled={isPending}
          className={cn(
            'relative group flex items-center p-4 rounded-xl border-2 transition-all duration-200 text-left hover:shadow-md',
            video.status === 'bisindo'
              ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500'
              : 'border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50',
          )}
        >
          <div
            className={cn(
              'w-12 h-12 rounded-lg flex items-center justify-center mr-4 transition-colors',
              video.status === 'bisindo'
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-100 text-gray-500 group-hover:bg-emerald-200 group-hover:text-emerald-700',
            )}
          >
            <HandMetal size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-800">BISINDO</h3>
              <span className="bg-gray-100 text-gray-500 text-[10px] px-1.5 py-0.5 rounded border border-gray-200">
                Tekan 2
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Bahasa alami (Visual Spasial). Ekspresif, sering tanpa imbuhan.
            </p>
          </div>
          {video.status === 'bisindo' && (
            <div className="absolute top-4 right-4 text-emerald-500">
              <CheckCircle size={20} />
            </div>
          )}
        </button>
      </div>

      {/* Reset & Info */}
      <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center">
        <button
          onClick={() => onCategorize('uncategorized')}
          disabled={isPending}
          className="text-sm text-gray-500 hover:text-red-500 flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
        >
          <X size={14} /> Reset Status
        </button>
        <div className="text-xs text-gray-400">Video ID: {video.youtubeId}</div>
      </div>
    </div>
  );
}
