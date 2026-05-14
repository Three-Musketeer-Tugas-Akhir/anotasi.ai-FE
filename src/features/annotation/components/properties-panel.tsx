'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Shield,
  Clock,
  FileText,
  CheckCircle2,
  Save,
  RotateCcw,
  Undo2,
  Loader2,
  AlertTriangle,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import type { TranscriptUtterance, UtteranceCorrection } from '../annotation-types';

interface PropertiesPanelProps {
  originalUtterances: TranscriptUtterance[];
  utteranceEdits: UtteranceCorrection[];
  onUtteranceChange: (index: number, updates: Partial<UtteranceCorrection>) => void;
  activeUtteranceIndex: number | null;
  onSelectUtterance: (index: number) => void;
  onSaveDraft: () => Promise<void>;
  onMarkOk: (index: number) => Promise<void>;
  onRevert: (index: number) => Promise<void>;
  onReset: () => Promise<void>;
  isSaving: boolean;
  reviewStatus: string | null;
  reviewFeedback: string | null;
}

function formatTs(s: number | null): string {
  if (s === null || s === undefined) return '--:--';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.round((s % 1) * 100);
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

function getConfidenceBadge(score: number | null | undefined): { label: string; className: string } {
  if (score === null || score === undefined) return { label: 'N/A', className: 'bg-slate-100 text-slate-500 border-slate-200' };
  if (score >= 0.9) return { label: `${Math.round(score * 100)}%`, className: 'bg-teal-50 text-teal-700 border-teal-200' };
  if (score >= 0.5) return { label: `${Math.round(score * 100)}%`, className: 'bg-amber-50 text-amber-700 border-amber-200' };
  return { label: `${Math.round(score * 100)}%`, className: 'bg-red-50 text-red-700 border-red-200' };
}

function getReviewBadge(status: string | null): { label: string; className: string } | null {
  if (!status || status === 'NOT_SUBMITTED') return null;
  switch (status) {
    case 'SUBMITTED':
    case 'PENDING':
      return { label: 'Menunggu Review', className: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'APPROVED':
      return { label: 'Disetujui ✓', className: 'bg-teal-50 text-teal-700 border-teal-200' };
    case 'REJECTED':
      return { label: 'Perlu Revisi', className: 'bg-red-50 text-red-700 border-red-200' };
    default:
      return null;
  }
}

export function PropertiesPanel({
  originalUtterances,
  utteranceEdits,
  onUtteranceChange,
  activeUtteranceIndex,
  onSelectUtterance,
  onSaveDraft,
  onMarkOk,
  onRevert,
  onReset,
  isSaving,
  reviewStatus,
  reviewFeedback,
}: PropertiesPanelProps) {
  const [resetting, setResetting] = useState(false);
  const [reverting, setReverting] = useState(false);

  const reviewBadge = getReviewBadge(reviewStatus);
  const isPendingReview = reviewStatus === 'SUBMITTED' || reviewStatus === 'PENDING';
  const isReviewed = reviewStatus === 'APPROVED' || reviewStatus === 'REJECTED';
  const actionsDisabled = isPendingReview || isReviewed;

  const activeEdit: UtteranceCorrection | null =
    activeUtteranceIndex !== null && activeUtteranceIndex < utteranceEdits.length
      ? utteranceEdits[activeUtteranceIndex]
      : null;

  // Look up original by segment_id + utterance_index to avoid cross-segment position mismatch
  const activeOriginal: TranscriptUtterance | null = activeEdit
    ? originalUtterances.find(
        (o) => o.segment_id === activeEdit.segment_id && o.utterance_index === activeEdit.utterance_index
      ) ?? null
    : null;

  const handleReset = async () => {
    if (!confirm('Reset semua edit? Data akan kembali ke ASR original.')) return;
    setResetting(true);
    try { await onReset(); } finally { setResetting(false); }
  };

  const confBadge = activeEdit ? getConfidenceBadge(activeEdit.confidence) : null;

  return (
    <div className="w-full h-full bg-white flex flex-col z-20">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 flex-shrink-0">
        <div>
          {activeUtteranceIndex !== null ? (
            <h2 className="text-xl font-bold text-slate-800">
              Anotasi Kalimat {activeUtteranceIndex + 1}
            </h2>
          ) : (
            <h2 className="text-xl font-bold text-slate-800">Tidak ada kalimat dipilih</h2>
          )}
          
          {activeEdit && (
            <div className="flex items-center gap-2 text-sm mt-1">
              <Clock size={14} className="text-slate-400" />
              <span className="font-mono text-slate-600 font-semibold">
                {activeEdit.start.toFixed(1)}s - {activeEdit.end.toFixed(1)}s
              </span>
            </div>
          )}
        </div>

        {activeEdit ? (
          activeEdit.status === 'OK' ? (
            <span className="px-3 py-1 bg-teal-100 text-teal-700 font-bold text-xs rounded border border-teal-200 flex items-center gap-1">
              <CheckCircle2 size={14} /> SELESAI
            </span>
          ) : activeEdit.status === 'DRAFT' ? (
            <span className="px-3 py-1 bg-amber-100 text-amber-700 font-bold text-xs rounded border border-amber-200">
              DRAFT
            </span>
          ) : (
            <span className="px-3 py-1 bg-slate-100 text-slate-600 font-bold text-xs rounded border border-slate-200">
              BELUM DIKERJAKAN
            </span>
          )
        ) : null}
      </div>

      {reviewBadge && (
        <div className="px-5 py-2 bg-amber-50 border-b border-amber-100 flex flex-col">
          <Badge variant="outline" className={`w-fit text-[11px] ${reviewBadge.className}`}>
            {reviewBadge.label}
          </Badge>
          {reviewFeedback && reviewStatus === 'REJECTED' && (
            <span className="text-[11px] text-red-500 mt-1">
              Feedback: {reviewFeedback}
            </span>
          )}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-6">
        {activeEdit ? (
          <>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <FileText size={16} /> 1. Baca Teks Ini (GT)
                </label>
                {confBadge && (
                  <Badge variant="outline" className={`text-[11px] px-1.5 py-0.5 ${confBadge.className}`}>
                    <Shield size={10} className="mr-1" />
                    ASR: {confBadge.label}
                  </Badge>
                )}
              </div>
              <div className="bg-slate-100 rounded-xl p-4 border border-slate-200 relative mt-2">
                <div className="absolute -top-3 -left-2 text-4xl text-slate-300 font-serif leading-none">"</div>
                <p className="text-slate-800 text-lg leading-relaxed relative z-10">
                  {activeOriginal?.text || '(tidak ada teks)'}
                </p>
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> Pastikan gerakan di video mencakup teks di atas.
              </p>
            </div>

            <div className="w-full h-px bg-slate-100" />

            <div className="flex flex-col gap-2 flex-1 min-h-[200px]">
              <label className="text-sm font-bold text-teal-700 uppercase tracking-wider flex items-center gap-2">
                <FileText size={16} /> 2. Ketik Notasi Glosa
              </label>
              <Textarea
                value={activeEdit.text}
                onChange={(e) => onUtteranceChange(activeUtteranceIndex!, { text: e.target.value })}
                placeholder="Ketik hasil terjemahan bahasa isyarat di sini..."
                disabled={actionsDisabled}
                className={`flex-1 w-full p-4 text-lg border-2 rounded-xl resize-none outline-none transition-shadow ${
                  actionsDisabled
                    ? 'bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed'
                    : 'bg-white border-teal-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20 shadow-inner'
                }`}
              />
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400">
            <div className="text-center">
              <AlertTriangle size={24} className="mx-auto mb-2 opacity-40" />
              <p className="text-xs font-medium">Pilih kalimat dari panel daftar kalimat</p>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons (Footer) */}
      {activeEdit && (
        <div className="p-5 bg-white border-t border-slate-200 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)] flex-shrink-0">
          {/* IMPROVEMENT 1: Show revert button for OK utterances */}
          {activeEdit.status === 'OK' && !actionsDisabled && (
            <div className="mb-3">
              <button
                onClick={async () => {
                  if (!confirm('Kembalikan kalimat ini ke kondisi sebelum di-trim?')) return;
                  setReverting(true);
                  try { await onRevert(activeUtteranceIndex!); } finally { setReverting(false); }
                }}
                disabled={reverting || isSaving}
                className="w-full py-3 rounded-xl font-bold text-amber-700 bg-amber-50 border-2 border-amber-200 hover:bg-amber-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {reverting ? <Loader2 size={18} className="animate-spin" /> : <Undo2 size={18} />}
                Ubah Kembali (Undo Trim)
              </button>
              <p className="text-center text-xs text-slate-400 mt-1.5">
                Mengembalikan batas waktu ke kondisi sebelum kalimat ini di-trim.
              </p>
            </div>
          )}
          {/* Tugas tambahan: Annotator bisa revisi meskipun sudah OK (human error) */}
          <div className="flex gap-3">
            <button
              onClick={onSaveDraft}
              disabled={actionsDisabled || isSaving}
              className="px-6 py-4 rounded-xl font-bold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors flex flex-col items-center justify-center gap-1 disabled:opacity-50"
              title="Simpan sementara jika belum yakin"
            >
              {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
              <span className="text-[10px] uppercase">Draft</span>
            </button>
            
            <button
              onClick={() => onMarkOk(activeUtteranceIndex!)}
              disabled={actionsDisabled || isSaving}
              className="flex-1 py-4 rounded-xl font-bold text-white bg-teal-600 hover:bg-teal-500 active:bg-teal-700 transition-all shadow-[0_4px_14px_0_rgba(13,148,136,0.39)] hover:shadow-[0_6px_20px_rgba(13,148,136,0.23)] flex flex-col items-center justify-center disabled:opacity-50"
            >
              <div className="flex items-center gap-2 text-lg">
                {isSaving ? <Loader2 size={24} className="animate-spin" /> : <CheckCircle2 size={24} />} 
                SIMPAN & LANJUT
              </div>
            </button>
          </div>
          {activeEdit.status !== 'OK' && !actionsDisabled && (
            <p className="text-center text-xs text-slate-400 mt-3 font-medium">
              Tombol "Simpan & Lanjut" akan otomatis membawa Anda ke kalimat berikutnya.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
