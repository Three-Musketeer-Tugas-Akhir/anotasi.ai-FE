'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { PenTool, ArrowLeft, Loader2, AlertTriangle, RotateCcw, List, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VideoPlayer } from './video-player';
import { TimelineEditor } from './timeline-editor';
import { PropertiesPanel } from './properties-panel';
import { AnnotationQueue } from './annotation-queue';
import { UtteranceSheet, type SheetFilter } from './utterance-sheet';
import { annotationApi } from '../annotation-api';
import type { UtteranceCorrection, TranscriptUtterance } from '../annotation-types';

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

  // ── Sheet State ──────────────────────────────────────────────
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sheetFilter, setSheetFilter] = useState<SheetFilter>('ALL');

  // ── Sidebar State ─────────────────────────────────────────────
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // ── Video State ───────────────────────────────────────────────
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [duration, setDuration] = useState(0);
  // Cross-segment: when last utterance of segment N finishes, we switch to N+1's video.
  // This tracks the override URL so the workspace (activeUtteranceIndex) stays on N.
  const [crossSegmentVideoUrl, setCrossSegmentVideoUrl] = useState<string | null>(null);

  // ── Action State ──────────────────────────────────────────────
  const [isSaving, setIsSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState<string | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState<string | null>(null);

  // ── Computed Values ───────────────────────────────────────────
  const activeUtterance = useMemo(() => {
    if (activeUtteranceIndex === null || activeUtteranceIndex >= utteranceEdits.length) return null;
    return utteranceEdits[activeUtteranceIndex];
  }, [activeUtteranceIndex, utteranceEdits]);

  const segmentStart = useMemo(() => {
    if (utteranceEdits.length === 0) return 0;
    return Math.min(...utteranceEdits.map((u) => u.global_start ?? u.start));
  }, [utteranceEdits]);

  const segmentEnd = useMemo(() => {
    if (utteranceEdits.length === 0) return 0;
    return Math.max(...utteranceEdits.map((u) => u.global_end ?? u.end));
  }, [utteranceEdits]);

  const activeUtterancePosition = useMemo(() => {
    if (activeUtteranceIndex === null) return undefined;
    return activeUtteranceIndex + 1;
  }, [activeUtteranceIndex]);

  const totalCompleted = utteranceEdits.filter(u => u.status === 'OK').length;
  const totalUtterances = utteranceEdits.length;
  const progressPercent = totalUtterances > 0 ? (totalCompleted / totalUtterances) * 100 : 0;

  // ── Load Job ───────────────────────────────────────

  const loadJob = useCallback(async (jobId: string) => {
    setJobLoading(true);
    setJobError(null);
    setActionMessage(null);
    try {
      // 1. Get queue to find all segments for this job
      const queueData = await annotationApi.getQueue({ page: 1, page_size: 100 });
      const jobItems = queueData.items.filter((i) => i.job_id === jobId);
      if (jobItems.length === 0) throw new Error('Job tidak ditemukan di antrian');
      
      setJobMetadata({
        original_filename: jobItems[0].original_filename,
        job_id: jobId
      });

      // 2. Fetch all segments in parallel
      let segmentsData = await Promise.all(
        jobItems.map((item) => annotationApi.getSegment(item.segment_id))
      );

      // Sort segments sequentially to ensure segment 1 comes before segment 2, etc.
      segmentsData.sort((a, b) => {
        const getIndex = (url: string | undefined | null) => {
          if (!url) return 0;
          const match = url.match(/segment_(\d+)\.mp4/);
          return match ? parseInt(match[1], 10) : 0;
        };
        return getIndex(a.video_url) - getIndex(b.video_url);
      });

      // Store the first segment's video URL as default
      if (segmentsData.length > 0 && segmentsData[0].video_url) {
        setJobVideoUrl(segmentsData[0].video_url);
      }

      // 3. Flatten utterances and build contiguous global timeline
      const allOriginal: TranscriptUtterance[] = [];
      const allEdits: UtteranceCorrection[] = [];

      let currentGlobalTime = 0;

      segmentsData.forEach((data) => {
        // Collect original ASR transcripts
        if (data.transcripts && data.transcripts.length > 0) {
          const mappedOriginal = data.transcripts.map((t) => ({
            ...t,
            segment_id: data.segment_id,
          }));
          mappedOriginal.sort((a, b) => a.start - b.start);
          allOriginal.push(...mappedOriginal);
        }

        // Collect current edits or fall back to ASR
        let segmentEdits: UtteranceCorrection[] = [];
        // Always prefer the full segment video (data.video_url) so the player
        // can seek across utterance N and N+1 seamlessly within the same video.
        const segVideo = data.video_url ?? '';
        // Track the segment's video duration boundary for cross-segment clamping
        const segMaxEnd = data.asr_end ?? data.jbi_end ?? undefined;
        if (data.current_utterances && data.current_utterances.length > 0) {
          // Sort by start BEFORE computing global timeline
          const sortedUtts = [...data.current_utterances].sort((a, b) => a.start - b.start);
          segmentEdits = sortedUtts.map((u) => {
            const transcript = data.transcripts.find((t) => t.utterance_index === u.utterance_index);
            const duration = u.end - u.start;
            const gStart = currentGlobalTime;
            const gEnd = currentGlobalTime + duration;
            currentGlobalTime = gEnd;
            return {
              ...u,
              segment_id: data.segment_id,
              confidence: transcript?.confidence,
              global_start: gStart,
              global_end: gEnd,
              segment_max_end: segMaxEnd,
              // Use full segment video so player spans N and N+1
              segment_video_url: segVideo || u.cropped_video_path || transcript?.video_path,
            };
          });
        } else if (data.transcripts && data.transcripts.length > 0) {
          const sortedTranscripts = [...data.transcripts].sort((a, b) => a.start - b.start);
          segmentEdits = sortedTranscripts.map((t) => {
            const duration = t.end - t.start;
            const gStart = currentGlobalTime;
            const gEnd = currentGlobalTime + duration;
            currentGlobalTime = gEnd;
            return {
              utterance_index: t.utterance_index,
              text: t.text,
              start: t.start,
              end: t.end,
              segment_id: data.segment_id,
              confidence: t.confidence,
              cropped_video_path: t.video_path,
              global_start: gStart,
              global_end: gEnd,
              segment_max_end: segMaxEnd,
              segment_video_url: segVideo || t.video_path,
            };
          });
        }
        // Already sorted before global_start computation — no re-sort needed
        allEdits.push(...segmentEdits);
      });
      
      setOriginalUtterances(allOriginal);
      setUtteranceEdits(allEdits);
      setActiveUtteranceIndex(allEdits.length > 0 ? 0 : null);

      // Review status
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

  // Reset cross-segment override whenever the user manually selects a different utterance.
  useEffect(() => {
    setCrossSegmentVideoUrl(null);
  }, [activeUtteranceIndex]);

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
        // Automatically mark as DRAFT if it was NEW (no status or not OK/DRAFT)
        const newStatus = next[index].status === 'OK' ? 'OK' : 'DRAFT';
        next[index] = { ...next[index], ...updates, status: newStatus };
      }
      return next;
    });
  };

  const handleTrimChange = (globalStart: number, globalEnd: number) => {
    if (activeUtteranceIndex === null) return;
    setUtteranceEdits((prev) => {
      const next = [...prev];
      const current = next[activeUtteranceIndex];
      if (!current) return next;

      let newGlobalStart = globalStart;
      let newGlobalEnd = globalEnd;
      const prevUtterance = next[activeUtteranceIndex - 1];
      const nextUtterance = next[activeUtteranceIndex + 1];

      // Left Spillover (using global timestamps)
      if (prevUtterance) {
        const prevGlobalEnd = prevUtterance.global_end ?? prevUtterance.end;
        if (prevUtterance.status === 'OK') {
          newGlobalStart = Math.max(newGlobalStart, prevGlobalEnd);
        } else {
          if (newGlobalStart < prevGlobalEnd) {
            const shift = prevGlobalEnd - newGlobalStart;
            next[activeUtteranceIndex - 1] = {
              ...prevUtterance,
              end: prevUtterance.end - shift,
              global_end: newGlobalStart,
            };
            if (next[activeUtteranceIndex - 1].end <= next[activeUtteranceIndex - 1].start) {
              next[activeUtteranceIndex - 1].end = next[activeUtteranceIndex - 1].start + 0.1;
              next[activeUtteranceIndex - 1].global_end = (next[activeUtteranceIndex - 1].global_start ?? 0) + 0.1;
              newGlobalStart = next[activeUtteranceIndex - 1].global_end!;
            }
          }
        }
      }

      // Right Spillover (using global timestamps — allows cross-segment overlap)
      if (nextUtterance) {
        const nextGlobalStart = nextUtterance.global_start ?? nextUtterance.start;
        if (nextUtterance.status === 'OK') {
          newGlobalEnd = Math.min(newGlobalEnd, nextGlobalStart);
        } else {
          if (newGlobalEnd > nextGlobalStart) {
            const shift = newGlobalEnd - nextGlobalStart;
            next[activeUtteranceIndex + 1] = {
              ...nextUtterance,
              start: nextUtterance.start + shift,
              global_start: newGlobalEnd,
            };
            if (next[activeUtteranceIndex + 1].start >= next[activeUtteranceIndex + 1].end) {
              next[activeUtteranceIndex + 1].start = next[activeUtteranceIndex + 1].end - 0.1;
              next[activeUtteranceIndex + 1].global_start = (next[activeUtteranceIndex + 1].global_end ?? 0) - 0.1;
              newGlobalEnd = next[activeUtteranceIndex + 1].global_start!;
            }
          }
        }
      }

      // Update current utterance: both local and global
      // offset converts global→ASR so start/end stay in ASR coordinate space
      const offset = (current.global_start ?? current.start) - current.start;
      next[activeUtteranceIndex] = {
        ...current,
        start: newGlobalStart - offset,
        end: newGlobalEnd - offset,
        global_start: newGlobalStart,
        global_end: newGlobalEnd,
      };
      return next;
    });
  };

  const handleSelectUtterance = (index: number) => {
    setActiveUtteranceIndex(index);
    const utt = utteranceEdits[index];
    if (utt) {
      // Use global timestamp for seeking so playhead is correct in continuous timeline
      setCurrentTime(utt.global_start ?? utt.start);
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

  // Strip FE-only virtual fields before sending to backend
  const stripGlobalFields = (utt: UtteranceCorrection): UtteranceCorrection => {
    const { global_start, global_end, segment_offset, segment_video_url, confidence, segment_max_end, ...clean } = utt;
    // Clamp local end to segment video duration to prevent cross-segment
    // trim from exceeding the video file length (e.g. 473.55 > 470.3)
    if (segment_max_end != null && clean.end > segment_max_end) {
      clean.end = segment_max_end;
    }
    // Clamp start to >= 0
    if (clean.start < 0) {
      clean.start = 0;
    }
    return clean;
  };

  const saveDraftForAllSegments = async (edits: UtteranceCorrection[]) => {
    const grouped = edits.reduce((acc, utt) => {
      const sid = utt.segment_id;
      if (sid) {
        if (!acc[sid]) acc[sid] = [];
        acc[sid].push(stripGlobalFields(utt));
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
    setActionMessage('Menyimpan draft...');
    try {
      await saveDraftForAllSegments(utteranceEdits);
      setActionMessage('✅ Draft tersimpan');
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
      
      // 4. Auto-advance if not at the end
      if (index < utteranceEdits.length - 1) {
        setTimeout(() => {
          handleSelectUtterance(index + 1);
        }, 400);
      }
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
      
      setActionMessage('✅ Anotasi direset');
      await loadJob(selectedJobId);
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.detail || 'Gagal mereset anotasi';
      setActionMessage(typeof msg === 'string' ? `❌ ${msg}` : '❌ Gagal mereset anotasi');
    }
  };



  // ── Hybrid Player Computed Properties (Seamless Segment Router) ──

  // N+1 utterance (for cross-segment info)
  const nextUtterance = useMemo(
    () => (activeUtteranceIndex !== null ? utteranceEdits[activeUtteranceIndex + 1] : null),
    [activeUtteranceIndex, utteranceEdits],
  );

  // When crossSegmentVideoUrl is set, we're playing N+1's video — use N+1 as the time context.
  const playingUtterance = useMemo(() => {
    if (crossSegmentVideoUrl && nextUtterance) return nextUtterance;
    return activeUtterance;
  }, [crossSegmentVideoUrl, nextUtterance, activeUtterance]);

  const videoSrc = useMemo(() => {
    if (crossSegmentVideoUrl) return crossSegmentVideoUrl;
    if (activeUtterance?.segment_video_url) return activeUtterance.segment_video_url;
    return jobVideoUrl ?? '';
  }, [crossSegmentVideoUrl, activeUtterance, jobVideoUrl]);

  // Offset: segment-local time = global time + videoOffset
  const videoOffset = useMemo(() => {
    if (!playingUtterance) return 0;
    return (playingUtterance.start ?? 0) - (playingUtterance.global_start ?? 0);
  }, [playingUtterance]);

  // Convert global currentTime → segment-local time for the video element.
  const playerTime = useMemo(() => {
    if (!playingUtterance) return 0;
    const segLocalStart = playingUtterance.start ?? 0;
    const elapsed = currentTime - (playingUtterance.global_start ?? 0);
    return Math.max(0, segLocalStart + elapsed);
  }, [playingUtterance, currentTime]);

  const handlePlayerTimeUpdate = (t: number) => {
    if (!activeUtterance || !playingUtterance) return;
    // Convert segment-local time → global using the currently-playing utterance
    const segLocalStart = playingUtterance.start ?? 0;
    const elapsed = t - segLocalStart;
    const globalTime = (playingUtterance.global_start ?? 0) + elapsed;
    setCurrentTime(globalTime);

    // Determine end of playback window: end of N+1 (or N if no N+1)
    const windowEnd = nextUtterance
      ? (nextUtterance.global_end ?? nextUtterance.end)
      : (activeUtterance.global_end ?? activeUtterance.end);

    // Stop at end of the N+1 window — workspace stays on N.
    if (globalTime >= windowEnd) {
      setIsPlaying(false);
    }
  };

  // Called when the HTML5 video element fires onEnded (file naturally finished).
  // For cross-segment case: switch to N+1's video and keep playing.
  const handleVideoEnded = useCallback(() => {
    if (!activeUtterance || !nextUtterance) { setIsPlaying(false); return; }
    const nextUrl = nextUtterance.segment_video_url ?? '';
    const activeUrl = activeUtterance.segment_video_url ?? '';
    // Only do cross-segment switch if they are different files and we haven't switched yet
    if (nextUrl && nextUrl !== activeUrl && !crossSegmentVideoUrl) {
      setCrossSegmentVideoUrl(nextUrl);
      // currentTime stays at N.global_end; playerTime will compute N+1.start automatically.
      setCurrentTime(nextUtterance.global_start ?? nextUtterance.start);
      // Keep isPlaying true so the new video starts immediately after load
    } else {
      setIsPlaying(false);
    }
  }, [activeUtterance, nextUtterance, crossSegmentVideoUrl]);

  // For the filmstrip: when N+1 is in a different segment video, pass it for composite frames.
  const nextVideoUrl = useMemo(() => {
    if (!nextUtterance || !activeUtterance) return undefined;
    const nUrl = nextUtterance.segment_video_url ?? '';
    const aUrl = activeUtterance.segment_video_url ?? '';
    return nUrl && nUrl !== aUrl ? nUrl : undefined;
  }, [nextUtterance, activeUtterance]);

  const nextVideoOffset = useMemo(() => {
    if (!nextUtterance) return 0;
    return (nextUtterance.start ?? 0) - (nextUtterance.global_start ?? 0);
  }, [nextUtterance]);

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {selectedJobId && (
        <UtteranceSheet
          isOpen={isSheetOpen}
          onClose={() => setIsSheetOpen(false)}
          utterances={utteranceEdits}
          originalUtterances={originalUtterances}
          activeIndex={activeUtteranceIndex}
          onJump={handleSelectUtterance}
          filter={sheetFilter}
          onFilterChange={setSheetFilter}
        />
      )}

      {/* 1. TOP NAVBAR & GLOBAL PROGRESS */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          {selectedJobId && (
            <Button variant="ghost" size="sm" onClick={handleBackToQueue} className="h-10 px-3">
              <ArrowLeft size={18} />
            </Button>
          )}
          <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-inner shrink-0">
            A
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-slate-800 leading-tight flex items-center gap-2">
              {!selectedJobId && <PenTool size={18} className="text-teal-600" />}
              {selectedJobId && jobMetadata ? jobMetadata.original_filename : 'Antrian Anotasi'}
            </h1>
            <p className="text-sm text-slate-500 font-medium truncate">
              {selectedJobId ? 'Workspace Anotasi JBI' : 'Pilih video untuk mulai bekerja'}
            </p>
          </div>
          {actionMessage && (
            <div className="bg-slate-100 text-slate-700 text-xs px-3 py-1.5 rounded-lg max-w-xs truncate font-medium">
              {actionMessage}
            </div>
          )}
        </div>

        {/* Right side: Progress & Sheet Trigger */}
        {selectedJobId && (
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end w-[250px] hidden md:flex">
              <div className="flex justify-between w-full mb-1">
                <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                  Progres
                </span>
                <span className="text-sm font-bold text-teal-700">
                  {totalCompleted} / {totalUtterances} Selesai
                </span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner border border-slate-200">
                <div
                  className="h-full bg-teal-500 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="w-px h-10 bg-slate-200 hidden md:block"></div>

            <button
              onClick={() => setIsSheetOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-xl font-bold transition-all shadow-sm"
            >
              <List size={18} /> Daftar Kalimat
            </button>
          </div>
        )}
      </header>

      <div className="flex-1 flex overflow-hidden">
        <AnnotationQueue
          onSelectJob={handleSelectJob}
          selectedJobId={selectedJobId}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {!selectedJobId ? (
          <div className="flex-1 flex items-center justify-center bg-slate-50">
            <div className="text-center max-w-xs">
              <PenTool size={48} className="text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-500">Pilih video untuk dianotasi</p>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Klik video di panel kiri untuk mulai menganotasi bahasa isyarat.
              </p>
            </div>
          </div>
        ) : jobLoading ? (
          <div className="flex-1 flex items-center justify-center bg-slate-50">
            <Loader2 size={24} className="text-teal-600 animate-spin" />
          </div>
        ) : jobError ? (
          <div className="flex-1 flex items-center justify-center bg-slate-50">
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
          <div className="flex-1 flex bg-slate-900 overflow-hidden">
            {/* 2. LEFT PANEL: VIDEO & TIMELINE */}
            <div className="flex-[0_0_60%] flex flex-col bg-slate-900 relative">
              <div className="flex-1 p-6 flex flex-col items-center justify-center relative min-h-0">
                <div className="w-full max-w-4xl max-h-full aspect-video">
                  <VideoPlayer
                    src={videoSrc}
                    isPlaying={isPlaying}
                    onPlayPause={setIsPlaying}
                    currentTime={playerTime}
                    onTimeUpdate={handlePlayerTimeUpdate}
                    playbackRate={playbackRate}
                    onPlaybackRateChange={setPlaybackRate}
                    onDurationChange={setDuration}
                    onEnded={handleVideoEnded}
                  />
                </div>
                
                {/* Contextual Trigger for Sheet */}
                <div className="mt-6 flex items-center justify-center gap-2">
                  <button
                    onClick={handlePrevUtterance}
                    disabled={activeUtteranceIndex === null || activeUtteranceIndex === 0}
                    className="flex items-center gap-3 bg-slate-800 hover:bg-slate-700 px-6 py-3 rounded-xl border border-slate-700 shadow-inner group transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} className="text-slate-400 group-hover:text-white" />
                    <span className="text-white font-bold text-sm">Kalimat Sebelumnya</span>
                  </button>

                  <button
                    onClick={() => setIsSheetOpen(true)}
                    className="flex items-center gap-4 bg-slate-800 hover:bg-slate-700 px-6 py-3 rounded-[32px] border border-slate-700 shadow-inner group cursor-pointer transition-colors"
                    title="Klik untuk melihat daftar kalimat"
                  >
                    <span className="text-slate-400 text-sm font-medium">Posisi saat ini:</span>
                    <span className="text-white font-bold text-lg flex items-center gap-2">
                      Kalimat ke-{(activeUtteranceIndex ?? 0) + 1}
                      <Search size={16} className="text-slate-400 group-hover:text-white transition-colors" />
                    </span>
                  </button>

                  <button
                    onClick={handleNextUtterance}
                    disabled={activeUtteranceIndex === null || activeUtteranceIndex === utteranceEdits.length - 1}
                    className="flex items-center gap-3 bg-slate-800 hover:bg-slate-700 px-6 py-3 rounded-xl border border-slate-700 shadow-inner group transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="text-white font-bold text-sm">Kalimat Selanjutnya</span>
                    <ChevronRight size={16} className="text-slate-400 group-hover:text-white" />
                  </button>
                </div>
              </div>

              <div className="flex-shrink-0 mt-auto bg-slate-950 p-2 border-t border-slate-800">
                <TimelineEditor
                  videoUrl={activeUtterance?.segment_video_url ?? jobVideoUrl ?? ''}
                  videoOffset={videoOffset}
                  nextVideoUrl={nextVideoUrl}
                  nextVideoBoundaryGlobal={activeUtterance?.global_end}
                  nextVideoOffset={nextVideoOffset}
                  duration={segmentEnd}
                  currentTime={currentTime}
                  isPlaying={isPlaying}
                  onTimeUpdate={setCurrentTime}
                  trimStart={activeUtterance?.global_start ?? segmentStart}
                  trimEnd={activeUtterance?.global_end ?? segmentEnd}
                  onTrimChange={handleTrimChange}
                  activeUtterance={activeUtterance && activeUtteranceIndex !== null ? { index: activeUtteranceIndex, start: activeUtterance.global_start ?? activeUtterance.start, end: activeUtterance.global_end ?? activeUtterance.end, status: activeUtterance.status } : null}
                  allUtterances={utteranceEdits}
                  onPrevUtterance={handlePrevUtterance}
                  onNextUtterance={handleNextUtterance}
                  utteranceCount={utteranceEdits.length}
                  activeUtterancePosition={activeUtterancePosition}
                />
              </div>
            </div>

            {/* 3. RIGHT PANEL: THE TASK */}
            <div className="flex-[0_0_40%] bg-white border-l border-slate-200 flex flex-col shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] z-20 min-w-[350px]">
              <PropertiesPanel
                originalUtterances={originalUtterances}
                utteranceEdits={utteranceEdits}
                onUtteranceChange={handleUtteranceChange}
                activeUtteranceIndex={activeUtteranceIndex}
                onSelectUtterance={handleSelectUtterance}
                onSaveDraft={handleSaveDraft}
                onMarkOk={handleMarkOk}
                onReset={handleReset}
                isSaving={isSaving}
                reviewStatus={reviewStatus}
                reviewFeedback={reviewFeedback}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
