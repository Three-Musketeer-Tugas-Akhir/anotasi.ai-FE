'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { PenTool, ArrowLeft, Loader2, AlertTriangle, RotateCcw, List, Search, ChevronLeft, ChevronRight, Maximize2, Minimize2, Lock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useDatasetMode } from '@/features/dataset';
import { VideoPlayer } from './video-player';
import { TimelineEditor } from './timeline-editor';
import { PropertiesPanel } from './properties-panel';
import { AnnotationQueue } from './annotation-queue';
import { UtteranceSheet, type SheetFilter } from './utterance-sheet';
import { annotationApi } from '../annotation-api';
import type { UtteranceCorrection, TranscriptUtterance } from '../annotation-types';

export function AnnotationPage() {
  // ── Dataset mode ──────────────────────────────────────────
  // Dataset non-iNews sudah melewati pengolahan end-to-end: glosa terkunci dan
  // filmstrip hanya boleh diubah untuk kalimat yang statusnya belum OK.
  const { isProcessed } = useDatasetMode();

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
  const [isFocusMode, setIsFocusMode] = useState(false);

  // ── Video State ───────────────────────────────────────────────
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [duration, setDuration] = useState(0);
  // VIDEO-EDITOR-SIBI STYLE: merged video (utterance N + N+1)
  const [mergedVideoUrl, setMergedVideoUrl] = useState<string | null>(null);
  const [videoNDuration, setVideoNDuration] = useState<number>(0);
  const [mergedTotalDuration, setMergedTotalDuration] = useState<number>(0);
  // Global time of the merged tape's LEFT edge (= the cascade floor).
  // mergedBase = active.global_start - head_offset - prev_offset. When the annotator
  // trimmed in their own head, head_offset > 0 so the tape starts before global_start
  // and the region [mergedBase, global_start] is the recoverable gray head. Lookback
  // pushes the edge further left by prev_offset, the orphan tail of kalimat N-1.
  const [mergedBase, setMergedBase] = useState<number>(0);
  // Loading state saat merge video sedang diproses on-demand
  const [isMergeLoading, setIsMergeLoading] = useState<boolean>(false);
  // Ref untuk menghindari race condition saat load merged video
  const activeUttRequestRef = useRef<number | null>(null);

  // ── Lookback State (sisa potongan kalimat N-1) ────────────────
  // Kalimat N-1 yang dipendekkan meninggalkan potongan yang tidak dimiliki siapa pun.
  // Potongan itu duduk persis sebelum klip N, jadi bisa disambung ke depan tape agar
  // handle start bisa ditarik mundur ke sana.
  const [lookbackOn, setLookbackOn] = useState(false);
  const [prevOffset, setPrevOffset] = useState(0);
  const [prevAvailable, setPrevAvailable] = useState(0);

  // ── Action State ──────────────────────────────────────────────
  const [isSaving, setIsSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState<string | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState<string | null>(null);

  // ── Readiness State (play guard) ──────────────────────────────
  const [videoReady, setVideoReady] = useState(false);
  const [filmstripReady, setFilmstripReady] = useState(false);
  const playDisabled = !videoReady || !filmstripReady;

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

  // Pada dataset terproses, hanya kalimat yang belum OK yang filmstrip-nya bisa digeser.
  const isTrimLocked = isProcessed && activeUtterance?.status === 'OK';

  const totalCompleted = utteranceEdits.filter(u => u.status === 'OK').length;
  const totalUtterances = utteranceEdits.length;
  const progressPercent = totalUtterances > 0 ? (totalCompleted / totalUtterances) * 100 : 0;

  // ── Load Job ───────────────────────────────────────

  const fetchMergedVideoForUtterance = useCallback(async (
    utt: UtteranceCorrection,
    requestId: number,
    includePrev = false,
  ) => {
    setMergedVideoUrl(null);
    setVideoNDuration(0);
    setMergedTotalDuration(0);
    setPrevOffset(0);
    // Default base = global_start (no gray head); overwritten once head_offset arrives.
    setMergedBase(utt?.global_start ?? utt?.start ?? 0);
    setVideoReady(false);
    setFilmstripReady(false);
    setIsMergeLoading(true);

    if (utt && utt.segment_id) {
      try {
        const merged = await annotationApi.getMergedVideo(utt.segment_id, utt.utterance_index, includePrev);
        if (activeUttRequestRef.current === requestId) {
          const prepended = merged.prev_offset ?? 0;
          setMergedVideoUrl(merged.merged_video_url);
          setVideoNDuration(merged.video_n_duration);
          setMergedTotalDuration(merged.total_duration);
          setPrevOffset(prepended);
          setPrevAvailable(merged.prev_available ?? 0);
          // Tape begins at the floor; the handle (global_start) sits head_offset in.
          // With lookback the tape starts prev_offset earlier still.
          setMergedBase((utt.global_start ?? utt.start ?? 0) - (merged.head_offset ?? 0) - prepended);
        }
      } catch (err) {
        console.warn('Failed to load merged video:', err);
        if (activeUttRequestRef.current === requestId) {
          setMergedVideoUrl(null);
          setVideoNDuration(0);
          setMergedTotalDuration(0);
          setPrevOffset(0);
          setPrevAvailable(0);
          setMergedBase(utt?.global_start ?? utt?.start ?? 0);
        }
      } finally {
        if (activeUttRequestRef.current === requestId) {
          setIsMergeLoading(false);
        }
      }
    } else {
      setIsMergeLoading(false);
    }
  }, []);

  const loadJob = useCallback(async (jobId: string) => {
    setJobLoading(true);
    setJobError(null);
    setActionMessage(null);
    try {
      // 1. Get every queue entry for this job (server-side filter, all pages)
      const jobItems = await annotationApi.getQueueForJob(jobId);
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
      // segment_index is authoritative; the filename fallback only covers older
      // backends, and it collapses to 0 for datasets whose segments carry no
      // `segment_NNNN.mp4` video (e.g. TVRI, imported as per-utterance clips).
      segmentsData.sort((a, b) => {
        const getIndex = (data: (typeof segmentsData)[number]) => {
          if (typeof data.segment_index === 'number') return data.segment_index;
          const match = data.video_url?.match(/segment_(\d+)\.mp4/);
          return match ? parseInt(match[1], 10) : 0;
        };
        return getIndex(a) - getIndex(b);
      });

      // Store the first segment's video URL as default
      if (segmentsData.length > 0 && segmentsData[0].video_url) {
        setJobVideoUrl(segmentsData[0].video_url);
      }

      // 3. Flatten utterances and build contiguous global timeline
      const allOriginal: TranscriptUtterance[] = [];
      const allEdits: UtteranceCorrection[] = [];

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

        let segmentEdits: UtteranceCorrection[] = [];
        // Always prefer the full segment video (data.video_url) so the player
        // can seek across utterance N and N+1 seamlessly within the same video.
        const segVideo = data.video_url ?? '';
        // Use full segment video so player spans N and N+1 seamlessly
        if (data.current_utterances && data.current_utterances.length > 0) {
          // Sort by start
          const sortedUtts = [...data.current_utterances].sort((a, b) => a.start - b.start);
          segmentEdits = sortedUtts.map((u) => {
            const transcript = data.transcripts.find((t) => t.utterance_index === u.utterance_index);
            const duration = u.end - u.start;
            return {
              ...u,
              segment_id: data.segment_id,
              confidence: transcript?.confidence,
              global_start: u.start,
              global_end: u.end,
              // Use full segment video so player spans N and N+1
              segment_video_url: segVideo || u.cropped_video_path || transcript?.video_path,
            };
          });
        } else if (data.transcripts && data.transcripts.length > 0) {
          const sortedTranscripts = [...data.transcripts].sort((a, b) => a.start - b.start);
          segmentEdits = sortedTranscripts.map((t) => {
            return {
              utterance_index: t.utterance_index,
              text: t.text,
              start: t.start,
              end: t.end,
              segment_id: data.segment_id,
              confidence: t.confidence,
              cropped_video_path: t.video_path,
              global_start: t.start,
              global_end: t.end,
              segment_video_url: segVideo || t.video_path,
            };
          });
        }
        // Already sorted before global_start computation — no re-sort needed
        allEdits.push(...segmentEdits);
      });

      setOriginalUtterances(allOriginal);
      setUtteranceEdits(allEdits);
      
      if (allEdits.length > 0) {
        setActiveUtteranceIndex(0);
        const firstUtt = allEdits[0];
        // Manually trigger the fetch for the first utterance
        activeUttRequestRef.current = 0;
        fetchMergedVideoForUtterance(firstUtt, 0);
      } else {
        setActiveUtteranceIndex(null);
      }

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
  }, [fetchMergedVideoForUtterance]);

  useEffect(() => {
    if (selectedJobId) {
      loadJob(selectedJobId);
    }
  }, [selectedJobId, loadJob]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('toggle-top-bar', { detail: { hidden: isFocusMode } }));

    return () => {
      window.dispatchEvent(new CustomEvent('toggle-top-bar', { detail: { hidden: false } }));
    };
  }, [isFocusMode]);

  // NOTE: mergedVideoUrl is loaded asynchronously inside handleSelectUtterance

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
        // Revert status to DRAFT whenever any change is made — even if it was OK.
        // This signals to the user that the utterance needs to be re-saved & re-cropped.
        next[index] = { ...next[index], ...updates, status: 'DRAFT' };
      }
      return next;
    });
  };

  const handleTrimChange = (globalStart: number, globalEnd: number) => {
    if (activeUtteranceIndex === null) return;
    // Guard kedua di luar UI: kalimat OK pada dataset terproses tidak boleh di-trim.
    if (isProcessed && utteranceEdits[activeUtteranceIndex]?.status === 'OK') return;
    setUtteranceEdits((prev) => {
      const next = [...prev];
      const current = next[activeUtteranceIndex];
      if (!current) return next;

      // IMPROVEMENT 4: Allow trim-in (start time can change)
      let newGlobalStart = globalStart;
      let newGlobalEnd = globalEnd;

      // Lower bound for the start handle:
      //  - merged tape: the physical floor (mergedBase). This lets the annotator
      //    drag back into their OWN recoverable gray head, but not past the floor
      //    (the region already consumed by the previous sentence).
      //  - otherwise: the previous utterance's end (or 0 for the first).
      let startFloor: number;
      if (mergedVideoUrl) {
        startFloor = mergedBase;
      } else if (activeUtteranceIndex > 0) {
        const prevUtterance = next[activeUtteranceIndex - 1];
        startFloor = prevUtterance.global_end ?? prevUtterance.end;
      } else {
        startFloor = 0;
      }
      newGlobalStart = Math.max(newGlobalStart, startFloor);

      // Ensure start < end
      if (newGlobalStart >= newGlobalEnd) {
        newGlobalStart = newGlobalEnd - 0.1;
      }

      const nextUtterance = next[activeUtteranceIndex + 1];

      let absoluteMaxGlobalEnd = Infinity;
      if (mergedVideoUrl && mergedTotalDuration > 0) {
        // Tape spans [mergedBase, mergedBase + total]; the furthest the end handle
        // can reach is the physical end of the tape.
        absoluteMaxGlobalEnd = mergedBase + mergedTotalDuration;
      }

      if (newGlobalEnd > absoluteMaxGlobalEnd) {
        newGlobalEnd = absoluteMaxGlobalEnd;
      }

      // Right Spillover (using global timestamps)
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
            
            // If N+1 is crushed to < 0.1s, PUSH its end to the right!
            const minAllowedEnd = next[activeUtteranceIndex + 1].start + 0.1;
            if (next[activeUtteranceIndex + 1].end < minAllowedEnd) {
              const diff = minAllowedEnd - next[activeUtteranceIndex + 1].end;
              next[activeUtteranceIndex + 1].end += diff;
              next[activeUtteranceIndex + 1].global_end = (next[activeUtteranceIndex + 1].global_end ?? next[activeUtteranceIndex + 1].end) + diff;
              
              // If pushing N+1's end exceeded the physical limit, clamp everything back
              if (next[activeUtteranceIndex + 1].global_end! > absoluteMaxGlobalEnd) {
                 const overflow = next[activeUtteranceIndex + 1].global_end! - absoluteMaxGlobalEnd;
                 next[activeUtteranceIndex + 1].global_end! -= overflow;
                 next[activeUtteranceIndex + 1].end -= overflow;
                 next[activeUtteranceIndex + 1].global_start! -= overflow;
                 next[activeUtteranceIndex + 1].start -= overflow;
                 newGlobalEnd -= overflow;
              }
            }
          }
        }
      }

      // Update current utterance: both start and end can change
      const offset = (current.global_start ?? current.start) - current.start;
      next[activeUtteranceIndex] = {
        ...current,
        start: newGlobalStart - offset,
        end: newGlobalEnd - offset,
        global_start: newGlobalStart,
        global_end: newGlobalEnd,
        status: current.status === 'OK' ? 'DRAFT' : current.status,
      };
      return next;
    });
  };

  const handleSelectUtterance = async (index: number) => {
    setActiveUtteranceIndex(index);
    const utt = utteranceEdits[index];
    if (utt) {
      setCurrentTime(utt.global_start ?? utt.start);
      setIsPlaying(false);
      // Lookback is a per-kalimat opt-in — every new kalimat starts on the plain tape.
      setLookbackOn(false);
      setPrevAvailable(0);
      activeUttRequestRef.current = index;
      fetchMergedVideoForUtterance(utt, index, false);
    }
  };

  /** Rebuild the tape with (or without) the orphan tail of kalimat N-1 prepended. */
  const handleToggleLookback = () => {
    if (activeUtteranceIndex === null) return;
    const utt = utteranceEdits[activeUtteranceIndex];
    if (!utt) return;
    const next = !lookbackOn;
    setLookbackOn(next);
    setIsPlaying(false);
    activeUttRequestRef.current = activeUtteranceIndex;
    fetchMergedVideoForUtterance(utt, activeUtteranceIndex, next);
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

  // Strip FE-only virtual fields before sending to backend.
  // IMPORTANT: cropped_video_path is intentionally KEPT. The physical crop
  // reference lives in the latest draft; if we drop it here, every save
  // overwrites the latest edit with a null path and orphans the cropped
  // video in MinIO (status stays OK but the video link is lost).
  const stripGlobalFields = (utt: UtteranceCorrection): UtteranceCorrection => {
    const { global_start, global_end, segment_offset, segment_video_url, confidence, ...clean } = utt;
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

  const handleSubmitReview = async () => {
    if (!selectedJobId || utteranceEdits.length === 0) return;

    // FAILED utterances are ASR hallucinations (e.g. ~0.03s junk) that can
    // never be cropped — treat them as resolved/skipped so they don't block
    // submission. Only genuinely unworked utterances count as "unfinished".
    const unfinished = utteranceEdits.filter(u => u.status !== 'OK' && u.status !== 'FAILED').length;
    if (unfinished > 0) {
      if (!confirm(`Ada ${unfinished} kalimat yang belum ditandai selesai (OK). Lanjutkan submit?`)) return;
    } else {
      if (!confirm('Submit anotasi untuk review oleh kurator?')) return;
    }

    setIsSaving(true);
    setActionMessage('Men-submit anotasi...');
    try {
      // 1. Save all drafts first to ensure nothing is lost
      await saveDraftForAllSegments(utteranceEdits);

      // 2. Find unique segment IDs
      const uniqueSegmentIds = Array.from(new Set(utteranceEdits.map((u) => u.segment_id).filter(Boolean))) as string[];

      // 3. Submit all segments sequentially to handle specific API requirements
      let needsConfirmation = false;
      let failedSegments: string[] = [];

      for (const sid of uniqueSegmentIds) {
        try {
          await annotationApi.submitForReview(sid);
        } catch (err: any) {
          const detail = err?.response?.data?.detail || '';
          if (typeof detail === 'string' && detail.includes('confirm_no_changes=true')) {
            needsConfirmation = true;
            failedSegments.push(sid);
          } else {
            throw err;
          }
        }
      }

      if (needsConfirmation) {
        if (confirm('Anda tidak melakukan perubahan apapun pada teks (sama persis dengan ASR). Yakin ingin men-submit ini sebagai hasil akhir?')) {
          setActionMessage('Men-submit anotasi dengan konfirmasi tanpa perubahan...');
          for (const sid of failedSegments) {
            await annotationApi.submitForReview(sid, { confirm_no_changes: true });
          }
        } else {
          setIsSaving(false);
          setActionMessage('❌ Submit dibatalkan. Silakan edit teks terlebih dahulu.');
          return;
        }
      }

      setActionMessage('✅ Anotasi berhasil di-submit');
      await loadJob(selectedJobId);
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.detail || 'Gagal submit anotasi';
      setActionMessage(typeof msg === 'string' ? `❌ ${msg}` : '❌ Gagal submit anotasi');
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
    if (!confirm('Reset semua edit? Data akan kembali ke ASR original.')) return;
    setIsSaving(true);
    setActionMessage('Merest anotasi...');
    try {
      const segmentIds = Array.from(new Set(utteranceEdits.map((u) => u.segment_id).filter(Boolean))) as string[];
      await Promise.all(segmentIds.map((sid) => annotationApi.resetToOriginal(sid)));

      setActionMessage('✅ Anotasi direset');
      await loadJob(selectedJobId);
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.detail || 'Gagal mereset anotasi';
      setActionMessage(typeof msg === 'string' ? `❌ ${msg}` : '❌ Gagal mereset anotasi');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Hybrid Player Computed Properties (Seamless Segment Router) ──

  // N+1 utterance (for cross-segment info)
  const nextUtterance = useMemo(
    () => (activeUtteranceIndex !== null ? utteranceEdits[activeUtteranceIndex + 1] : null),
    [activeUtteranceIndex, utteranceEdits],
  );

  // VIDEO-EDITOR-SIBI STYLE: playing utterance is always the active one (merged video handles N+1)
  const playingUtterance = useMemo(() => {
    return activeUtterance;
  }, [activeUtterance]);

  // VIDEO-EDITOR-SIBI STYLE: Use merged video (N + N+1) if available
  const videoSrc = useMemo(() => {
    if (mergedVideoUrl) return mergedVideoUrl;
    if (activeUtterance?.segment_video_url) return activeUtterance.segment_video_url;
    return jobVideoUrl ?? '';
  }, [mergedVideoUrl, activeUtterance, jobVideoUrl]);

  const isMergedVideo = !!mergedVideoUrl;

  // Convert global currentTime → video element time.
  // Merged video: starts at t=0 (freshly concatenated), so videoTime = globalTime - global_start
  // Segment video: videoTime = segLocalStart + (globalTime - global_start)
  const playerTime = useMemo(() => {
    if (!playingUtterance) return 0;
    const globalStart = playingUtterance.global_start ?? 0;
    const elapsed = currentTime - globalStart;

    if (isMergedVideo) {
      // Merged tape starts at the floor (mergedBase), not at global_start, so the
      // recoverable gray head [mergedBase, global_start] is on the canvas.
      return Math.max(0, currentTime - mergedBase);
    } else {
      // Segment video: offset to segment-local time
      const segLocalStart = playingUtterance.start ?? 0;
      return Math.max(0, segLocalStart + elapsed);
    }
  }, [playingUtterance, currentTime, isMergedVideo, mergedBase]);

  const handlePlayerTimeUpdate = (t: number) => {
    if (!activeUtterance || !playingUtterance) return;
    const globalStart = playingUtterance.global_start ?? 0;

    let globalTime: number;
    if (isMergedVideo) {
      // Merged tape: t is relative to the floor (mergedBase), so globalTime = mergedBase + t
      globalTime = mergedBase + t;
    } else {
      // Segment video: t is segment-local time
      const segLocalStart = playingUtterance.start ?? 0;
      const elapsed = t - segLocalStart;
      globalTime = globalStart + elapsed;
    }
    setCurrentTime(globalTime);

    // Determine end of playback window: end of N+1 (or N if no N+1)
    let windowEnd = nextUtterance
      ? (nextUtterance.global_end ?? nextUtterance.end)
      : (activeUtterance.global_end ?? activeUtterance.end);

    // FIX: If we have a physical merged video, its exact physical duration determines the end
    // of the playable window, overriding any ASR-based global_end assumptions.
    // The tape spans [mergedBase, mergedBase + total].
    if (mergedVideoUrl && mergedTotalDuration > 0) {
      windowEnd = mergedBase + mergedTotalDuration;
    }

    // Stop at end of the N+1 window — workspace stays on N.
    if (globalTime >= windowEnd) {
      setIsPlaying(false);
    }
  };

  // VIDEO-EDITOR-SIBI STYLE: Video is already merged (N + N+1), no need to switch
  const handleVideoEnded = useCallback(() => {
    setIsPlaying(false);
  }, []);

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
          {isProcessed && (
            <div
              className="bg-amber-50 text-amber-800 border border-amber-200 text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5"
              title="Dataset sudah melewati tahap pengolahan end-to-end. Glosa terkunci; filmstrip hanya bisa diubah untuk kalimat yang belum OK."
            >
              <Lock size={12} />
              Glosa terkunci — hanya kalimat belum OK yang bisa di-trim
            </div>
          )}
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

            <Button
              variant="outline"
              onClick={handleReset}
              disabled={isSaving || reviewStatus === 'SUBMITTED' || reviewStatus === 'PENDING' || reviewStatus === 'APPROVED'}
              title={
                reviewStatus === 'SUBMITTED' || reviewStatus === 'PENDING'
                  ? 'Tidak bisa reset — anotasi sedang dalam review'
                  : reviewStatus === 'APPROVED'
                  ? 'Tidak bisa reset — anotasi sudah disetujui'
                  : undefined
              }
              className="gap-2 px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 rounded-xl font-bold transition-all shadow-sm hidden lg:flex disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RotateCcw size={18} /> Reset
            </Button>

            <button
              onClick={() => setIsFocusMode(!isFocusMode)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-xl font-bold transition-all shadow-sm hidden md:flex"
              title={isFocusMode ? "Kembali ke mode biasa" : "Fokus pada video dan timeline"}
            >
              {isFocusMode ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              {isFocusMode ? 'Mode Normal' : 'Mode Fokus'}
            </button>

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
          liveProgress={selectedJobId && totalUtterances > 0
            ? { done: totalCompleted, total: totalUtterances }
            : undefined}
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
          <div className="flex-1 p-8 space-y-6 bg-slate-50">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-32 rounded-lg" />
              <Skeleton className="h-32 rounded-lg" />
            </div>
            <Skeleton className="h-48 rounded-lg" />
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
          <div className="flex-1 flex bg-slate-900 overflow-hidden relative">

            {/* ══════════════════════════════════════════════════════════
                MERGE LOADING OVERLAY — shown while on-demand merge runs.
                Blurs entire workspace + animated spinner + text.
            ══════════════════════════════════════════════════════════ */}
            {isMergeLoading && (
              <div
                className="absolute inset-0 z-50 flex items-center justify-center"
                style={{
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  backgroundColor: 'rgba(15,23,42,0.72)',
                }}
              >
                <div
                  className="flex flex-col items-center gap-5 px-10 py-8 rounded-2xl text-center"
                  style={{
                    background: 'rgba(15,23,42,0.90)',
                    border: '1px solid rgba(20,184,166,0.35)',
                    boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(20,184,166,0.1)',
                  }}
                >
                  {/* Animated triple-ring spinner */}
                  <div className="relative w-20 h-20">
                    <div className="absolute inset-0 rounded-full border-4 border-teal-900/60" />
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-teal-400 animate-spin" style={{ animationDuration: '0.9s' }} />
                    <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-teal-300/50 animate-spin" style={{ animationDuration: '1.4s', animationDirection: 'reverse' }} />
                    <div className="absolute inset-[18px] rounded-full bg-teal-500/15 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-teal-400 animate-pulse" />
                    </div>
                  </div>

                  {/* Message */}
                  <div className="space-y-2">
                    <p className="text-white font-bold text-lg tracking-wide">Mohon Tunggu</p>
                    <p className="text-teal-300 text-sm font-semibold">Video sedang diproses...</p>
                    <p className="text-slate-400 text-xs leading-relaxed max-w-[240px]">
                      Sistem sedang menyiapkan tampilan video<br />
                      untuk kalimat yang dipilih.
                    </p>
                  </div>

                  {/* Animated bouncing dots */}
                  <div className="flex items-end gap-1.5 h-5">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full bg-teal-400"
                        style={{
                          animation: `bounce 1s ease-in-out ${i * 0.15}s infinite`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 2. LEFT PANEL: VIDEO & TIMELINE */}
            <div className={`flex flex-col bg-slate-900 relative overflow-hidden transition-all duration-300 ${isFocusMode ? 'flex-1' : 'flex-[0_0_60%]'}`}>
              {isFocusMode && (
                <button
                  onClick={() => setIsFocusMode(false)}
                  className="absolute top-4 right-4 z-40 bg-black/60 hover:bg-black/80 text-white px-4 py-2 rounded-full backdrop-blur-sm font-medium flex items-center gap-2 border border-white/20 shadow-lg transition-all hover:scale-105"
                >
                  <Minimize2 size={16} /> Kembali ke Mode Normal
                </button>
              )}
              {/* Video area — flex-1 + min-h-0 + overflow-hidden so it shrinks to fit */}
              <div className="flex-1 min-h-0 p-1 pb-0 flex flex-col items-center justify-center overflow-hidden">
                <div className={`w-full ${isFocusMode ? 'max-w-7xl' : 'max-w-4xl'} flex-1 min-h-0 transition-all duration-300`}>
                  <VideoPlayer
                    key={`utt-${activeUtteranceIndex ?? 'none'}`}
                    src={videoSrc}
                    isPlaying={isPlaying}
                    onPlayPause={setIsPlaying}
                    currentTime={playerTime}
                    onTimeUpdate={handlePlayerTimeUpdate}
                    playbackRate={playbackRate}
                    onPlaybackRateChange={setPlaybackRate}
                    onDurationChange={setDuration}
                    onEnded={handleVideoEnded}
                    onReady={setVideoReady}
                    playDisabled={!filmstripReady}
                    navigationSlot={
                      <div className="flex items-center gap-1 sm:gap-2">
                        <button
                          onClick={handlePrevUtterance}
                          disabled={activeUtteranceIndex === null || activeUtteranceIndex === 0}
                          className="flex items-center gap-1.5 bg-white/5 border border-white/10 shadow-sm hover:bg-white/10 px-3 py-1.5 rounded-lg group transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                          <ChevronLeft size={18} className="text-gray-400 group-hover:text-white" />
                          <span className="text-gray-200 font-medium text-sm hidden sm:inline">Kalimat Sebelumnya</span>
                        </button>

                        <button
                          onClick={() => setIsSheetOpen(true)}
                          className="flex items-center gap-2 bg-white/5 border border-white/10 shadow-sm hover:bg-white/10 px-4 py-1.5 rounded-full group cursor-pointer transition-colors whitespace-nowrap"
                          title="Klik untuk melihat daftar kalimat"
                        >
                          <span className="text-gray-400 text-sm hidden sm:inline">Posisi:</span>
                          <span className="text-white font-semibold text-base flex items-center gap-1.5">
                            Kalimat ke-{(activeUtteranceIndex ?? 0) + 1}
                            <Search size={16} className="text-gray-400 group-hover:text-white transition-colors" />
                          </span>
                        </button>

                        <button
                          onClick={handleNextUtterance}
                          disabled={activeUtteranceIndex === null || activeUtteranceIndex === utteranceEdits.length - 1}
                          className="flex items-center gap-1.5 bg-white/5 border border-white/10 shadow-sm hover:bg-white/10 px-3 py-1.5 rounded-lg group transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                          <span className="text-gray-200 font-medium text-sm hidden sm:inline">Kalimat Selanjutnya</span>
                          <ChevronRight size={18} className="text-gray-400 group-hover:text-white" />
                        </button>
                      </div>
                    }
                  />
                </div>
              </div>

              {/* Timeline editor — pinned at bottom, never overlapped */}
              <div className="flex-shrink-0 bg-slate-950 p-1 border-t border-slate-800">
                <TimelineEditor
                  videoUrl={mergedVideoUrl ?? activeUtterance?.segment_video_url ?? jobVideoUrl ?? ''}
                  // Filmstrip seeks the underlying video as: videoTime = globalTime + videoOffset.
                  // The timeline window uses the GLOBAL virtual timeline, but the merged video
                  // (N + N+1) is 0-based, so map global -> merged-local by subtracting the active
                  // utterance's global_start. For the segment-video fallback, map global -> segment
                  // -local using (local start - global_start), matching the player's own conversion.
                  videoOffset={
                    mergedVideoUrl
                      ? -mergedBase
                      : ((activeUtterance?.start ?? 0) - (activeUtterance?.global_start ?? 0))
                  }
                  mergedBaseGlobal={mergedVideoUrl ? mergedBase : undefined}
                  duration={mergedVideoUrl ? mergedTotalDuration : segmentEnd}
                  currentTime={currentTime}
                  isPlaying={isPlaying}
                  onTimeUpdate={setCurrentTime}
                  trimStart={activeUtterance?.global_start ?? segmentStart}
                  trimEnd={activeUtterance?.global_end ?? segmentEnd}
                  onTrimChange={handleTrimChange}
                  disableTrimIn={false}
                  isMergedVideo={!!mergedVideoUrl}
                  videoNDuration={videoNDuration}
                  activeUtterance={activeUtterance && activeUtteranceIndex !== null ? { index: activeUtteranceIndex, start: activeUtterance.global_start ?? activeUtterance.start, end: activeUtterance.global_end ?? activeUtterance.end, status: activeUtterance.status, global_start: activeUtterance.global_start ?? activeUtterance.start, global_end: activeUtterance.global_end ?? activeUtterance.end } : null}
                  allUtterances={utteranceEdits}
                  onPrevUtterance={handlePrevUtterance}
                  onNextUtterance={handleNextUtterance}
                  utteranceCount={utteranceEdits.length}
                  activeUtterancePosition={activeUtterancePosition}
                  onReady={setFilmstripReady}
                  readOnly={isTrimLocked}
                  readOnlyReason="Kalimat ini sudah berstatus OK pada dataset yang telah diolah — filmstrip tidak dapat diubah"
                  lookbackSeconds={prevOffset}
                  lookbackAvailable={prevAvailable}
                  lookbackOn={lookbackOn}
                  onToggleLookback={handleToggleLookback}
                />
              </div>
            </div>

            {/* 3. RIGHT PANEL: THE TASK */}
            {!isFocusMode && (
              <div className="flex-[0_0_40%] bg-slate-50 border-l border-slate-200 flex flex-col shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] z-20 min-w-[350px]">
                <div className="flex-1 min-h-0">
                  <PropertiesPanel
                    originalUtterances={originalUtterances}
                    utteranceEdits={utteranceEdits}
                    onUtteranceChange={handleUtteranceChange}
                    activeUtteranceIndex={activeUtteranceIndex}
                    onSelectUtterance={handleSelectUtterance}
                    onMarkOk={handleMarkOk}
                    onReset={handleReset}
                    onSubmit={handleSubmitReview}
                    isSaving={isSaving}
                    reviewStatus={reviewStatus}
                    reviewFeedback={reviewFeedback}
                    glosaLocked={isProcessed}
                  />
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
