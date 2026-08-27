'use client';

/**
 * Curator review queue — approve/reject JBI annotations submitted by
 * annotators. This is the missing half of the submit-for-review workflow:
 * annotationApi.submitForReview() already existed and worked (verified via
 * annotation-page.tsx), but nothing in the FE ever called
 * POST /annotations/reviews/{id}/approve or /reject, so every submission was
 * permanently stuck in SUBMITTED — the pipeline_jobs.curation_status update
 * that unlocks Curation only fires from inside approve_annotation_review.
 *
 * Reuses annotationApi.getMySubmissions (returns every annotator's items when
 * called by a curator/admin, not just the caller's own) and
 * annotationApi.getSegment / getMergedVideo (both now also curator-accessible
 * on the backend) rather than adding a parallel data path.
 */

import { useState, useEffect, useCallback } from 'react';
import { Loader2, CheckCircle2, XCircle, Clock, FileText, PlayCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { annotationApi } from '@/features/annotation/annotation-api';
import type {
  ReviewStatusResponse,
  SegmentDetailResponse,
  UtteranceCorrection,
} from '@/features/annotation/annotation-types';

type StatusFilter = 'PENDING' | 'APPROVED' | 'REJECTED';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

// ── Utterance row with lazy-loaded video ─────────────────────────────

function UtteranceReviewRow({
  segmentId,
  utt,
}: {
  segmentId: string;
  utt: UtteranceCorrection;
}) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  const handlePlay = async () => {
    if (videoUrl || loadingVideo) return;
    setLoadingVideo(true);
    setVideoError(null);
    try {
      // The merge tape [N | N+1] is what the annotator actually saw and
      // worked from — lazy-loaded per utterance so opening a 300+ kalimat
      // segment doesn't fetch every clip at once.
      const merged = await annotationApi.getMergedVideo(segmentId, utt.utterance_index);
      setVideoUrl(merged.merged_video_url);
    } catch {
      setVideoError('Gagal memuat video');
    } finally {
      setLoadingVideo(false);
    }
  };

  return (
    <div className="border border-slate-200 rounded-lg p-3 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <span className="text-xs font-mono text-slate-400">#{utt.utterance_index + 1}</span>
          <p className="text-sm text-slate-800 mt-0.5">{utt.text}</p>
        </div>
        {utt.status === 'OK' ? (
          <Badge variant="outline" className="text-[10px] bg-teal-50 text-teal-700 border-teal-200 flex-shrink-0">
            OK
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 flex-shrink-0">
            {utt.status || 'BELUM OK'}
          </Badge>
        )}
      </div>

      {videoUrl ? (
        <video src={videoUrl} controls preload="metadata" className="w-full max-h-64 rounded-md bg-black" />
      ) : (
        <button
          onClick={handlePlay}
          disabled={loadingVideo}
          className="self-start flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800 disabled:opacity-50"
        >
          {loadingVideo ? <Loader2 size={14} className="animate-spin" /> : <PlayCircle size={14} />}
          {loadingVideo ? 'Memuat video...' : 'Putar video'}
        </button>
      )}
      {videoError && <p className="text-xs text-red-500">{videoError}</p>}
    </div>
  );
}

// ── Detail panel ───────────────────────────────────────────────────────

