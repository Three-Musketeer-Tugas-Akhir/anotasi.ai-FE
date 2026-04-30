'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Shield,
  Clock,
  FileText,
  Volume2,
  CheckCircle2,
  Save,
  Send,
  RotateCcw,
  Loader2,
  AlertTriangle,
  Crosshair,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type {
  SegmentDetailResponse,
  TranscriptUtterance,
  UtteranceCorrection,
} from '../annotation-types';

// ── Types ──────────────────────────────────────────────────────────

interface PropertiesPanelProps {
  segment: SegmentDetailResponse;
  utteranceEdits: UtteranceCorrection[];
  onUtteranceChange: (index: number, updates: Partial<UtteranceCorrection>) => void;
  activeUtteranceIndex: number | null;
  onSelectUtterance: (index: number) => void;
  // Action bar props (merged)
  onSaveDraft: () => Promise<void>;
  onMarkOk: (index: number) => Promise<void>;
  onSubmit: () => Promise<void>;
  onReset: () => Promise<void>;
  isSaving: boolean;
  canSubmit: boolean;
  submitWarning: string | null;
  reviewStatus: string | null;
  reviewFeedback: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────

function formatTs(s: number | null): string {
  if (s === null || s === undefined) return '--:--';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.round((s % 1) * 100);
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

function getConfidenceBadge(score: number | null): { label: string; className: string } {
  if (score === null) return { label: 'N/A', className: 'bg-gray-100 text-gray-500 border-gray-200' };
  if (score >= 0.9) return { label: `${Math.round(score * 100)}%`, className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
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
      return { label: 'Disetujui ✓', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'REJECTED':
      return { label: 'Perlu Revisi', className: 'bg-red-50 text-red-700 border-red-200' };
    default:
      return null;
  }
}

// ── Component ──────────────────────────────────────────────────────

export function PropertiesPanel({
  segment,
  utteranceEdits,
  onUtteranceChange,
  activeUtteranceIndex,
  onSelectUtterance,
  onSaveDraft,
  onMarkOk,
  onSubmit,
  onReset,
  isSaving,
  canSubmit,
  submitWarning,
  reviewStatus,
  reviewFeedback,
}: PropertiesPanelProps) {
  const [resetting, setResetting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const reviewBadge = getReviewBadge(reviewStatus);
  const isPendingReview = reviewStatus === 'SUBMITTED' || reviewStatus === 'PENDING';
  const isReviewed = reviewStatus === 'APPROVED' || reviewStatus === 'REJECTED';
  const actionsDisabled = isPendingReview || isReviewed;

  // ── Pagination for progress dots ─────────────────────────────
  const PAGE_SIZE = 15;
  const totalPages = Math.ceil(segment.transcripts.length / PAGE_SIZE);
  const [dotPage, setDotPage] = useState(0);

  useEffect(() => {
    if (activeUtteranceIndex !== null) {
      setDotPage(Math.floor(activeUtteranceIndex / PAGE_SIZE));
    }
  }, [activeUtteranceIndex]);

  const pagedTranscripts = useMemo(() => {
    const start = dotPage * PAGE_SIZE;
    return segment.transcripts.slice(start, start + PAGE_SIZE).map((t, i) => ({
      t,
      idx: start + i,
    }));
  }, [dotPage, segment.transcripts]);


  // Get active utterance data
  const activeTranscript: TranscriptUtterance | null =
    activeUtteranceIndex !== null && activeUtteranceIndex < segment.transcripts.length
      ? segment.transcripts[activeUtteranceIndex]
      : null;

  const activeEdit: UtteranceCorrection | null =
    activeUtteranceIndex !== null && activeUtteranceIndex < utteranceEdits.length
      ? utteranceEdits[activeUtteranceIndex]
      : null;

  const isModified = activeTranscript && activeEdit
    ? (activeEdit.text !== activeTranscript.text || activeEdit.start !== activeTranscript.start || activeEdit.end !== activeTranscript.end)
    : false;

  // Count edited utterances
  const editedCount = segment.transcripts.reduce((count, t, idx) => {
    const edit = utteranceEdits[idx];
    if (!edit) return count;
    return count + (edit.text !== t.text || edit.start !== t.start || edit.end !== t.end ? 1 : 0);
  }, 0);

  // Handlers
  const handleReset = async () => {
    if (!confirm('Reset semua edit? Data akan kembali ke ASR original.')) return;
    setResetting(true);
    try { await onReset(); } finally { setResetting(false); }
  };

  const handleSubmit = async () => {
    if (submitWarning && !confirm(submitWarning + '\n\nLanjutkan submit?')) return;
    if (!confirm('Submit anotasi untuk review oleh kurator?')) return;
    setSubmitting(true);
    try { await onSubmit(); } finally { setSubmitting(false); }
  };

  const confBadge = activeTranscript ? getConfidenceBadge(activeTranscript.confidence) : null;

  return (
    <Card className="border-gray-200 shadow-sm bg-white flex flex-col h-full overflow-hidden">
      {/* ── Progress bar + dots ── */}
      <div className="px-4 pt-3 pb-2 border-b border-gray-100 bg-gray-50/80 flex-shrink-0">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-gray-600 font-medium flex items-center gap-1.5">
            <FileText size={12} className="text-teal-600" />
            Anda telah mengerjakan
          </span>
          <span className="font-semibold text-teal-700">
            {editedCount} / {segment.transcripts.length} total video
          </span>
        </div>

        {/* Progress dots — paginated, clickable */}
        <div className="flex items-center gap-1.5">
          {/* Prev page */}
          <button
            onClick={() => setDotPage((p) => Math.max(0, p - 1))}
            disabled={dotPage === 0}
            className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-teal-600 hover:bg-teal-50 disabled:opacity-30 transition-colors flex-shrink-0"
            title="Halaman sebelumnya"
          >
            <ChevronLeft size={12} />
          </button>

          {/* Dots for current page */}
          <div className="flex gap-1 flex-1">
            {pagedTranscripts.map(({ t, idx }) => {
              const edit = utteranceEdits[idx];
              const modified = edit && (edit.text !== t.text || edit.start !== t.start || edit.end !== t.end);
              const isActive = idx === activeUtteranceIndex;
              return (
                <button
                  key={t.utterance_index}
                  onClick={() => onSelectUtterance(idx)}
                  className={`h-2.5 flex-1 rounded-full transition-all cursor-pointer ${
                    isActive
                      ? 'bg-teal-500 ring-2 ring-teal-300 ring-offset-1 scale-110'
                      : modified
                        ? 'bg-amber-400 hover:bg-teal-400'
                        : 'bg-gray-200 hover:bg-teal-300'
                  }`}
                  title={`Utterance #${t.utterance_index}${modified ? ' ✓ diedit' : ''}`}
                />
              );
            })}
          </div>

          {/* Next page */}
          <button
            onClick={() => setDotPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={dotPage >= totalPages - 1}
            className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-teal-600 hover:bg-teal-50 disabled:opacity-30 transition-colors flex-shrink-0"
            title="Halaman berikutnya"
          >
            <ChevronRight size={12} />
          </button>
        </div>

        {/* Page indicator */}
        {totalPages > 1 && (
          <div className="text-xs text-gray-500 font-medium text-right mt-1.5">
            Hal {dotPage + 1}/{totalPages} · {dotPage * PAGE_SIZE + 1}–{Math.min((dotPage + 1) * PAGE_SIZE, segment.transcripts.length)} dari {segment.transcripts.length}
          </div>
        )}

        {/* Review status / Draft status */}
        <div className="mt-2 flex items-center gap-2">
          {reviewBadge ? (
            <>
              <Badge variant="outline" className={`text-[11px] ${reviewBadge.className}`}>
                {reviewBadge.label}
              </Badge>
              {reviewFeedback && reviewStatus === 'REJECTED' && (
                <span className="text-[11px] text-red-500 truncate">
                  Feedback: {reviewFeedback}
                </span>
              )}
            </>
          ) : editedCount > 0 ? (
            <Badge variant="outline" className="text-[11px] bg-amber-50 text-amber-700 border-amber-200">
              Draft Tersimpan
            </Badge>
          ) : (
             <Badge variant="outline" className="text-[11px] bg-gray-50 text-gray-500 border-gray-200">
              Belum ada anotasi
             </Badge>
          )}
        </div>
      </div>

      {/* ── Main editor area ── */}
      <div className="flex-1 p-4 overflow-y-auto min-h-0 flex flex-col">
        {activeTranscript && activeEdit ? (
          <div className="flex-1 space-y-4 flex flex-col min-h-0">
            {/* Active utterance header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold bg-teal-600 text-white px-2 py-0.5 rounded">
                  Video ke-{activeTranscript.utterance_index}
                </span>
                {activeEdit.status === 'OK' ? (
                  <Badge variant="outline" className="text-[11px] px-1.5 py-0.5 bg-gray-100 text-gray-600 border-gray-300">
                    🔒 LOCKED
                  </Badge>
                ) : (
                  <>
                    <Badge variant="outline" className="text-[11px] px-1.5 py-0.5 bg-teal-50 text-teal-600 border-teal-200">
                      <Crosshair size={10} className="mr-1" />
                      Aktif
                    </Badge>
                  </>
                )}
                {isModified && (
                  <Badge variant="outline" className="text-[11px] px-1.5 py-0.5 bg-amber-50 text-amber-600 border-amber-200">
                    <CheckCircle2 size={10} className="mr-1" />
                    Diedit
                  </Badge>
                )}
              </div>
              {confBadge && (
                <Badge variant="outline" className={`text-[11px] px-1.5 py-0.5 ${confBadge.className}`}>
                  <Shield size={10} className="mr-1" />
                  ASR: {confBadge.label}
                </Badge>
              )}
            </div>

            {/* Timestamps — read-only */}
            <div className="flex items-center gap-2 text-xs">
              <Clock size={12} className="text-teal-600" />
              <span className="font-mono text-teal-700 font-semibold text-sm">
                {formatTs(activeEdit.start)}
              </span>
              <span className="text-gray-300 text-lg">→</span>
              <span className="font-mono text-teal-700 font-semibold text-sm">
                {formatTs(activeEdit.end)}
              </span>
              <span className="text-gray-400 text-xs">
                ({(activeEdit.end - activeEdit.start).toFixed(1)}s)
              </span>
              <span className="text-xs text-teal-500 italic ml-auto font-medium">
                geser filmstrip untuk ubah
              </span>
            </div>

            {/* ASR Reference — large, clear */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="text-xs text-gray-500 mb-1.5 flex items-center gap-1.5 font-semibold uppercase tracking-wide">
                <Volume2 size={12} />
                Teks Transkripsi
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                {activeTranscript.text || '(tidak ada teks)'}
              </p>
            </div>

            {/* Correction textarea — prominent */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="text-[11px] text-teal-700 mb-1.5 flex items-center gap-1 font-semibold uppercase tracking-wide">
                <FileText size={10} />
                Glosa
              </div>
              <Textarea
                value={activeEdit.text}
                onChange={(e) => onUtteranceChange(activeUtteranceIndex!, { text: e.target.value })}
                placeholder="Tulis koreksi teks bahasa isyarat..."
                disabled={actionsDisabled || activeEdit.status === 'OK'}
                className="text-sm leading-relaxed resize-none flex-1 min-h-[120px] border-teal-200 focus-visible:ring-teal-500 bg-white"
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <AlertTriangle size={24} className="mx-auto mb-2 opacity-40" />
              <p className="text-xs">Pilih utterance dari timeline atau progress dots di atas</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Action buttons ── */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center gap-2 flex-shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          disabled={actionsDisabled || resetting}
          className="gap-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
        >
          {resetting ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
          Reset
        </Button>

        <div className="flex-1" />

        <Button
          variant="secondary"
          size="sm"
          onClick={onSaveDraft}
          disabled={actionsDisabled || isSaving}
          className="gap-1.5 text-xs bg-teal-50 text-teal-700 hover:bg-teal-100 border-teal-200"
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Simpan Draft
        </Button>

        <Button
          size="sm"
          onClick={() => activeUtteranceIndex !== null && onMarkOk(activeUtteranceIndex)}
          disabled={actionsDisabled || isSaving || !activeEdit || activeEdit.status === 'OK'}
          className="gap-1.5 text-xs bg-teal-600 hover:bg-teal-700 text-white"
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          Tandai OK & Submit
        </Button>
      </div>
    </Card>
  );
}
