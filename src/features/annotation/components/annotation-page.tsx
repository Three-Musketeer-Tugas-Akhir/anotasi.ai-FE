'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { PenTool, ArrowLeft, Loader2, AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VideoPlayer } from './video-player';
import { TimelineEditor } from './timeline-editor';
import { PropertiesPanel } from './properties-panel';
import { AnnotationQueue } from './annotation-queue';
import { annotationApi } from '../annotation-api';
import type { SegmentDetailResponse, UtteranceCorrection, TranscriptUtterance } from '../annotation-types';

export function AnnotationPage() {
  // ── Job Selection ─────────────────────────────────────────
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [jobMetadata, setJobMetadata] = useState<{ original_filename: string; job_id: string } | null>(null);
  const [jobLoading, setJobLoading] = useState(false);
  const [jobError, setJobError] = useState<string | null>(null);
  
  // Need to hold the video URL (which is the same across all segments of a job)
  const [jobVideoUrl, setJobVideoUrl] = useState<string | null>(null);

  // ── Utterance-Level Data ────────────────────────────────
  const [originalUtterances, setOriginalUtterances] = useState<TranscriptUtterance[]>([]);
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

  const activeUtterancePosition = useMemo(() => {
    if (activeUtteranceIndex === null) return undefined;
    return activeUtteranceIndex + 1;
  }, [activeUtteranceIndex]);

  // ── Load Job ───────────────────────────────────────

  const loadJob = useCallback(async (jobId: string) => {
    setJobLoading(true);
    setJobError(null);
    setActionMessage(null);
    try {
      // 1. Get queue to find all segments for this job
      const queueData = await annotationApi.getQueue({ page: 1, page_size: 1000 });
      const jobItems = queueData.items.filter((i) => i.job_id === jobId);
      if (jobItems.length === 0) throw new Error('Job tidak ditemukan di antrian');
      
      setJobMetadata({
        original_filename: jobItems[0].original_filename,
        job_id: jobId
      });

      // 2. Fetch all segments in parallel
      const segmentsData = await Promise.all(
        jobItems.map((item) => annotationApi.getSegment(item.segment_id))
      );

      // We assume video_url is the same for all segments of the same job
      if (segmentsData.length > 0 && segmentsData[0].video_url) {
        setJobVideoUrl(segmentsData[0].video_url);
      }

      // 3. Flatten utterances
      const allOriginal: TranscriptUtterance[] = [];
      const allEdits: UtteranceCorrection[] = [];

      segmentsData.forEach((data) => {
        // Collect original ASR transcripts
        if (data.transcripts && data.transcripts.length > 0) {
          const mappedOriginal = data.transcripts.map((t) => ({
            ...t,
            segment_id: data.segment_id,
          }));
          allOriginal.push(...mappedOriginal);
        }

        // Collect current edits or fall back to ASR
        if (data.current_utterances && data.current_utterances.length > 0) {
          allEdits.push(...data.current_utterances.map((u) => ({
            ...u,
            segment_id: data.segment_id,
            // Fallback confidence from transcript if possible
            confidence: data.transcripts.find((t) => t.utterance_index === u.utterance_index)?.confidence
          })));
        } else if (data.transcripts && data.transcripts.length > 0) {
          allEdits.push(...data.transcripts.map((t) => ({
            utterance_index: t.utterance_index,
            text: t.text,
            start: t.start,
            end: t.end,
            segment_id: data.segment_id,
            confidence: t.confidence
          })));
        }
      });

      // Sort both arrays by start time
      allOriginal.sort((a, b) => a.start - b.start);
      allEdits.sort((a, b) => a.start - b.start);
      
      setOriginalUtterances(allOriginal);
      setUtteranceEdits(allEdits);
      setActiveUtteranceIndex(allEdits.length > 0 ? 0 : null);

      // For status/submit logic, we check the first segment as a representative.
      // In a real multi-segment submit, backend might need an update, but we work around it here.
      try {
        const subStatus = await annotationApi.checkSubmissionStatus(jobItems[0].segment_id);
        setCanSubmit(subStatus.can_submit);
        setSubmitWarning(subStatus.warning ?? null);
      } catch {
        setCanSubmit(true);
        setSubmitWarning(null);
      }

      try {
        const revStatus = await annotationApi.getReviewStatus(jobItems[0].segment_id);
        setReviewStatus(revStatus.status);
        setReviewFeedback(revStatus.feedback ?? null);
      } catch {
        setReviewStatus(null);
        setReviewFeedback(null);
      }

    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.detail || 'Gagal memuat job details';
      setJobError(typeof msg === 'string' ? msg : 'Gagal memuat job details');
    } finally {
      setJobLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedJobId) {
      loadJob(selectedJobId);
    }
  }, [selectedJobId, loadJob]);

  // ── Handlers ──────────────────────────────────────────────────

  const handleSelectJob = (jobId: string) => {
    setSelectedJobId(jobId);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setSidebarCollapsed(true);
    window.dispatchEvent(new Event('collapse-main-sidebar'));
  };

  const handleBackToQueue = () => {
    setSelectedJobId(null);
    setJobMetadata(null);
    setIsPlaying(false);
    setUtteranceEdits([]);
    setOriginalUtterances([]);
    setActiveUtteranceIndex(null);
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
    if (activeUtteranceIndex === null) return;
    setUtteranceEdits((prev) => {
      const next = [...prev];
      const current = next[activeUtteranceIndex];
      if (!current) return next;

      let newStart = start;
      let newEnd = end;
      const prevUtterance = next[activeUtteranceIndex - 1];
      const nextUtterance = next[activeUtteranceIndex + 1];

      // Left Spillover
      if (prevUtterance) {
        if (prevUtterance.status === 'OK') {
          newStart = Math.max(newStart, prevUtterance.end);
        } else {
          if (newStart < prevUtterance.end) {
            next[activeUtteranceIndex - 1] = { ...prevUtterance, end: newStart };
            if (next[activeUtteranceIndex - 1].end <= next[activeUtteranceIndex - 1].start) {
              next[activeUtteranceIndex - 1].end = next[activeUtteranceIndex - 1].start + 0.1;
              newStart = next[activeUtteranceIndex - 1].end;
            }
          }
        }
      }

      // Right Spillover
      if (nextUtterance) {
        if (nextUtterance.status === 'OK') {
          newEnd = Math.min(newEnd, nextUtterance.start);
        } else {
          if (newEnd > nextUtterance.start) {
            next[activeUtteranceIndex + 1] = { ...nextUtterance, start: newEnd };
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

  const saveDraftForAllSegments = async (edits: UtteranceCorrection[]) => {
    const grouped = edits.reduce((acc, utt) => {
      const sid = utt.segment_id;
      if (sid) {
        if (!acc[sid]) acc[sid] = [];
        acc[sid].push(utt);
      }
      return acc;
    }, {} as Record<string, UtteranceCorrection[]>);

    await Promise.all(
      Object.entries(grouped).map(([sid, utts]) =>
        annotationApi.saveDraft(sid, { utterances: utts })
      )
    );
  };

  const handleSaveDraft = async () => {
    if (!selectedJobId || utteranceEdits.length === 0) return;
    setIsSaving(true);
    setActionMessage(null);
    try {
      await saveDraftForAllSegments(utteranceEdits);
      setActionMessage('Draft tersimpan');
      await loadJob(selectedJobId);
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.detail || 'Gagal menyimpan draft';
      setActionMessage(typeof msg === 'string' ? `❌ ${msg}` : '❌ Gagal menyimpan draft');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkOk = async (index: number) => {
    if (!selectedJobId || utteranceEdits.length === 0) return;
    const targetUtt = utteranceEdits[index];
    if (!targetUtt || !targetUtt.segment_id) return;

    setIsSaving(true);
    setActionMessage('Menyimpan perubahan ke draft...');
    try {
      // 1. Save all drafts first
      await saveDraftForAllSegments(utteranceEdits);
      
      // 2. Trigger physical crop
      setActionMessage('✂️ Memotong video fisik...');
      const cropResult = await annotationApi.cropUtterance(targetUtt.segment_id, targetUtt.utterance_index);
      setActionMessage(`✅ ${cropResult.message || 'Video berhasil dipotong'}`);
      
      // 3. Reload job
      await loadJob(selectedJobId);
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.detail || 'Gagal memotong video';
      setActionMessage(typeof msg === 'string' ? `❌ ${msg}` : '❌ Gagal memotong video');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!selectedJobId) return;
    try {
      const segmentIds = Array.from(new Set(utteranceEdits.map((u) => u.segment_id).filter(Boolean))) as string[];
      await Promise.all(segmentIds.map((sid) => annotationApi.resetToOriginal(sid)));
      
      setActionMessage('Anotasi direset');
      await loadJob(selectedJobId);
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.detail || 'Gagal mereset anotasi';
      setActionMessage(typeof msg === 'string' ? `❌ ${msg}` : '❌ Gagal mereset anotasi');
    }
  };

  const handleSubmit = async () => {
    if (!selectedJobId) return;
    try {
      const segmentIds = Array.from(new Set(utteranceEdits.map((u) => u.segment_id).filter(Boolean))) as string[];
      await Promise.all(segmentIds.map(async (sid) => {
        const status = await annotationApi.checkSubmissionStatus(sid);
        const confirmNoChanges = !status.has_edits;
        return annotationApi.submitForReview(sid, { confirm_no_changes: confirmNoChanges });
      }));

      setActionMessage(`✅ Berhasil submit ke kurator`);
      await loadJob(selectedJobId);
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.detail || 'Gagal submit anotasi';
      setActionMessage(typeof msg === 'string' ? `❌ ${msg}` : '❌ Gagal submit anotasi');
    }
  };

  // ── Hybrid Player Computed Properties ───────────────────────────
  const useCroppedVideo = activeUtterance?.status === 'OK' && activeUtterance?.cropped_video_path;
  const videoSrc = useCroppedVideo ? activeUtterance.cropped_video_path! : (jobVideoUrl ?? '');
  const playerTime = useCroppedVideo && activeUtterance ? Math.max(0, currentTime - activeUtterance.start) : currentTime;
  const handlePlayerTimeUpdate = (t: number) => {
    setCurrentTime(useCroppedVideo && activeUtterance ? t + activeUtterance.start : t);
  };

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="bg-white border-b border-gray-200 px-4 py-2 flex-shrink-0">
        <div className="flex items-center gap-3">
          {selectedJobId && (
            <Button variant="ghost" size="sm" onClick={handleBackToQueue} className="h-8 px-2">
              <ArrowLeft size={16} />
            </Button>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <PenTool size={18} className="text-teal-600" />
              {selectedJobId ? 'Workspace Anotasi' : 'Antrian Anotasi'}
            </h1>
            {selectedJobId && jobMetadata && (
              <p className="text-[11px] text-gray-500 truncate" title={jobMetadata.original_filename}>
                <span className="font-medium text-gray-600">{jobMetadata.original_filename}</span>
                <span className="text-gray-300 mx-1.5">·</span>
                <span>{utteranceEdits.length} kalimat</span>
              </p>
            )}
          </div>
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
        <AnnotationQueue
          onSelectJob={handleSelectJob}
          selectedJobId={selectedJobId}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {!selectedJobId ? (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center max-w-xs">
              <PenTool size={48} className="text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500">Pilih video untuk dianotasi</p>
              <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                Klik video di panel kiri untuk mulai menganotasi bahasa isyarat.
              </p>
            </div>
          </div>
        ) : jobLoading ? (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <Loader2 size={24} className="text-teal-600 animate-spin" />
          </div>
        ) : jobError ? (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <AlertTriangle size={32} className="text-red-400 mx-auto mb-2" />
              <p className="text-sm text-red-600">{jobError}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => loadJob(selectedJobId)}
              >
                <RotateCcw size={14} className="mr-1" /> Coba Lagi
              </Button>
            </div>
          </div>
        ) : jobMetadata ? (
          <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden gap-2 p-3">
            <div className="flex gap-2 min-h-0" style={{ flex: '1 1 auto' }}>
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
                <div className="flex-shrink-0 mt-auto">
                  <TimelineEditor
                    videoUrl={jobVideoUrl ?? ''}
                    duration={duration}
                    currentTime={currentTime}
                    isPlaying={isPlaying}
                    onTimeUpdate={setCurrentTime}
                    trimStart={activeUtterance?.start ?? segmentStart}
                    trimEnd={activeUtterance?.end ?? segmentEnd}
                    onTrimChange={handleTrimChange}
                    activeUtterance={activeUtterance && activeUtteranceIndex !== null ? { index: activeUtteranceIndex, start: activeUtterance.start, end: activeUtterance.end, status: activeUtterance.status } : null}
                    allUtterances={utteranceEdits}
                    onPrevUtterance={handlePrevUtterance}
                    onNextUtterance={handleNextUtterance}
                    utteranceCount={utteranceEdits.length}
                    activeUtterancePosition={activeUtterancePosition}
                  />
                </div>
              </div>

              <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
                <PropertiesPanel
                  originalUtterances={originalUtterances}
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