function ReviewDetailPanel({
  item,
  onDecided,
}: {
  item: ReviewStatusResponse;
  onDecided: () => void;
}) {
  const [segment, setSegment] = useState<SegmentDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [deciding, setDeciding] = useState<'approve' | 'reject' | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSegment(null);
    setFeedback('');
    annotationApi
      .getSegment(item.segment_id)
      .then((data) => {
        if (!cancelled) setSegment(data);
      })
      .catch(() => {
        if (!cancelled) setError('Gagal memuat detail segmen');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [item.segment_id]);

  const handleApprove = async () => {
    setDeciding('approve');
    try {
      await annotationApi.approveReview(item.review_id, feedback || undefined);
      onDecided();
    } catch {
      setError('Gagal menyetujui review');
    } finally {
      setDeciding(null);
    }
  };

  const handleReject = async () => {
    if (!feedback.trim()) {
      setError('Feedback wajib diisi untuk menolak — annotator perlu tahu apa yang harus diperbaiki.');
      return;
    }
    setDeciding('reject');
    try {
      await annotationApi.rejectReview(item.review_id, feedback);
      onDecided();
    } catch {
      setError('Gagal menolak review');
    } finally {
      setDeciding(null);
    }
  };

  const utterances = segment?.current_utterances ?? [];
  const isDecided = item.status !== 'PENDING' && item.status !== 'SUBMITTED';

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      <div className="p-5 border-b border-slate-100 flex-shrink-0">
        <h2 className="text-lg font-bold text-slate-800">{item.original_filename || 'Video'}</h2>
        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Clock size={12} /> Disubmit {formatDate(item.submitted_at)}
          </span>
          {isDecided && (
            <Badge
              variant="outline"
              className={
                item.status === 'APPROVED'
                  ? 'text-teal-700 bg-teal-50 border-teal-200'
                  : 'text-red-700 bg-red-50 border-red-200'
              }
            >
              {item.status === 'APPROVED' ? 'Disetujui' : 'Ditolak'}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-slate-400">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : utterances.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">Tidak ada kalimat untuk ditampilkan.</p>
        ) : (
          utterances.map((utt) => (
            <UtteranceReviewRow key={utt.utterance_index} segmentId={item.segment_id} utt={utt} />
          ))
        )}
      </div>

      <div className="p-5 border-t border-slate-200 flex-shrink-0 flex flex-col gap-3">
        {error && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle size={12} /> {error}
          </p>
        )}
        {!isDecided && (
          <>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Feedback untuk annotator (wajib jika menolak, opsional jika menyetujui)..."
              className="text-sm resize-none"
              rows={2}
            />
            <div className="flex gap-3">
              <Button
                onClick={handleReject}
                disabled={deciding !== null}
                variant="outline"
                className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
              >
                {deciding === 'reject' ? (
                  <Loader2 size={16} className="animate-spin mr-2" />
                ) : (
                  <XCircle size={16} className="mr-2" />
                )}
                Tolak
              </Button>
              <Button
                onClick={handleApprove}
                disabled={deciding !== null}
                className="flex-1 bg-teal-600 hover:bg-teal-500"
              >
                {deciding === 'approve' ? (
                  <Loader2 size={16} className="animate-spin mr-2" />
                ) : (
                  <CheckCircle2 size={16} className="mr-2" />
                )}
                Setujui
              </Button>
            </div>
          </>
        )}
        {isDecided && item.feedback && (
          <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 border border-slate-200">
            <span className="font-semibold text-slate-500 text-xs uppercase">Feedback:</span> {item.feedback}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────

export function ReviewPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('PENDING');
  const [items, setItems] = useState<ReviewStatusResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await annotationApi.getMySubmissions({ status: statusFilter, page_size: 100 });
      // Known limitation: list_my_submissions has no dataset_id param on the
      // backend, so this spans every dataset for curator/admin -- unlike the
      // annotator queue, which is dataset-scoped. Fine for now (a curator's
      // review load is small), but worth adding if it ever isn't.
      setItems(data.items.filter((i) => i.status === statusFilter));
    } catch {
      setError('Gagal memuat antrian review');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const selectedItem = items.find((i) => i.review_id === selectedId) ?? null;

  const handleDecided = () => {
    setSelectedId(null);
    fetchItems();
  };

  return (
    <div className="flex h-full">
      {/* List */}
      <div className="w-96 flex-shrink-0 border-r border-slate-200 flex flex-col bg-slate-50">
        <div className="p-5 border-b border-slate-200 bg-white flex-shrink-0">
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileText size={20} className="text-teal-600" />
            Review Anotasi JBI
          </h1>
          <p className="text-xs text-slate-500 mt-1">Setujui atau tolak submission dari annotator.</p>
        </div>
        <div className="flex gap-1 p-3 border-b border-slate-200 bg-white flex-shrink-0">
          {(['PENDING', 'APPROVED', 'REJECTED'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(s);
                setSelectedId(null);
              }}
              className={`flex-1 text-xs font-bold py-1.5 rounded-md transition-colors ${
                statusFilter === s ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {s === 'PENDING' ? 'Menunggu' : s === 'APPROVED' ? 'Disetujui' : 'Ditolak'}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-slate-400">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : error ? (
            <p className="text-xs text-red-500 text-center py-4">{error}</p>
          ) : items.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">Tidak ada item.</p>
          ) : (
            items.map((item) => (
              <button
                key={item.review_id}
                onClick={() => setSelectedId(item.review_id)}
                className={`text-left p-3 rounded-lg border transition-colors ${
                  selectedId === item.review_id
                    ? 'border-teal-400 bg-teal-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {item.original_filename || 'Video'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{formatDate(item.submitted_at)}</p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Detail */}
      {selectedItem ? (
        <ReviewDetailPanel key={selectedItem.review_id} item={selectedItem} onDecided={handleDecided} />
      ) : (
        <div className="flex-1 flex items-center justify-center text-slate-400">
          <div className="text-center">
            <FileText size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">Pilih submission dari daftar di kiri</p>
          </div>
        </div>
      )}
    </div>
  );
}
