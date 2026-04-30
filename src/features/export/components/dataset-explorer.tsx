'use client';

import { useState } from 'react';
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
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/axios-client';
import { env } from '@/core/config/env';

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
  const [expandedSegmentIdx, setExpandedSegmentIdx] = useState<number | null>(null);
  const [expandedUtteranceIdx, setExpandedUtteranceIdx] = useState<number | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['dataset-explorer', jobId],
    queryFn: async () => {
      const response = await apiClient.get<ExplorerData>(`/pipeline/jobs/${jobId}/dataset/explorer`);
      return response.data;
    },
  });

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

  const toggleSegment = (idx: number) => {
    if (expandedSegmentIdx === idx) {
      setExpandedSegmentIdx(null);
      setExpandedUtteranceIdx(null);
    } else {
      setExpandedSegmentIdx(idx);
      setExpandedUtteranceIdx(null);
    }
  };

  const toggleUtterance = (idx: number) => {
    setExpandedUtteranceIdx(expandedUtteranceIdx === idx ? null : idx);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50/50 p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
          <ArrowLeft size={18} />
        </Button>
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FolderOpen size={20} className="text-teal-600" />
            Dataset Explorer: {data.original_filename}
          </h2>
          <p className="text-xs text-gray-500 mt-1">ID: {data.job_id}</p>
        </div>
      </div>

      {/* Segments List */}
      <div className="space-y-3">
        {data.segments.map((segment) => (
          <Card key={segment.segment_id} className={`border transition-colors ${expandedSegmentIdx === segment.segment_index ? 'border-teal-300 ring-1 ring-teal-300 shadow-sm' : 'border-gray-200'}`}>
            {/* Segment Header */}
            <div 
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50/80"
              onClick={() => toggleSegment(segment.segment_index)}
            >
              <div className="flex items-center gap-3">
                {expandedSegmentIdx === segment.segment_index ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronRight size={18} className="text-gray-400" />}
                <div className="flex flex-col">
                  <span className="font-semibold text-gray-800 text-sm">Segmen #{segment.segment_index}</span>
                  <span className="text-xs text-gray-500">{segment.utterances.length} Kalimat</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {segment.is_completed ? (
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    <CheckCircle2 size={12} className="mr-1" /> OK
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-gray-500">Incomplete</Badge>
                )}
                {/* Download Segment Button */}
                <Button 
                  size="sm" 
                  variant="secondary" 
                  className="h-7 text-xs px-2"
                  disabled={!segment.is_completed}
                  onClick={(e) => {
                    e.stopPropagation();
                    alert('Download per segment will be implemented in future.');
                  }}
                >
                  Download ZIP
                </Button>
              </div>
            </div>

            {/* Segment Body (Utterances) */}
            {expandedSegmentIdx === segment.segment_index && (
              <div className="border-t border-teal-100 bg-gray-50 p-4 space-y-3">
                {segment.utterances.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">Tidak ada kalimat</p>
                ) : (
                  segment.utterances.map((utt) => (
                    <div key={utt.utterance_index} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:border-teal-200 transition-colors">
                      {/* Utterance Header */}
                      <div 
                        className="flex items-center justify-between p-3 border-b border-gray-100 cursor-pointer hover:bg-teal-50/30"
                        onClick={() => toggleUtterance(utt.utterance_index)}
                      >
                        <div className="flex items-center gap-2">
                          {expandedUtteranceIdx === utt.utterance_index ? <ChevronDown size={14} className="text-teal-600" /> : <ChevronRight size={14} className="text-gray-400" />}
                          <span className="text-sm font-medium text-gray-700">Kalimat {utt.utterance_index}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 font-mono">
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
                      {expandedUtteranceIdx === utt.utterance_index && (
                        <div className="p-2 grid grid-cols-1 md:grid-cols-2 gap-2 bg-teal-50/10">
                          
                          {/* Kiri: Video & WAV */}
                          <div className="flex flex-col gap-2">
                            {/* Video Card */}
                            <Card className="shadow-none border-teal-100/50">
                              <CardContent className="p-2 flex flex-col gap-1.5">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-700">
                                  <Film size={12} /> Video Crop
                                </div>
                                <div className="bg-black rounded-md overflow-hidden aspect-video flex items-center justify-center border border-gray-800">
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
                              <CardContent className="p-2 flex flex-col gap-1.5">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-700">
                                  <Music size={12} /> Audio WAV
                                </div>
                                <div className="bg-gray-100 rounded-md p-2 flex flex-col items-center justify-center">
                                  {utt.cropped_video_url ? (
                                    <audio src={utt.cropped_video_url} controls className="w-full h-6" />
                                  ) : (
                                    <span className="text-xs text-gray-500">Audio belum tersedia</span>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </div>

                          {/* Kanan: Transkripsi & Glosa */}
                          <div className="flex flex-col gap-2">
                            {/* Transcription Card */}
                            <Card className="shadow-none border-teal-100/50 flex-1 flex flex-col">
                              <CardContent className="p-2 flex flex-col gap-1.5 flex-1">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-700">
                                  <FileText size={12} /> Transkripsi (ASR)
                                </div>
                                <div className="flex-1 bg-gray-50 border border-gray-100 rounded-md p-2 text-xs text-gray-700 line-clamp-3">
                                  {utt.asr_text || '-'}
                                </div>
                              </CardContent>
                            </Card>

                            {/* Glosa Card */}
                            <Card className="shadow-none border-teal-100/50 flex-1 flex flex-col">
                              <CardContent className="p-2 flex flex-col gap-1.5 flex-1">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-700">
                                  <MessageSquareText size={12} /> Glosa (Annotator)
                                </div>
                                <div className="flex-1 bg-teal-50/50 border border-teal-100 rounded-md p-2 text-xs text-teal-900 font-medium line-clamp-3">
                                  {utt.glosa_text || '-'}
                                </div>
                              </CardContent>
                            </Card>

                            {/* Lihat Detail Button */}
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="w-full h-8 text-teal-700 border-teal-200 hover:bg-teal-50 shadow-sm text-xs"
                              onClick={() => router.push(`/export/${jobId}/segment/${segment.segment_id}/kalimat/${utt.utterance_index}`)}
                            >
                              <FolderOpen size={14} className="mr-1.5" /> Lihat Detail Kalimat
                            </Button>
                          </div>

                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </Card>
        ))}
      </div>

    </div>
  );
}
