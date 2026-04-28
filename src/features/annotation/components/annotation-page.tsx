'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { PenTool, ArrowLeft, Loader2, AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VideoPlayer } from './video-player';
import { TimelineEditor } from './timeline-editor';
import { PropertiesPanel } from './properties-panel';
import { AnnotationQueue } from './annotation-queue';
import { SyncWorkbench } from './sync-workbench';
import { annotationApi } from '../annotation-api';
import type { SegmentDetailResponse, UtteranceCorrection } from '../annotation-types';

// ── Component ──────────────────────────────────────────────────────

export function AnnotationPage() {
  // ── Segment Selection ─────────────────────────────────────────
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [segment, setSegment] = useState<SegmentDetailResponse | null>(null);
  const [segmentLoading, setSegmentLoading] = useState(false);
  const [segmentError, setSegmentError] = useState<string | null>(null);

  // ── Utterance-Level Edit State ────────────────────────────────
  const [utteranceEdits, setUtteranceEdits] = useState<UtteranceCorrection[]>([]);
  const [activeUtteranceIndex, setActiveUtteranceIndex] = useState<number | null>(null);

  // ── Sidebar State ─────────────────────────────────────────────
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

  // ── Computed Values ───────────────────────────────────────────
  const activeUtterance = useMemo(() => {
    if (activeUtteranceIndex === null || activeUtteranceIndex >= utteranceEdits.length) return null;
    return utteranceEdits[activeUtteranceIndex];
  }, [activeUtteranceIndex, utteranceEdits]);

  const segmentStart = useMemo(() => {
    if (utteranceEdits.length === 0) return 0;
    return Math.min(...utteranceEdits.map((u) => u.start));
  }, [utteranceEdits]);

  const segmentEnd = useMemo(() => {
    if (utteranceEdits.length === 0) return 0;
    return Math.max(...utteranceEdits.map((u) => u.end));
  }, [utteranceEdits]);

  // Active utterance 1-based position
  const activeUtterancePosition = useMemo(() => {
    if (activeUtteranceIndex === null) return undefined;
    return activeUtteranceIndex + 1;
  }, [activeUtteranceIndex]);

  // ── Load Segment Detail ───────────────────────────────────────

  const loadSegment = useCallback(async (segmentId: string) => {
    setSegmentLoading(true);
    setSegmentError(null);
    setActionMessage(null);
    try {
      const data = await annotationApi.getSegment(segmentId);
      setSegment(data);

      // Initialize utterance edits from current_utterances (existing edit)
      // or fall back to transcripts (ASR original)
      if (data.current_utterances && data.current_utterances.length > 0) {
        setUtteranceEdits(data.current_utterances);
        setActiveUtteranceIndex(0);
      } else if (data.transcripts && data.transcripts.length > 0) {
        setUtteranceEdits(
          data.transcripts.map((t) => ({
            utterance_index: t.utterance_index,
            text: t.text,
            start: t.start,
            end: t.end,
          }))
        );
        setActiveUtteranceIndex(0);
      } else {
        setUtteranceEdits([]);
        setActiveUtteranceIndex(null);
      }

      // Auto-populate latestEditId from existing edit history
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
    setLatestEditId(editId ?? null);
    setSyncStatus(null);
    // Auto-collapse both sidebars when segment is selected
    setSidebarCollapsed(true);
    window.dispatchEvent(new Event('collapse-main-sidebar'));
  };

  const handleBackToQueue = () => {
    setSelectedSegmentId(null);
    setSegment(null);
    setIsPlaying(false);
    setLatestEditId(null);
    setSyncStatus(null);
    setUtteranceEdits([]);
    setActiveUtteranceIndex(null);
    // Re-expand both sidebars
    setSidebarCollapsed(false);
    window.dispatchEvent(new Event('expand-main-sidebar'));
  };

  const handleUtteranceChange = (index: number, updates: Partial<UtteranceCorrection>) => {
    setUtteranceEdits((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], ...updates };
      }
      return next;
    });
  };

  const handleTrimChange = (start: number, end: number) => {
    // Update only the active utterance's boundaries from filmstrip drag
    if (activeUtteranceIndex === null) return;
    setUtteranceEdits((prev) => {
      const next = [...prev];
      if (next[activeUtteranceIndex]) {
        next[activeUtteranceIndex] = { ...next[activeUtteranceIndex], start, end };
      }
      return next;
    });
  };

  const handleSelectUtterance = (index: number) => {
    setActiveUtteranceIndex(index);
    // Seek video to the start of the selected utterance
    const utt = utteranceEdits[index];
    if (utt) {
      setCurrentTime(utt.start);
      setIsPlaying(false);
    }
  };

  const handlePrevUtterance = () => {
    if (activeUtteranceIndex !== null && activeUtteranceIndex > 0) {
      handleSelectUtterance(activeUtteranceIndex - 1);
    }
  };

  const handleNextUtterance = () => {
    if (activeUtteranceIndex !== null && activeUtteranceIndex < utteranceEdits.length - 1) {
      handleSelectUtterance(activeUtteranceIndex + 1);
    }
  };

  // ── API Actions ───────────────────────────────────────────────

  const handleSaveDraft = async () => {
    if (!selectedSegmentId || utteranceEdits.length === 0) return;
    setIsSaving(true);
    setActionMessage(null);
    try {
      const result = await annotationApi.saveDraft(selectedSegmentId, {
        utterances: utteranceEdits,
      });
      setActionMessage(result.message || 'Draft tersimpan');
      if (result.edit_id) {
        setLatestEditId(result.edit_id);
      }
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

  const handleReset = async () => {
    if (!selectedSegmentId) return;
    try {
      const result = await annotationApi.resetToOriginal(selectedSegmentId);
      setActionMessage(result.message);
      if (result.reverted_to) {
        if (segment && segment.transcripts.length > 0) {
          setUtteranceEdits(
            segment.transcripts.map((t) => ({
              utterance_index: t.utterance_index,
              text: t.text,
              start: t.start,
              end: t.end,
            }))
          );
        }
      }
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
      const status = await annotationApi.checkSubmissionStatus(selectedSegmentId);
      const confirmNoChanges = !status.has_edits;

      const result = await annotationApi.submitForReview(selectedSegmentId, {
        confirm_no_changes: confirmNoChanges,
      });
      setActionMessage(`✅ ${result.message}`);
      setReviewStatus(result.status);
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
      {/* Header — compact */}
      <header className="bg-white border-b border-gray-200 px-4 py-2 flex-shrink-0">
        <div className="flex items-center gap-3">
          {selectedSegmentId && (
            <Button variant="ghost" size="sm" onClick={handleBackToQueue} className="h-8 px-2">
              <ArrowLeft size={16} />
            </Button>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <PenTool size={18} className="text-teal-600" />
              {selectedSegmentId ? 'Workspace Anotasi' : 'Antrian Anotasi'}
            </h1>
            {selectedSegmentId && segment && (
              <p className="text-[11px] text-gray-500 truncate" title={segment.original_filename}>
                <span className="font-medium text-gray-600">{segment.original_filename}</span>
                <span className="text-gray-300 mx-1.5">·</span>
                <span className="text-teal-600">Segmen #{segment.segment_id.slice(0, 8)}</span>
                {segment.transcripts.length > 0 && (
                  <>
                    <span className="text-gray-300 mx-1.5">·</span>
                    <span>{segment.transcripts.length} utterances</span>
                  </>
                )}
              </p>
            )}
          </div>
          {/* Status indicators */}
          <div className="flex items-center gap-2 flex-shrink-0">
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
              <div className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-lg max-w-xs truncate">
                {actionMessage}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Queue Sidebar — collapsible */}
        <AnnotationQueue
          onSelectSegment={handleSelectSegment}
          selectedSegmentId={selectedSegmentId}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Main Content */}
        {!selectedSegmentId ? (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center max-w-xs">
              <PenTool size={48} className="text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500">Pilih segmen untuk dianotasi</p>
              <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                Klik video berita di panel kiri, lalu pilih segmen transkrip untuk mulai menganotasi bahasa isyarat.
              </p>
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
          <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden gap-2 p-3">

            {/* ── Top row: Video (left) + Editor (right) ── */}
            <div className="flex gap-2 min-h-0" style={{ flex: '1 1 auto' }}>

              {/* Left: Video player — compact, fits video aspect ratio */}
              <div className="flex flex-col gap-2" style={{ flex: '0 0 60%', minWidth: 0 }}>
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

                {/* Sync Workbench under the video if active */}
                {latestEditId && selectedSegmentId && (
                  <SyncWorkbench
                    editId={latestEditId}
                    segmentId={selectedSegmentId}
                    onSyncStatusChange={setSyncStatus}
                  />
                )}
              </div>

              {/* Right: Annotation editor panel */}
              <div className="flex-1 min-w-0 min-h-0 overflow-hidden">
                <PropertiesPanel
                  segment={segment}
                  utteranceEdits={utteranceEdits}
                  onUtteranceChange={handleUtteranceChange}
                  activeUtteranceIndex={activeUtteranceIndex}
                  onSelectUtterance={handleSelectUtterance}
                  onSaveDraft={handleSaveDraft}
                  onSubmit={handleSubmit}
                  onReset={handleReset}
                  isSaving={isSaving}
                  canSubmit={canSubmit}
                  submitWarning={submitWarning}
                  reviewStatus={reviewStatus}
                  reviewFeedback={reviewFeedback}
                />
              </div>
            </div>

            {/* ── Bottom: Full-width filmstrip timeline ── */}
            <div className="flex-shrink-0">
              <TimelineEditor
                videoUrl={segment.video_url}
                duration={duration}
                currentTime={currentTime}
                isPlaying={isPlaying}
                onTimeUpdate={setCurrentTime}
                trimStart={activeUtterance?.start ?? segmentStart}
                trimEnd={activeUtterance?.end ?? segmentEnd}
                onTrimChange={handleTrimChange}
                activeUtterance={activeUtterance ? { index: activeUtterance.utterance_index, start: activeUtterance.start, end: activeUtterance.end } : null}
                allUtterances={utteranceEdits}
                onPrevUtterance={handlePrevUtterance}
                onNextUtterance={handleNextUtterance}
                utteranceCount={utteranceEdits.length}
                activeUtterancePosition={activeUtterancePosition}
              />
            </div>

          </div>
        ) : null}

      </div>
    </div>
  );
}
