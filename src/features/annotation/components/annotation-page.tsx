'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { PenTool, ArrowLeft, Loader2, AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VideoPlayer } from './video-player';
import { TimelineEditor } from './timeline-editor';
import { PropertiesPanel } from './properties-panel';
import { AnnotationQueue } from './annotation-queue';
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
    // Auto-collapse both sidebars when segment is selected
    setSidebarCollapsed(true);
    window.dispatchEvent(new Event('collapse-main-sidebar'));
  };

  const handleBackToQueue = () => {
    setSelectedSegmentId(null);
    setSegment(null);
    setIsPlaying(false);
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
      const current = next[activeUtteranceIndex];
      if (!current) return next;

      let newStart = start;
      let newEnd = end;
      const prevUtterance = next[activeUtteranceIndex - 1];
      const nextUtterance = next[activeUtteranceIndex + 1];

      // Left Spillover & Hard Limit (N-1)
      if (prevUtterance) {
        if (prevUtterance.status === 'OK') {
          // Hard limit: Start of N cannot precede end of N-1 if N-1 is OK
          newStart = Math.max(newStart, prevUtterance.end);
        } else {
          // Spillover: If start of N precedes end of N-1, push N-1's end
          if (newStart < prevUtterance.end) {
            next[activeUtteranceIndex - 1] = { ...prevUtterance, end: newStart };
            // Ensure N-1's end doesn't precede its own start
            if (next[activeUtteranceIndex - 1].end <= next[activeUtteranceIndex - 1].start) {
              next[activeUtteranceIndex - 1].end = next[activeUtteranceIndex - 1].start + 0.1;
              newStart = next[activeUtteranceIndex - 1].end;
            }
          }
        }
      }

      // Right Spillover N+1 Logic & Hard Limit
      if (nextUtterance) {
        if (nextUtterance.status === 'OK') {
          // Hard limit: End of N cannot exceed start of N+1 if N+1 is OK
          newEnd = Math.min(newEnd, nextUtterance.start);
        } else {
          // Spillover: If end of N exceeds start of N+1, push N+1's start
          if (newEnd > nextUtterance.start) {
            next[activeUtteranceIndex + 1] = { ...nextUtterance, start: newEnd };
            // Ensure N+1's start doesn't exceed its own end
            if (next[activeUtteranceIndex + 1].start >= next[activeUtteranceIndex + 1].end) {
              next[activeUtteranceIndex + 1].start = next[activeUtteranceIndex + 1].end - 0.1;
              newEnd = next[activeUtteranceIndex + 1].start;
            }
          }
        }
      }

      next[activeUtteranceIndex] = { ...current, start: newStart, end: newEnd };
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

  const handleMarkOk = async (index: number) => {
    if (!selectedSegmentId || utteranceEdits.length === 0) return;
    setIsSaving(true);
    setActionMessage('Menyimpan perubahan ke draft...');
    try {
      // 1. Save draft to backend to persist N+1 spillover
      await annotationApi.saveDraft(selectedSegmentId, {
        utterances: utteranceEdits,
      });
      
      // 2. Trigger On-The-Fly Crop
      setActionMessage('✂️ Memotong video fisik...');
      const cropResult = await annotationApi.cropUtterance(selectedSegmentId, index);
      setActionMessage(`✅ ${cropResult.message || 'Video berhasil dipotong'}`);
      
      // 3. Reload segment to get cropped_video_path and updated status
      await loadSegment(selectedSegmentId);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Gagal memotong video';
      setActionMessage(typeof msg === 'string' ? `❌ ${msg}` : '❌ Gagal memotong video');
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

  // ── Hybrid Player Computed Properties ───────────────────────────
  const useCroppedVideo = activeUtterance?.status === 'OK' && activeUtterance?.cropped_video_path;
  const videoSrc = useCroppedVideo ? activeUtterance.cropped_video_path! : (segment?.video_url ?? '');
  const playerTime = useCroppedVideo && activeUtterance ? Math.max(0, currentTime - activeUtterance.start) : currentTime;
  const handlePlayerTimeUpdate = (t: number) => {
    setCurrentTime(useCroppedVideo && activeUtterance ? t + activeUtterance.start : t);
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

            {/* ── Main Workspace Area ── */}
            <div className="flex gap-2 min-h-0" style={{ flex: '1 1 auto' }}>

              {/* Left Column: Video + Filmstrip */}
              <div className="flex flex-col gap-2 min-w-0" style={{ flex: '0 0 60%' }}>
                <VideoPlayer
                  src={videoSrc}
                  isPlaying={isPlaying}
                  onPlayPause={setIsPlaying}
                  currentTime={playerTime}
                  onTimeUpdate={handlePlayerTimeUpdate}
                  playbackRate={playbackRate}
                  onPlaybackRateChange={setPlaybackRate}
                  onDurationChange={setDuration}
                />

                {/* Filmstrip under the video */}
                <div className="flex-shrink-0 mt-auto">
                  <TimelineEditor
                    videoUrl={segment.video_url}
                    duration={duration}
                    currentTime={currentTime}
                    isPlaying={isPlaying}
                    onTimeUpdate={setCurrentTime}
                    trimStart={activeUtterance?.start ?? segmentStart}
                    trimEnd={activeUtterance?.end ?? segmentEnd}
                    onTrimChange={handleTrimChange}
                    activeUtterance={activeUtterance ? { index: activeUtterance.utterance_index, start: activeUtterance.start, end: activeUtterance.end, status: activeUtterance.status } : null}
                    allUtterances={utteranceEdits}
                    onPrevUtterance={handlePrevUtterance}
                    onNextUtterance={handleNextUtterance}
                    utteranceCount={utteranceEdits.length}
                    activeUtterancePosition={activeUtterancePosition}
                  />
                </div>
              </div>

              {/* Right Column: Annotation editor panel */}
              <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
                <PropertiesPanel
                  segment={segment}
                  utteranceEdits={utteranceEdits}
                  onUtteranceChange={handleUtteranceChange}
                  activeUtteranceIndex={activeUtteranceIndex}
                  onSelectUtterance={handleSelectUtterance}
                  onSaveDraft={handleSaveDraft}
                  onMarkOk={handleMarkOk}
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

          </div>
        ) : null}

      </div>
    </div>
  );
}
