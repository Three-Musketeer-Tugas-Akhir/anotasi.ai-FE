'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/core/api/axios-client';
import { ArrowLeft, Film, Music, FileText, MessageSquareText, Lock, CheckCircle2 } from 'lucide-react';

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

interface KalimatDetailPageProps {
  jobId: string;
  segmentId: string;
  kalimatIndex: number;
}

export function KalimatDetailPage({ jobId, segmentId, kalimatIndex }: KalimatDetailPageProps) {
  const router = useRouter();

  const { data, isLoading, error } = useQuery({
    queryKey: ['dataset-explorer', jobId],
    queryFn: async () => {
      const response = await apiClient.get<ExplorerData>(`/pipeline/jobs/${jobId}/dataset/explorer`);
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex h-screen items-center justify-center bg-slate-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 flex h-screen flex-col items-center justify-center text-red-500 bg-slate-100">
        <p>Gagal memuat detail kalimat.</p>
        <Button variant="outline" onClick={() => router.back()} className="mt-4">Kembali</Button>
      </div>
    );
  }

  const segment = data.segments.find((s) => s.segment_id === segmentId);
  const utterance = segment?.utterances.find((u) => u.utterance_index === kalimatIndex);

  if (!segment || !utterance) {
    return (
      <div className="flex-1 flex h-screen flex-col items-center justify-center text-slate-500 bg-slate-100">
        <p>Data Kalimat tidak ditemukan.</p>
        <Button variant="outline" onClick={() => router.back()} className="mt-4">Kembali</Button>
      </div>
    );
  }

  const isApproved = utterance.status === 'OK';

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 overflow-auto">
      <div className="max-w-6xl mx-auto w-full space-y-6">

        {/* ── Header Card ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors flex-shrink-0"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1 className="text-xl md:text-2xl font-black text-slate-900">
                Detail Kalimat {kalimatIndex}
              </h1>
              {isApproved && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200">
                  <Lock size={11} /> Approved
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 flex items-center gap-2 flex-wrap">
              <span className="font-medium text-slate-700 truncate max-w-sm">{data.original_filename}</span>
              <span className="text-slate-300">·</span>
              <span>Segmen {segment.segment_index}</span>
              <span className="text-slate-300">·</span>
              <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 text-xs">
                {utterance.start.toFixed(1)}s – {utterance.end.toFixed(1)}s
              </span>
            </p>
          </div>
        </div>

        {/* ── Workspace Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left: Media (sticky) */}
          <div className="lg:col-span-5 flex flex-col gap-5 lg:sticky lg:top-6 self-start">

            {/* Video */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/80 flex items-center gap-2">
                <Film size={16} className="text-teal-600" />
                <span className="text-sm font-bold text-slate-700">Video Segmen</span>
              </div>
              <div className="bg-black aspect-video flex items-center justify-center">
                {utterance.cropped_video_url ? (
                  <video src={utterance.cropped_video_url} controls className="w-full h-full object-contain" />
                ) : (
                  <span className="text-sm text-slate-500">Video belum tersedia</span>
                )}
              </div>
            </div>

            {/* Audio */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/80 flex items-center gap-2">
                <Music size={16} className="text-teal-600" />
                <span className="text-sm font-bold text-slate-700">Audio Ekstrak</span>
              </div>
              <div className="p-5 bg-slate-50/50 flex items-center justify-center">
                {utterance.audio_url ? (
                  <audio src={utterance.audio_url} controls className="w-full" />
                ) : (
                  <span className="text-sm text-slate-500">Audio belum tersedia</span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Text Data */}
          <div className="lg:col-span-7 flex flex-col gap-5">

            {/* Transkripsi Block */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center gap-2">
                <FileText size={17} className="text-slate-400" />
                <h3 className="font-bold text-slate-800">Data Transkripsi</h3>
              </div>
              <div className="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                <div className="flex-1 p-6">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">
                    Ground Truth Asli
                  </label>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-slate-800 text-sm leading-relaxed min-h-[120px] whitespace-pre-wrap">
                    {utterance.gt_text || 'Tidak ada data transkripsi.'}
                  </div>
                </div>
                <div className="flex-1 p-6 bg-emerald-50/20">
                  <label className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-3 block">
                    Hasil Normalisasi
                  </label>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-emerald-900 font-medium text-sm leading-relaxed min-h-[120px] whitespace-pre-wrap">
                    {utterance.norm_transcript || 'Belum dinormalisasi.'}
                  </div>
                </div>
              </div>
            </div>

            {/* Glosa Block */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center gap-2">
                <MessageSquareText size={17} className="text-slate-400" />
                <h3 className="font-bold text-slate-800">Data Glosa</h3>
              </div>
              <div className="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                <div className="flex-1 p-6">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">
                    Glosa Asli
                  </label>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-slate-800 text-sm leading-relaxed min-h-[120px] whitespace-pre-wrap">
                    {utterance.glosa_text || 'Tidak ada data glosa.'}
                  </div>
                </div>
                <div className="flex-1 p-6 bg-teal-50/20">
                  <label className="text-[10px] font-bold text-teal-600 uppercase tracking-widest mb-3 block">
                    Hasil Normalisasi
                  </label>
                  <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 text-teal-900 font-medium text-sm leading-relaxed min-h-[120px] whitespace-pre-wrap">
                    {utterance.norm_glosa || 'Belum dinormalisasi.'}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
