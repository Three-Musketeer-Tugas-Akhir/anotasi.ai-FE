'use client';

import React from 'react';
import { X, List, CheckCircle2 } from 'lucide-react';
import type { TranscriptUtterance, UtteranceCorrection } from '../annotation-types';

export type SheetFilter = 'ALL' | 'UNFINISHED' | 'DRAFT';

interface UtteranceSheetProps {
  isOpen: boolean;
  onClose: () => void;
  utterances: UtteranceCorrection[];
  originalUtterances: TranscriptUtterance[];
  activeIndex: number | null;
  onJump: (index: number) => void;
  filter: SheetFilter;
  onFilterChange: (filter: SheetFilter) => void;
}

export function UtteranceSheet({
  isOpen,
  onClose,
  utterances,
  originalUtterances,
  activeIndex,
  onJump,
  filter,
  onFilterChange,
}: UtteranceSheetProps) {
  // Prevent scrolling on body when sheet is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const totalCompleted = utterances.filter((u) => u.status === 'OK').length;
  const totalUtterances = utterances.length;

  const filteredUtterances = utterances.filter((u) => {
    if (filter === 'ALL') return true;
    if (filter === 'UNFINISHED') return u.status !== 'OK';
    if (filter === 'DRAFT') return u.status === 'DRAFT';
    return true;
  });

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sheet Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-[450px] bg-white shadow-[-10px_0_30px_rgba(0,0,0,0.1)] z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <List size={20} className="text-teal-600" /> Daftar Kalimat
            </h2>
            <p className="text-sm text-slate-500 mt-1">Pilih kalimat untuk langsung melompat (Jump)</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Sheet Filters */}
        <div className="px-5 py-3 border-b border-slate-100 bg-white flex gap-2">
          <button
            onClick={() => onFilterChange('ALL')}
            className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-colors ${
              filter === 'ALL'
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
            }`}
          >
            Semua ({totalUtterances})
          </button>
          <button
            onClick={() => onFilterChange('UNFINISHED')}
            className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-colors ${
              filter === 'UNFINISHED'
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
            }`}
          >
            Belum Selesai ({totalUtterances - totalCompleted})
          </button>
          <button
            onClick={() => onFilterChange('DRAFT')}
            className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-colors ${
              filter === 'DRAFT'
                ? 'bg-amber-100 text-amber-700 border-amber-300'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
            }`}
          >
            Draft
          </button>
        </div>

        {/* List of Utterances */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50">
          {filteredUtterances.map((u) => {
            const globalIndex = utterances.indexOf(u);
            const original = originalUtterances.find(
              (o) => o.segment_id === u.segment_id && o.utterance_index === u.utterance_index
            );
            const gtText = original?.text || u.text || '(tidak ada teks)';
            // Show a 1-based sequential number across all utterances (globalIndex + 1)
            // so it matches "Kalimat N" in the main panel
            const displayNumber = globalIndex + 1;
            
            return (
              <button
                key={`${u.segment_id}-${u.utterance_index}`}
                onClick={() => {
                  onJump(globalIndex);
                  onClose();
                }}
                className={`w-full text-left p-3 rounded-xl border flex gap-3 transition-all ${
                  activeIndex === globalIndex
                    ? 'bg-teal-50 border-teal-300 shadow-[0_0_0_2px_rgba(20,184,166,0.2)]'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                {/* Status Indicator inside Card */}
                <div className="flex flex-col items-center gap-1 mt-0.5">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                      u.status === 'OK'
                        ? 'bg-teal-100 text-teal-700'
                        : u.status === 'DRAFT'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                     {displayNumber}
                  </div>
                  {u.status === 'OK' && <CheckCircle2 size={14} className="text-teal-600" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-mono text-slate-400 font-semibold">
                      {(u.global_start ?? u.start).toFixed(1)}s - {(u.global_end ?? u.end).toFixed(1)}s
                    </span>
                    {u.status === 'DRAFT' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-700 rounded">
                        DRAFT
                      </span>
                    )}
                    {activeIndex === globalIndex && (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-teal-600 text-white rounded">
                        POSISI SAAT INI
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-sm line-clamp-2 ${
                      u.status === 'OK' ? 'text-slate-400' : 'text-slate-700 font-medium'
                    }`}
                  >
                    {gtText}
                  </p>
                </div>
              </button>
            );
          })}
          {filteredUtterances.length === 0 && (
            <div className="text-center py-10 text-slate-400 text-sm font-medium">
              Tidak ada kalimat yang sesuai filter.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
