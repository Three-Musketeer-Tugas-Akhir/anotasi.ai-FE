'use client';

import { useState, useCallback, useEffect } from 'react';
import { PenTool, ArrowLeft, Loader2, AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VideoPlayer } from './video-player';
import { TimelineEditor } from './timeline-editor';
import { PropertiesPanel, type AnnotationEditData } from './properties-panel';
import { ActionBar } from './action-bar';
import { AnnotationQueue } from './annotation-queue';
import { SyncWorkbench } from './sync-workbench';
import { annotationApi } from '../annotation-api';
import type { SegmentDetailResponse } from '../annotation-types';

// ── Component ──────────────────────────────────────────────────────

export function AnnotationPage() {
  // ── Segment Selection ─────────────────────────────────────────
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [segment, setSegment] = useState<SegmentDetailResponse | null>(null);
  const [segmentLoading, setSegmentLoading] = useState(false);
  const [segmentError, setSegmentError] = useState<string | null>(null);

  // ── Edit Data ─────────────────────────────────────────────────
  const [editData, setEditData] = useState<AnnotationEditData>({
    newText: '',
    newStart: 0,
    newEnd: 0,
  });

  // ── Video State ───────────────────────────────────────────────
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [duration, setDuration] = useState(0);

  // ── Action State ──────────────────────────────────────────────
  const [isSaving, setIsSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState<string | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState<string | null>(null);
  const [canSubmit, setCanSubmit] = useState(true);
  const [submitWarning, setSubmitWarning] = useState<string | null>(null);

  // ── Sync State ────────────────────────────────────────────────
  const [latestEditId, setLatestEditId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // ── Load Segment Detail ───────────────────────────────────────

  const loadSegment = useCallback(async (segmentId: string) => {
    setSegmentLoading(true);
    setSegmentError(null);
    setActionMessage(null);
    try {
      const data = await annotationApi.getSegment(segmentId);
      setSegment(data);
      setEditData({
        newText: data.current_text,
        newStart: data.current_start,
        newEnd: data.current_end,
      });

      // Auto-populate latestEditId from existing edit history (for returning users)
      if (data.edit_history && data.edit_history.length > 0) {
        const mostRecent = data.edit_history[data.edit_history.length - 1];
        setLatestEditId(mostRecent.edit_id);
      }

      // Load submission status
      try {
        const subStatus = await annotationApi.checkSubmissionStatus(segmentId);
        setCanSubmit(subStatus.can_submit);
        setSubmitWarning(subStatus.warning ?? null);
      } catch {
        setCanSubmit(true);
        setSubmitWarning(null);
      }

      // Load review status
      try {
        const revStatus = await annotationApi.getReviewStatus(segmentId);
        setReviewStatus(revStatus.status);
        setReviewFeedback(revStatus.feedback ?? null);
      } catch {
        setReviewStatus(null);
        setReviewFeedback(null);
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Gagal memuat detail segmen';
      setSegmentError(typeof msg === 'string' ? msg : 'Gagal memuat detail segmen');
    } finally {
      setSegmentLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSegmentId) {
      loadSegment(selectedSegmentId);
    }
  }, [selectedSegmentId, loadSegment]);

  // ── Handlers ──────────────────────────────────────────────────

  const handleSelectSegment = (segmentId: string, editId?: string | null) => {
    setSelectedSegmentId(segmentId);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    // Pre-populate editId from queue if available (skip redundant lookups)
    setLatestEditId(editId ?? null);
    setSyncStatus(null);
  };

  const handleBackToQueue = () => {
    setSelectedSegmentId(null);
    setSegment(null);
    setIsPlaying(false);
    setLatestEditId(null);
    setSyncStatus(null);
  };

  const handleEditDataChange = (updates: Partial<AnnotationEditData>) => {
    setEditData((prev) => ({ ...prev, ...updates }));
  };

  const handleTrimChange = (start: number, end: number) => {
    setEditData((prev) => ({ ...prev, newStart: start, newEnd: end }));
  };

  // ── API Actions ───────────────────────────────────────────────

  const handleSaveDraft = async () => {
    if (!selectedSegmentId || !editData.newText.trim()) return;
    setIsSaving(true);
    setActionMessage(null);
    try {
      const result = await annotationApi.saveDraft(selectedSegmentId, {
        new_text: editData.newText.trim(),
        new_start: editData.newStart,
        new_end: editData.newEnd,
      });
      setActionMessage(result.message || 'Draft tersimpan');
      // Capture edit_id for sync workbench
      if (result.edit_id) {
        setLatestEditId(result.edit_id);
      }
      // Reload segment to get updated edit history
      await loadSegment(selectedSegmentId);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Gagal menyimpan draft';
      setActionMessage(typeof msg === 'string' ? `❌ ${msg}` : '❌ Gagal menyimpan draft');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreview = async () => {
    if (!selectedSegmentId) return;
    try {
      const preview = await annotationApi.getPreview(selectedSegmentId, {
        start_time: editData.newStart,
        end_time: editData.newEnd,
        transcript_text: editData.newText,
      });
      // Seek video to preview start and play
      setCurrentTime(preview.start_time);
      setIsPlaying(true);
      setActionMessage(`Preview: ${preview.start_time.toFixed(2)}s → ${preview.end_time.toFixed(2)}s`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Gagal memuat preview';
      setActionMessage(typeof msg === 'string' ? `❌ ${msg}` : '❌ Gagal memuat preview');
    }
  };

  const handleReset = async () => {
    if (!selectedSegmentId) return;
    try {
      const result = await annotationApi.resetToOriginal(selectedSegmentId);
      setActionMessage(result.message);
      // Reset edit data to reverted values
      if (result.reverted_to) {
        setEditData({
          newText: (result.reverted_to.text as string) || '',
          newStart: (result.reverted_to.start as number) || 0,
          newEnd: (result.reverted_to.end as number) || 0,
        });
      }
      // Reload segment
      await loadSegment(selectedSegmentId);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Gagal mereset anotasi';
      setActionMessage(typeof msg === 'string' ? `❌ ${msg}` : '❌ Gagal mereset anotasi');
    }
  };

  const handleSubmit = async () => {
    if (!selectedSegmentId) return;
    try {
      // Check submission status first
      const status = await annotationApi.checkSubmissionStatus(selectedSegmentId);
      const confirmNoChanges = !status.has_edits;

      const result = await annotationApi.submitForReview(selectedSegmentId, {
        confirm_no_changes: confirmNoChanges,
      });
      setActionMessage(`✅ ${result.message}`);
      setReviewStatus(result.status);
      // Reload segment
      await loadSegment(selectedSegmentId);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Gagal submit anotasi';
      setActionMessage(typeof msg === 'string' ? `❌ ${msg}` : '❌ Gagal submit anotasi');
    }
  };

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          {selectedSegmentId && (
            <Button variant="ghost" size="sm" onClick={handleBackToQueue} className="h-8 px-2">
              <ArrowLeft size={16} />
            </Button>
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <PenTool size={20} className="text-teal-600" />
              {selectedSegmentId ? 'Workspace Anotasi' : 'Antrian Anotasi'}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {selectedSegmentId
                ? 'Edit transkripsi dan sinkronisasikan timestamp video'
                : 'Pilih segmen dari antrian untuk mulai anotasi'}
            </p>
          </div>
          {/* Action message + Sync status */}
          <div className="ml-auto flex items-center gap-2">
            {syncStatus && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                syncStatus === 'LOCKED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                syncStatus === 'SYNCED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                syncStatus === 'PARTIAL' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                'bg-gray-50 text-gray-500 border-gray-200'
              }`}>
                Sync: {syncStatus}
              </span>
            )}
            {actionMessage && (
              <div className="bg-gray-100 text-gray-700 text-xs px-3 py-1.5 rounded-lg max-w-sm truncate">
                {actionMessage}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Queue Sidebar */}
        <AnnotationQueue
          onSelectSegment={handleSelectSegment}
          selectedSegmentId={selectedSegmentId}
        />

        {/* Main Content */}
        {!selectedSegmentId ? (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <PenTool size={48} className="text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Pilih segmen dari antrian di kiri</p>
              <p className="text-xs text-gray-400 mt-1">untuk mulai menganotasi transkripsi</p>
            </div>
          </div>
        ) : segmentLoading ? (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <Loader2 size={24} className="text-teal-600 animate-spin" />
          </div>
        ) : segmentError ? (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <AlertTriangle size={32} className="text-red-400 mx-auto mb-2" />
              <p className="text-sm text-red-600">{segmentError}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => loadSegment(selectedSegmentId)}
              >
                <RotateCcw size={14} className="mr-1" /> Coba Lagi
              </Button>
            </div>
          </div>
        ) : segment ? (
          <div className="flex-1 flex flex-col p-4 bg-gray-50 overflow-hidden gap-4">
            {/* Main Grid: Video+Timeline left, Properties right */}
            <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
              {/* Left: Video & Timeline */}
              <div className="flex-[2] flex flex-col gap-4 min-w-0">
                <div className="flex-[3] min-h-0">
                  <VideoPlayer
                    src={segment.video_url}
                    isPlaying={isPlaying}
                    onPlayPause={setIsPlaying}
                    currentTime={currentTime}
                    onTimeUpdate={setCurrentTime}
                    playbackRate={playbackRate}
                    onPlaybackRateChange={setPlaybackRate}
                    onDurationChange={setDuration}
                  />
                </div>
                <div className="flex-[2] min-h-[200px]">
                  <TimelineEditor
                    videoUrl={segment.video_url}
                    duration={duration}
                    currentTime={currentTime}
                    isPlaying={isPlaying}
                    onTimeUpdate={setCurrentTime}
                    trimStart={editData.newStart}
                    trimEnd={editData.newEnd}
                    onTrimChange={handleTrimChange}
                  />
                </div>
                {/* Sync Workbench — appears after first saveDraft */}
                {latestEditId && selectedSegmentId && (
                  <div className="flex-shrink-0">
                    <SyncWorkbench
                      editId={latestEditId}
                      segmentId={selectedSegmentId}
                      onSyncStatusChange={setSyncStatus}
                    />
                  </div>
                )}
              </div>

              {/* Right: Properties */}
              <div className="flex-[1] min-w-[300px] overflow-hidden">
                <PropertiesPanel
                  segment={segment}
                  editData={editData}
                  onEditDataChange={handleEditDataChange}
                />
              </div>
            </div>

            {/* Footer: Action Bar */}
            <div className="flex-shrink-0">
              <ActionBar
                onSaveDraft={handleSaveDraft}
                onPreview={handlePreview}
                onReset={handleReset}
                onSubmit={handleSubmit}
                reviewStatus={reviewStatus}
                reviewFeedback={reviewFeedback}
                canSubmit={canSubmit}
                submitWarning={submitWarning}
                isSaving={isSaving}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
