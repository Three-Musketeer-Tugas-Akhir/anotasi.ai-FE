'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Edit3,
  Flag,
  Loader2,
  Play,
  RotateCcw,
  Volume2,
  FileText,
  Video,
  X,
  Shield,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { asrReviewApi } from '../asr-review-api';
import type {
  ASRReviewDetailResponse,
  ASRFlagReason,
} from '../asr-review-types';
import { ASR_REVIEW_STATUS, FLAG_REASONS } from '../asr-review-types';

// ── Helpers ────────────────────────────────────────────────────────

function formatTime(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 100);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

function getConfidenceBadge(score: number | null): {
  label: string;
  className: string;
} {
  if (score === null) return { label: 'N/A', className: 'bg-gray-100 text-gray-500 border-gray-200' };
  if (score >= 0.9) return { label: `${Math.round(score * 100)}% Tinggi`, className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (score >= 0.5) return { label: `${Math.round(score * 100)}% Sedang`, className: 'bg-amber-50 text-amber-700 border-amber-200' };
  return { label: `${Math.round(score * 100)}% Rendah`, className: 'bg-red-50 text-red-700 border-red-200' };
}

function getStatusBadge(status: string): { label: string; className: string; icon: React.ReactNode } {
  switch (status) {
    case ASR_REVIEW_STATUS.APPROVED:
      return { label: 'Disetujui', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 size={10} /> };
    case ASR_REVIEW_STATUS.CORRECTED:
      return { label: 'Dikoreksi', className: 'bg-blue-50 text-blue-700 border-blue-200', icon: <Edit3 size={10} /> };
    case ASR_REVIEW_STATUS.FLAGGED:
      return { label: 'Ditandai', className: 'bg-red-50 text-red-700 border-red-200', icon: <Flag size={10} /> };
    case ASR_REVIEW_STATUS.PENDING:
    default:
      return { label: 'Menunggu Review', className: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Clock size={10} /> };
  }
}

// ── Types ──────────────────────────────────────────────────────────

type ActionMode = 'idle' | 'approve' | 'correct' | 'flag';

interface AsrReviewDetailPanelProps {
  reviewId: string;
  onActionCompleted: () => void;
}

// ── Component ──────────────────────────────────────────────────────

export function AsrReviewDetailPanel({ reviewId, onActionCompleted }: AsrReviewDetailPanelProps) {
  const [detail, setDetail] = useState<ASRReviewDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Action state
  const [actionMode, setActionMode] = useState<ActionMode>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Correct form
  const [correctedText, setCorrectedText] = useState('');
  const [correctNotes, setCorrectNotes] = useState('');

  // Approve form
  const [approveNotes, setApproveNotes] = useState('');

  // Flag form
  const [flagReason, setFlagReason] = useState<ASRFlagReason | ''>('');
  const [flagNotes, setFlagNotes] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);

  // ── Fetch Detail ──────────────────────────────────────────────

  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true);
      const data = await asrReviewApi.getDetail(reviewId);
      setDetail(data);
      setError(null);
      setCorrectedText(data.asr_text || '');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (err as Error)?.message ||
        'Gagal memuat detail review';
      setError(typeof msg === 'string' ? msg : 'Gagal memuat detail review');
    } finally {
      setLoading(false);
    }
  }, [reviewId]);

  useEffect(() => {
    setActionMode('idle');
    setActionError(null);
    setSuccessMessage(null);
    fetchDetail();
  }, [fetchDetail]);

  // ── Actions ───────────────────────────────────────────────────

  const handleApprove = async () => {
    setSubmitting(true);
    setActionError(null);
    try {
      const result = await asrReviewApi.approve(reviewId, {
        notes: approveNotes || undefined,
      });
      setSuccessMessage(result.message);
      setActionMode('idle');
      toast.success('Transcript disetujui', {
        description: result.message,
        position: 'top-center',
      });
      setTimeout(() => onActionCompleted(), 1500);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Gagal menyetujui transcript';
      setActionError(typeof msg === 'string' ? msg : 'Gagal menyetujui transcript');
      toast.error('Gagal menyetujui', {
        description: typeof msg === 'string' ? msg : 'Terjadi kesalahan saat menyetujui transcript.',
        position: 'top-center',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCorrect = async () => {
    if (!correctedText.trim()) {
      setActionError('Teks koreksi tidak boleh kosong');
      return;
    }
    setSubmitting(true);
    setActionError(null);
    try {
      const result = await asrReviewApi.correct(reviewId, {
        corrected_text: correctedText.trim(),
        notes: correctNotes || undefined,
      });
      setSuccessMessage(result.message);
      setActionMode('idle');
      toast.success('Koreksi tersimpan', {
        description: result.message,
        position: 'top-center',
      });
      setTimeout(() => onActionCompleted(), 1500);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Gagal mengoreksi transcript';
      setActionError(typeof msg === 'string' ? msg : 'Gagal mengoreksi transcript');
      toast.error('Gagal mengoreksi', {
        description: typeof msg === 'string' ? msg : 'Terjadi kesalahan saat mengoreksi transcript.',
        position: 'top-center',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFlag = async () => {
    if (!flagReason) {
      setActionError('Pilih alasan flag');
      return;
    }
    if (!flagNotes.trim()) {
      setActionError('Deskripsi masalah wajib diisi');
      return;
    }
    setSubmitting(true);
    setActionError(null);
    try {
      const result = await asrReviewApi.flag(reviewId, {
        flag_reason: flagReason as ASRFlagReason,
        notes: flagNotes.trim(),
      });
      setSuccessMessage(result.message);
      setActionMode('idle');
      toast.success('Segmen ditandai', {
        description: result.message,
        position: 'top-center',
      });
      setTimeout(() => onActionCompleted(), 1500);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Gagal menandai segmen';
      setActionError(typeof msg === 'string' ? msg : 'Gagal menandai segmen');
      toast.error('Gagal menandai', {
        description: typeof msg === 'string' ? msg : 'Terjadi kesalahan saat menandai segmen.',
        position: 'top-center',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const cancelAction = () => {
    setActionMode('idle');
    setActionError(null);
    if (detail) setCorrectedText(detail.asr_text || '');
    setCorrectNotes('');
    setApproveNotes('');
    setFlagReason('');
    setFlagNotes('');
  };

  // ── Loading / Error ───────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <Loader2 size={24} className="text-teal-600 animate-spin" />
      </div>
    );
  }

  if (error && !detail) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertTriangle size={32} className="text-red-400 mx-auto mb-2" />
          <p className="text-sm text-red-600">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={fetchDetail}>
            <RotateCcw size={14} className="mr-1" /> Coba Lagi
          </Button>
        </div>
      </div>
    );
  }

  if (!detail) return null;

  const isPending = detail.status === ASR_REVIEW_STATUS.PENDING;
  const statusBadge = getStatusBadge(detail.status);
  const confidenceBadge = getConfidenceBadge(detail.confidence_score);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      {/* ── Video Player ── */}
      <div className="bg-slate-900 flex-shrink-0">
        <div className="relative w-full" style={{ maxHeight: '320px' }}>
          {detail.video_url ? (
            <video
              ref={videoRef}
              src={detail.video_url}
              controls
              className="w-full max-h-[320px] object-contain bg-black"
              preload="metadata"
            >
              <track kind="captions" />
              Browser tidak mendukung video playback.
            </video>
          ) : (
            <div className="flex items-center justify-center h-[200px] bg-slate-800 text-slate-500">
              <div className="text-center">
                <Video size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-xs">Video belum tersedia</p>
              </div>
            </div>
          )}
        </div>

        {/* Subtitle bar under video */}
        <div className="px-5 py-3 bg-slate-900/95 border-t border-slate-800">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-teal-500/20 text-teal-300 border border-teal-400/30 text-[10px] font-mono px-2 py-0.5 rounded-md font-bold">
              {formatTime(detail.asr_start)} → {formatTime(detail.asr_end)}
            </span>
            <Badge variant="outline" className={`text-[10px] ${confidenceBadge.className}`}>
              <Shield size={8} className="mr-1" />
              {confidenceBadge.label}
            </Badge>
          </div>
          <p className="text-white/90 text-sm font-medium leading-relaxed">
            &ldquo;{detail.asr_text}&rdquo;
          </p>
        </div>
      </div>

      {/* ── Detail Content ── */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Info Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                <FileText size={18} className="text-teal-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800 truncate max-w-[280px]">
                  {detail.original_filename}
                </p>
                <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                  Job #{detail.job_id.slice(0, 8)} • Segment #{detail.segment_id.slice(0, 8)}
                </p>
              </div>
            </div>
            <Badge variant="outline" className={`text-[10px] ${statusBadge.className}`}>
              {statusBadge.icon}
              <span className="ml-1">{statusBadge.label}</span>
            </Badge>
          </div>

          {/* Attention Warning */}
          {detail.is_low_confidence && detail.attention_message && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2 mt-2">
              <AlertTriangle size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700">{detail.attention_message}</p>
            </div>
          )}

          {/* Reviewed info */}
          {!isPending && detail.reviewed_at && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mt-2 flex items-start gap-2">
              <Info size={14} className="text-gray-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-gray-600">
                <p>
                  Status: <strong>{detail.status}</strong> pada{' '}
                  {new Date(detail.reviewed_at).toLocaleString('id-ID')}
                </p>
                {detail.reviewer_id && (
                  <p className="text-gray-400 mt-0.5">Reviewer: {detail.reviewer_id.slice(0, 8)}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
            <p className="text-sm text-emerald-700 font-medium">{successMessage}</p>
          </div>
        )}

        {/* ── Action Buttons (only when PENDING) ── */}
        {isPending && actionMode === 'idle' && !successMessage && (
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setActionMode('approve')}
              className="bg-white border-2 border-emerald-200 rounded-xl p-4 text-center hover:bg-emerald-50 hover:border-emerald-300 transition-all group"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-2 group-hover:bg-emerald-200 transition-colors">
                <CheckCircle2 size={20} className="text-emerald-600" />
              </div>
              <p className="text-sm font-bold text-emerald-700">Setujui</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Transcript benar</p>
            </button>

            <button
              onClick={() => setActionMode('correct')}
              className="bg-white border-2 border-blue-200 rounded-xl p-4 text-center hover:bg-blue-50 hover:border-blue-300 transition-all group"
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-2 group-hover:bg-blue-200 transition-colors">
                <Edit3 size={20} className="text-blue-600" />
              </div>
              <p className="text-sm font-bold text-blue-700">Koreksi</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Perbaiki teks</p>
            </button>

            <button
              onClick={() => setActionMode('flag')}
              className="bg-white border-2 border-red-200 rounded-xl p-4 text-center hover:bg-red-50 hover:border-red-300 transition-all group"
            >
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-2 group-hover:bg-red-200 transition-colors">
                <Flag size={20} className="text-red-600" />
              </div>
              <p className="text-sm font-bold text-red-700">Tandai</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Kualitas buruk</p>
            </button>
          </div>
        )}

        {/* ── Approve Form ── */}
        {actionMode === 'approve' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <p className="text-sm font-bold text-emerald-800">Setujui Transcript</p>
            </div>
            <p className="text-xs text-emerald-700">
              Transcript ASR akan diterima apa adanya dan segmen akan dipindahkan ke Annotation Queue.
            </p>
            <div>
              <Label htmlFor="approve-notes" className="text-xs text-emerald-700">
                Catatan (opsional)
              </Label>
              <Textarea
                id="approve-notes"
                value={approveNotes}
                onChange={(e) => setApproveNotes(e.target.value)}
                placeholder="Catatan tambahan..."
                className="mt-1 text-sm h-16 resize-none"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={cancelAction} disabled={submitting}>
                <X size={14} className="mr-1" /> Batal
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleApprove}
                disabled={submitting}
              >
                {submitting ? <Loader2 size={14} className="mr-1 animate-spin" /> : <CheckCircle2 size={14} className="mr-1" />}
                Konfirmasi Setujui
              </Button>
            </div>
          </div>
        )}

        {/* ── Correct Form ── */}
        {actionMode === 'correct' && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Edit3 size={16} className="text-blue-600" />
              <p className="text-sm font-bold text-blue-800">Koreksi Transcript</p>
            </div>
            <div>
              <Label htmlFor="corrected-text" className="text-xs text-blue-700">
                Teks yang sudah dikoreksi *
              </Label>
              <Textarea
                id="corrected-text"
                value={correctedText}
                onChange={(e) => setCorrectedText(e.target.value)}
                placeholder="Tulis koreksi transcript di sini..."
                className="mt-1 text-sm h-24 resize-none"
              />
            </div>
            <div>
              <Label htmlFor="correct-notes" className="text-xs text-blue-700">
                Catatan koreksi (opsional)
              </Label>
              <Textarea
                id="correct-notes"
                value={correctNotes}
                onChange={(e) => setCorrectNotes(e.target.value)}
                placeholder="Jelaskan perubahan yang dilakukan..."
                className="mt-1 text-sm h-16 resize-none"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={cancelAction} disabled={submitting}>
                <X size={14} className="mr-1" /> Batal
              </Button>
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleCorrect}
                disabled={submitting || !correctedText.trim()}
              >
                {submitting ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Edit3 size={14} className="mr-1" />}
                Simpan Koreksi
              </Button>
            </div>
          </div>
        )}

        {/* ── Flag Form ── */}
        {actionMode === 'flag' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Flag size={16} className="text-red-600" />
              <p className="text-sm font-bold text-red-800">Tandai Segmen</p>
            </div>
            <p className="text-xs text-red-700">
              Segmen akan ditandai untuk reprocessing dan <strong>tidak</strong> akan masuk ke Annotation Queue.
            </p>
            <div>
              <Label htmlFor="flag-reason" className="text-xs text-red-700">
                Alasan *
              </Label>
              <Combobox
                options={FLAG_REASONS.map(r => ({ value: r.value, label: r.label }))}
                value={flagReason || ''}
                onChange={(v) => setFlagReason(v as ASRFlagReason)}
                placeholder="Pilih alasan..."
                className="mt-1 w-full text-sm"
              />
            </div>
            <div>
              <Label htmlFor="flag-notes" className="text-xs text-red-700">
                Deskripsi masalah *
              </Label>
              <Textarea
                id="flag-notes"
                value={flagNotes}
                onChange={(e) => setFlagNotes(e.target.value)}
                placeholder="Jelaskan masalah audio secara detail..."
                className="mt-1 text-sm h-20 resize-none"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={cancelAction} disabled={submitting}>
                <X size={14} className="mr-1" /> Batal
              </Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleFlag}
                disabled={submitting || !flagReason || !flagNotes.trim()}
              >
                {submitting ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Flag size={14} className="mr-1" />}
                Tandai Segmen
              </Button>
            </div>
          </div>
        )}

        {/* ── Action Error ── */}
        {actionError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">{actionError}</p>
          </div>
        )}

        {/* ASR Transcript Section (read-only reference) */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Volume2 size={14} className="text-teal-600" />
            <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Transcript ASR Original</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
            <p className="text-sm text-gray-800 leading-relaxed">{detail.asr_text}</p>
          </div>
          <div className="flex gap-4 mt-2 text-[10px] text-gray-400">
            <span>Start: <strong className="text-gray-600">{formatTime(detail.asr_start)}</strong></span>
            <span>End: <strong className="text-gray-600">{formatTime(detail.asr_end)}</strong></span>
            {detail.video_duration && (
              <span>Durasi video: <strong className="text-gray-600">{detail.video_duration.toFixed(1)}s</strong></span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
