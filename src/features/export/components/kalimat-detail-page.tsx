'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/core/api/axios-client';
import { ArrowLeft, Film, Music, FileText, MessageSquareText } from 'lucide-react';

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
      <div className="flex-1 flex h-screen items-center justify-center bg-gray-50/50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 flex h-screen flex-col items-center justify-center text-red-500 bg-gray-50/50">
        <p>Gagal memuat detail kalimat.</p>
        <Button variant="outline" onClick={() => router.back()} className="mt-4">Kembali</Button>
      </div>
    );
  }

  const segment = data.segments.find(s => s.segment_id === segmentId);
  const utterance = segment?.utterances.find(u => u.utterance_index === kalimatIndex);

  if (!segment || !utterance) {
    return (
      <div className="flex-1 flex h-screen flex-col items-center justify-center text-gray-500 bg-gray-50/50">
        <p>Data Kalimat tidak ditemukan.</p>
        <Button variant="outline" onClick={() => router.back()} className="mt-4">Kembali</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-10 w-10 shrink-0 hover:bg-gray-100">
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">
              Detail Kalimat {kalimatIndex}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              File: <span className="font-medium text-gray-700">{data.original_filename}</span> • Segmen {segment.segment_index} • Waktu: {utterance.start.toFixed(1)}s - {utterance.end.toFixed(1)}s
            </p>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Media (Video & Audio) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <Card className="shadow-sm border-teal-100">
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2 font-semibold text-teal-800 text-sm">
                  <Film size={18} /> Video Crop
                </div>
                <div className="bg-black rounded-lg overflow-hidden aspect-video flex items-center justify-center shadow-inner">
                  {utterance.cropped_video_url ? (
                    <video src={utterance.cropped_video_url} controls className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-sm text-gray-500">Video belum tersedia</span>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-teal-100">
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2 font-semibold text-teal-800 text-sm">
                  <Music size={18} /> Audio WAV
                </div>
                <div className="bg-gray-100 rounded-lg p-6 flex flex-col items-center justify-center border border-gray-200">
                  {(() => {
                    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
                    const proxiedAudioUrl = utterance.audio_url && token
                      ? `/proxy-segment?url=${encodeURIComponent(utterance.audio_url)}&token=${token}#t=${utterance.start},${utterance.end}`
                      : null;
                      
                    return proxiedAudioUrl ? (
                      <audio src={proxiedAudioUrl} controls className="w-full" />
                    ) : (
                      <span className="text-sm text-gray-500">Audio belum tersedia</span>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Text Data (2x2 Grid) */}
          <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Transkripsi GT */}
            <Card className="shadow-sm border-teal-100 flex flex-col">
              <CardContent className="p-5 flex flex-col gap-3 flex-1">
                <div className="flex items-center gap-2 font-semibold text-teal-800 text-sm">
                  <FileText size={18} /> Transkripsi (GT)
                </div>
                <div className="flex-1 bg-white border border-gray-200 rounded-lg p-5 text-gray-800 text-base leading-relaxed whitespace-pre-wrap shadow-inner overflow-y-auto">
                  {utterance.gt_text || 'Tidak ada data transkripsi.'}
                </div>
              </CardContent>
            </Card>

            {/* Transkripsi Normalized */}
            <Card className="shadow-sm border-green-100 flex flex-col">
              <CardContent className="p-5 flex flex-col gap-3 flex-1">
                <div className="flex items-center gap-2 font-semibold text-green-800 text-sm">
                  <FileText size={18} /> Transkripsi Normal
                </div>
                <div className="flex-1 bg-green-50/50 border border-green-200 rounded-lg p-5 text-green-900 text-base leading-relaxed whitespace-pre-wrap shadow-inner overflow-y-auto">
                  {utterance.norm_transcript || 'Belum dinormalisasi.'}
                </div>
              </CardContent>
            </Card>

            {/* Glosa Asli */}
            <Card className="shadow-sm border-teal-200 bg-teal-50/20 flex flex-col">
              <CardContent className="p-5 flex flex-col gap-3 flex-1">
                <div className="flex items-center gap-2 font-semibold text-teal-900 text-sm">
                  <MessageSquareText size={18} /> Glosa Asli
                </div>
                <div className="flex-1 bg-teal-50 border border-teal-200 rounded-lg p-5 text-teal-900 text-base font-medium leading-relaxed whitespace-pre-wrap shadow-inner overflow-y-auto">
                  {utterance.glosa_text || 'Tidak ada data glosa.'}
                </div>
              </CardContent>
            </Card>

            {/* Glosa Normalized */}
            <Card className="shadow-sm border-emerald-200 bg-emerald-50/20 flex flex-col">
              <CardContent className="p-5 flex flex-col gap-3 flex-1">
                <div className="flex items-center gap-2 font-semibold text-emerald-900 text-sm">
                  <MessageSquareText size={18} /> Glosa Normal
                </div>
                <div className="flex-1 bg-emerald-50 border border-emerald-200 rounded-lg p-5 text-emerald-900 text-base font-medium leading-relaxed whitespace-pre-wrap shadow-inner overflow-y-auto">
                  {utterance.norm_glosa || 'Belum dinormalisasi.'}
                </div>
              </CardContent>
            </Card>

          </div>

        </div>
      </div>
    </div>
  );
}
