'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FolderOpen,
  Film,
  FileText,
  MessageSquareText,
  Music,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  Lock,
  Download,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/core/api/axios-client';
import { DatasetZipDownloadModal } from './dataset-zip-modal';

// ── Types ──────────────────────────────────────────────────────────

interface ExplorerUtterance {
  utterance_index: number;
  status: string | null;
  asr_text: string;
  gt_text: string;
  norm_transcript: string;
  glosa_text: string;
  norm_glosa: string;
  cropped_video_url: string | null;
  audio_url: string | null;
  start: number;
  end: number;
}

interface ExplorerSegment {
  segment_id: string;
  segment_index: number;
  video_url: string | null;
  is_completed: boolean;
  utterances: ExplorerUtterance[];
}

interface ExplorerData {
  job_id: string;
  original_filename: string;
  segments: ExplorerSegment[];
}

interface DatasetExplorerProps {
  jobId: string;
  onBack: () => void;
}

// ── Component ──────────────────────────────────────────────────────

export function DatasetExplorer({ jobId, onBack }: DatasetExplorerProps) {
  const router = useRouter();
  const [expandedGlobalIdx, setExpandedGlobalIdx] = useState<number | null>(null);
  const [zipModalOpen, setZipModalOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['dataset-explorer', jobId],
    queryFn: async () => {
      const response = await apiClient.get<ExplorerData>(`/pipeline/jobs/${jobId}/dataset/explorer`);
      return response.data;
    },
  });

  const flatUtterances = useMemo(() => {
    if (!data) return [];
    const all = data.segments.flatMap((s) =>
      s.utterances.map((u) => ({
        ...u,
        segment_id: s.segment_id,
        is_completed: s.is_completed,
      }))
    );
    all.sort((a, b) => a.start - b.start);
    return all.map((utt, index) => ({
      ...utt,
      global_index: index + 1,
    }));
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-red-500 h-full">
        <p>Gagal memuat dataset explorer.</p>
        <Button variant="outline" onClick={onBack} className="mt-4">Kembali</Button>
      </div>
    );
  }

  const toggleUtterance = (idx: number) => {
    setExpandedGlobalIdx(expandedGlobalIdx === idx ? null : idx);
  };

  const handleDownloadZip = () => {
    setZipModalOpen(true);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 overflow-y-auto p-6 md:p-8">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <button
            onClick={onBack}
            className="mt-0.5 p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors flex-shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <FolderOpen size={20} className="text-teal-600 flex-shrink-0" />
              Dataset Explorer
            </h2>
            <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">{data.original_filename}</p>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">ID: {data.job_id} · {flatUtterances.length} Kalimat</p>
          </div>
        </div>
        <button
          onClick={handleDownloadZip}
          disabled={flatUtterances.length === 0}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 shadow-sm transition-colors flex-shrink-0"
        >
          <Download size={15} className="mr-2" /> Download ZIP
        </button>
      </div>

      {/* ── Accordion List ── */}
      <div className="space-y-3 max-w-5xl">
        {flatUtterances.length === 0 ? (
          <div className="p-16 text-center bg-white border border-slate-200 rounded-xl shadow-sm">
            <p className="text-sm font-semibold text-slate-500">Tidak ada kalimat dalam dataset ini.</p>
          </div>
        ) : (
          flatUtterances.map((utt) => {
            const isExpanded = expandedGlobalIdx === utt.global_index;
            return (
              <div
                key={`${utt.segment_id}-${utt.utterance_index}`}
                className={`bg-white rounded-xl overflow-hidden transition-all duration-200 ${
                  isExpanded
                    ? 'border border-teal-300 shadow-md ring-1 ring-teal-500/10'
                    : 'border border-slate-200 shadow-sm hover:border-slate-300'
                }`}
              >
                {/* Row Header */}
                <div
                  className={`flex items-center justify-between p-4 cursor-pointer select-none ${isExpanded ? 'bg-teal-50/60 border-b border-teal-100' : 'hover:bg-slate-50/80'}`}
                  onClick={() => toggleUtterance(utt.global_index)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1 rounded-md transition-colors ${isExpanded ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-400'}`}>
                      {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    </div>
                    <span className={`text-sm font-bold ${isExpanded ? 'text-teal-900' : 'text-slate-700'}`}>
                      Kalimat {utt.global_index}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                      {utt.start.toFixed(1)}s – {utt.end.toFixed(1)}s
                    </span>
                    {utt.status === 'OK' && (
                      <Badge variant="outline" className="text-[10px] bg-teal-50 text-teal-700 border-teal-200 py-0.5">
                        <Lock size={9} className="mr-1" /> OK
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Expanded: Side-by-Side Layout */}
                {isExpanded && (
                  <div className="p-5 flex flex-col lg:flex-row gap-5 bg-white">

                    {/* Left: Media Column */}
                    <div className="w-full lg:w-[40%] flex flex-col gap-4 flex-shrink-0">
                      {/* Video */}
                      <div className="rounded-xl border border-slate-200 overflow-hidden">
                        <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/80 flex items-center gap-2">
                          <Film size={13} className="text-slate-500" />
                          <span className="text-xs font-semibold text-slate-700">Video Crop</span>
                        </div>
                        <div className="bg-black aspect-video flex items-center justify-center">
                          {utt.cropped_video_url ? (
                            <video src={utt.cropped_video_url} controls className="w-full h-full object-contain" />
                          ) : (
                            <span className="text-xs text-slate-500">Video belum dipotong</span>
                          )}
                        </div>
                      </div>
                      {/* Audio */}
                      <div className="rounded-xl border border-slate-200 overflow-hidden">
                        <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/80 flex items-center gap-2">
                          <Music size={13} className="text-slate-500" />
                          <span className="text-xs font-semibold text-slate-700">Audio WAV</span>
                        </div>
                        <div className="p-4 bg-slate-50/50 flex items-center justify-center">
                          {utt.audio_url ? (
                            <audio src={utt.audio_url} controls className="w-full h-9" />
                          ) : (
                            <span className="text-xs text-slate-500">Audio belum tersedia</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Text Comparison Column */}
                    <div className="flex-1 flex flex-col gap-4">

                      {/* Transkripsi Block */}
                      <div className="rounded-xl border border-slate-200 overflow-hidden">
                        <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/80 flex items-center gap-2">
                          <FileText size={13} className="text-slate-500" />
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Transkripsi</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 bg-white">
                          <div className="p-4">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Ground Truth</p>
                            <p className="text-sm text-slate-800 leading-relaxed line-clamp-4">{utt.gt_text || '—'}</p>
                          </div>
                          <div className="p-4 bg-emerald-50/30">
                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-2">Normalisasi</p>
                            <p className="text-sm text-emerald-900 font-medium leading-relaxed line-clamp-4">{utt.norm_transcript || '—'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Glosa Block */}
                      <div className="rounded-xl border border-slate-200 overflow-hidden">
                        <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/80 flex items-center gap-2">
                          <MessageSquareText size={13} className="text-slate-500" />
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Glosa</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 bg-white">
                          <div className="p-4">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Asli</p>
                            <p className="text-sm text-slate-800 leading-relaxed line-clamp-4">{utt.glosa_text || '—'}</p>
                          </div>
                          <div className="p-4 bg-teal-50/30">
                            <p className="text-[10px] font-bold text-teal-600 uppercase tracking-wider mb-2">Normalisasi</p>
                            <p className="text-sm text-teal-900 font-medium leading-relaxed line-clamp-4">{utt.norm_glosa || '—'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Detail CTA */}
                      <div className="flex justify-end">
                        <button
                          onClick={() => router.push(`/export/${jobId}/segment/${utt.segment_id}/kalimat/${utt.utterance_index}`)}
                          className="inline-flex items-center text-sm font-semibold text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 px-4 py-2 rounded-lg transition-colors"
                        >
                          Buka Detail Penuh <ChevronRight size={15} className="ml-1" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <DatasetZipDownloadModal
        jobId={jobId}
        filename={data.original_filename}
        open={zipModalOpen}
        onOpenChange={setZipModalOpen}
      />
    </div>
  );
}
