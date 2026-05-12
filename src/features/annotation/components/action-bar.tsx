'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Save,
  Eye,
  RotateCcw,
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';

interface ActionBarProps {
  onSaveDraft: () => Promise<void>;
  onPreview: () => Promise<void>;
  onReset: () => Promise<void>;
  onSubmit: () => Promise<void>;
  reviewStatus: string | null;
  reviewFeedback: string | null;
  canSubmit: boolean;
  submitWarning: string | null;
  isSaving: boolean;
}

function getReviewBadge(status: string | null): { label: string; icon: React.ReactNode; className: string } | null {
  if (!status || status === 'NOT_SUBMITTED') return null;
  switch (status) {
    case 'SUBMITTED':
    case 'PENDING':
      return { label: 'Menunggu Review', icon: <Clock size={10} />, className: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'APPROVED':
      return { label: 'Disetujui', icon: <CheckCircle2 size={10} />, className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'REJECTED':
      return { label: 'Ditolak', icon: <XCircle size={10} />, className: 'bg-red-50 text-red-700 border-red-200' };
    default:
      return null;
  }
}

export function ActionBar({
  onSaveDraft,
  onPreview,
  onReset,
  onSubmit,
  reviewStatus,
  reviewFeedback,
  canSubmit,
  submitWarning,
  isSaving,
}: ActionBarProps) {
  const [resetting, setResetting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const reviewBadge = getReviewBadge(reviewStatus);
  const isReviewed = reviewStatus === 'APPROVED' || reviewStatus === 'REJECTED';
  const isPendingReview = reviewStatus === 'SUBMITTED' || reviewStatus === 'PENDING';
  const actionsDisabled = isPendingReview || isReviewed;

  const handleReset = async () => {
    if (!confirm('Reset semua edit? Data akan kembali ke ASR original.')) return;
    setResetting(true);
    try {
      await onReset();
      toast.success('Anotasi direset', {
        description: 'Semua edit telah dikembalikan ke ASR original.',
        position: 'top-center',
      });
    } catch {
      toast.error('Gagal reset', {
        description: 'Terjadi kesalahan saat mereset anotasi.',
        position: 'top-center',
      });
    } finally {
      setResetting(false);
    }
  };

  const handleSubmit = async () => {
    if (submitWarning && !confirm(submitWarning + '\n\nLanjutkan submit?')) return;
    if (!confirm('Submit anotasi untuk review oleh kurator?')) return;
    setSubmitting(true);
    try {
      await onSubmit();
      toast.success('Anotasi dikirim', {
        description: 'Anotasi berhasil dikirim untuk review kurator.',
        position: 'top-center',
      });
    } catch {
      toast.error('Gagal mengirim', {
        description: 'Terjadi kesalahan saat mengirim anotasi.',
        position: 'top-center',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePreview = async () => {
    setPreviewing(true);
    try { await onPreview(); } finally { setPreviewing(false); }
  };

  return (
    <Card className="p-3 flex items-center justify-between shadow-sm border-gray-200 bg-white gap-3">
      {/* Left: Status */}
      <div className="flex items-center gap-2 min-w-0">
        {reviewBadge && (
          <Badge variant="outline" className={`text-[10px] flex-shrink-0 ${reviewBadge.className}`}>
            {reviewBadge.icon}
            <span className="ml-1">{reviewBadge.label}</span>
          </Badge>
        )}
        {reviewFeedback && reviewStatus === 'REJECTED' && (
          <span className="text-[10px] text-red-500 truncate max-w-[200px]" title={reviewFeedback}>
            Feedback: {reviewFeedback}
          </span>
        )}
        {!reviewBadge && (
          <span className="text-xs text-gray-400">
            Pastikan anotasi sudah tepat sebelum submit.
          </span>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex gap-2 flex-shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePreview}
          disabled={actionsDisabled || previewing}
          className="gap-1.5 text-xs"
        >
          {previewing ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
          Preview
        </Button>

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
          onClick={handleSubmit}
          disabled={actionsDisabled || !canSubmit || submitting}
          className="gap-1.5 text-xs bg-teal-600 hover:bg-teal-700 text-white"
        >
          {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          Submit Review
        </Button>
      </div>
    </Card>
  );
}
