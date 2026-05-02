'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
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
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/axios-client';

// ── Types ──────────────────────────────────────────────────────────

interface ExplorerUtterance {
  utterance_index: number;
  status: string | null;
  asr_text: string;
  glosa_text: string;
  cropped_video_url: string | null;
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

// ── Components ─────────────────────────────────────────────────────

export function DatasetExplorer({ jobId, onBack }: DatasetExplorerProps) {
  const router = useRouter();
  const [expandedGlobalIdx, setExpandedGlobalIdx] = useState<number | null>(null);

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
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-red-500">
        <p>Gagal memuat dataset explorer.</p>
        <Button variant="outline" onClick={onBack} className="mt-4">Kembali</Button>
      </div>
    );
  }

  const toggleUtterance = (idx: number) => {
    setExpandedGlobalIdx(expandedGlobalIdx === idx ? null : idx);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50/50 p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
          <ArrowLeft size={18} />
        </Button>
        <div className="flex-1 flex flex-wrap gap-4 items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <FolderOpen size={20} className="text-teal-600" />
              Dataset Explorer: {data.original_filename}
            </h2>
            <p className="text-xs text-gray-500 mt-1">ID: {data.job_id} • {flatUtterances.length} Kalimat</p>
          </div>
          <Button 
            size="sm" 
            variant="secondary" 
            className="text-xs px-4 bg-teal-50 text-teal-700 hover:bg-teal-100 border-teal-200"
            disabled={flatUtterances.length === 0}
            onClick={() => alert('Download Job ZIP will be implemented in future.')}
          >
            Download ZIP
          </Button>
        </div>
      </div>

      {/* Flat List of Utterances */}
      <div className="space-y-3">
        {flatUtterances.length === 0 ? (
          <div className="p-12 text-center border rounded-xl bg-white border-gray-200">
            <p className="text-sm text-gray-500">Tidak ada kalimat dalam dataset ini.</p>
          </div>
        ) : (
          flatUtterances.map((utt) => (
            <div key={`${utt.segment_id}-${utt.utterance_index}`} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:border-teal-200 transition-colors">
              {/* Utterance Header */}
              <div 
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-teal-50/30"
                onClick={() => toggleUtterance(utt.global_index)}
              >
                <div className="flex items-center gap-3">
                  {expandedGlobalIdx === utt.global_index ? <ChevronDown size={18} className="text-teal-600" /> : <ChevronRight size={18} className="text-gray-400" />}
                  <span className="text-sm font-semibold text-gray-800">Kalimat {utt.global_index}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 font-mono bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                    {utt.start.toFixed(1)}s - {utt.end.toFixed(1)}s
                  </span>
                  {utt.status === 'OK' && (
                    <Badge variant="outline" className="text-[10px] bg-teal-50 text-teal-700 border-teal-200">
                      <Lock size={10} className="mr-1" /> OK
                    </Badge>
                  )}
                </div>
              </div>

              {/* Utterance Body (Bento Cards - 2 Columns) */}
              {expandedGlobalIdx === utt.global_index && (
                <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-3 bg-teal-50/10 border-t border-teal-100/50">
                  
                  {/* Kiri: Video & WAV */}
                  <div className="flex flex-col gap-3">
                    {/* Video Card */}
                    <Card className="shadow-none border-teal-100/50">
                      <CardContent className="p-2.5 flex flex-col gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-700">
                          <Film size={14} /> Video Crop
                        </div>
                        <div className="bg-black rounded-lg overflow-hidden aspect-video flex items-center justify-center border border-gray-800">
                          {utt.cropped_video_url ? (
                            <video src={utt.cropped_video_url} controls className="w-full h-full object-contain" />
                          ) : (
                            <span className="text-xs text-gray-500">Video belum dipotong</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* WAV Card */}
                    <Card className="shadow-none border-teal-100/50">
                      <CardContent className="p-2.5 flex flex-col gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-700">
                          <Music size={14} /> Audio WAV
                        </div>
                        <div className="bg-gray-100 rounded-lg p-2.5 flex flex-col items-center justify-center">
                          {utt.cropped_video_url ? (
                            <audio src={utt.cropped_video_url} controls className="w-full h-8" />
                          ) : (
                            <span className="text-xs text-gray-500">Audio belum tersedia</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Kanan: Transkripsi & Glosa */}
                  <div className="flex flex-col gap-3">
                    {/* Transcription Card */}
                    <Card className="shadow-none border-teal-100/50 flex-1 flex flex-col">
                      <CardContent className="p-2.5 flex flex-col gap-2 flex-1">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-700">
                          <FileText size={14} /> Transkripsi (ASR)
                        </div>
                        <div className="flex-1 bg-gray-50 border border-gray-100 rounded-lg p-3 text-sm text-gray-700 line-clamp-4">
                          {utt.asr_text || '-'}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Glosa Card */}
                    <Card className="shadow-none border-teal-100/50 flex-1 flex flex-col">
                      <CardContent className="p-2.5 flex flex-col gap-2 flex-1">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-700">
                          <MessageSquareText size={14} /> Glosa (Annotator)
                        </div>
                        <div className="flex-1 bg-teal-50/50 border border-teal-100 rounded-lg p-3 text-sm text-teal-900 font-medium line-clamp-4">
                          {utt.glosa_text || '-'}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Lihat Detail Button */}
                    <Button 
                      variant="outline" 
                      className="w-full text-teal-700 border-teal-200 hover:bg-teal-50 shadow-sm"
                      onClick={() => router.push(`/export/${jobId}/segment/${utt.segment_id}/kalimat/${utt.utterance_index}`)}
                    >
                      <FolderOpen size={16} className="mr-2" /> Lihat Detail Kalimat
                    </Button>
                  </div>

                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
