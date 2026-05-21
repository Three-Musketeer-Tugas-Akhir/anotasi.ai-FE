'use client';

import { CheckCircle, Loader2, Type, HandMetal, X } from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { ClassificationJob, CategoryStatus } from '@/features/classification/types/classification.types';
import { StatusBadge } from './status-badge';

import { Button } from '@/components/ui/button';

interface CategorizationPanelProps {
  job: ClassificationJob;
  isPending: boolean;
  onCategorize: (category: 'SIBI' | 'BISINDO') => void;
  onReset?: () => void;
}

/**
 * Action panel for selecting SIBI or BISINDO classification.
 * Includes keyboard shortcut hints and a reset button.
 */
export function CategorizationPanel({ job, isPending, onCategorize, onReset }: CategorizationPanelProps) {
  return (
    <div id="tour-categorization-panel" className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 lg:p-5 relative overflow-hidden">
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
      <div className="flex justify-between items-start mb-3 lg:mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Klasifikasi JBI</h2>
          <p className="text-slate-500 text-sm">
            Tonton video di atas, lalu klik tombol <strong>SIBI</strong> atau <strong>BISINDO</strong> sesuai
            tipe bahasa isyarat yang digunakan.
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Status Klasifikasi
          </span>
          <div className="mt-1">
            <StatusBadge status={job.category} />
          </div>
        </div>
      </div>

      {/* Decision Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* SIBI Button */}
        <button
          onClick={() => onCategorize('SIBI')}
          disabled={isPending}
          className={cn(
            'relative group flex items-center p-2 lg:p-3 rounded-xl border-2 transition-all duration-200 text-left hover:shadow-md',
            job.category === 'SIBI'
              ? 'border-teal-500 bg-teal-50 ring-1 ring-teal-500'
              : 'border-gray-200 hover:border-teal-300 hover:bg-teal-50/50',
          )}
        >
          <div
            className={cn(
              'w-10 h-10 lg:w-12 lg:h-12 rounded-lg flex items-center justify-center mr-3 lg:mr-4 transition-colors',
              job.category === 'SIBI'
                ? 'bg-teal-500 text-white'
                : 'bg-gray-100 text-gray-500 group-hover:bg-teal-200 group-hover:text-teal-700',
            )}
          >
            <Type size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-800">SIBI</h3>
              <span className="bg-teal-100 text-teal-600 text-[10px] px-1.5 py-0.5 rounded border border-teal-200">
                Klik untuk pilih
              </span>
            </div>
            <p className="text-[11px] lg:text-xs text-slate-500 mt-0.5 line-clamp-1">
              Tata bahasa baku Indonesia (termasuk imbuhan).
            </p>
          </div>
          {job.category === 'SIBI' && (
            <div className="absolute top-4 right-4 text-teal-500">
              <CheckCircle size={20} />
            </div>
          )}
        </button>

        {/* BISINDO Button */}
        <button
          onClick={() => onCategorize('BISINDO')}
          disabled={isPending}
          className={cn(
            'relative group flex items-center p-2 lg:p-3 rounded-xl border-2 transition-all duration-200 text-left hover:shadow-md',
            job.category === 'BISINDO'
              ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500'
              : 'border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50',
          )}
        >
          <div
            className={cn(
              'w-10 h-10 lg:w-12 lg:h-12 rounded-lg flex items-center justify-center mr-3 lg:mr-4 transition-colors',
              job.category === 'BISINDO'
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-100 text-gray-500 group-hover:bg-emerald-200 group-hover:text-emerald-700',
            )}
          >
            <HandMetal size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-800">BISINDO</h3>
              <span className="bg-emerald-100 text-emerald-600 text-[10px] px-1.5 py-0.5 rounded border border-emerald-200">
                Klik untuk pilih
              </span>
            </div>
            <p className="text-[11px] lg:text-xs text-slate-500 mt-0.5 line-clamp-1">
              Gestur natural, ekspresi wajah, & kalimat sederhana.
            </p>
          </div>
          {job.category === 'BISINDO' && (
            <div className="absolute top-4 right-4 text-emerald-500">
              <CheckCircle size={20} />
            </div>
          )}
        </button>
      </div>

      {/* Reset & Info */}
      <div className="mt-3 lg:mt-4 pt-2 lg:pt-3 border-t border-gray-100 flex justify-between items-center">
        {onReset && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            disabled={isPending}
            className="text-gray-500 hover:text-red-600 hover:bg-red-50 flex items-center gap-1.5"
          >
            <X size={14} /> Reset Status
          </Button>
        )}
        <div className="text-xs text-gray-400">Job ID: {job.job_id}</div>
      </div>
    </div>
  );
}
