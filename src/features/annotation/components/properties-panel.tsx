'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Shield,
  Clock,
  FileText,
  History,
  Volume2,
  List,
  GripVertical,
} from 'lucide-react';
import type {
  SegmentDetailResponse,
  SegmentEditHistory,
  TranscriptUtterance,
  UtteranceCorrection,
} from '../annotation-types';

// ── Types ──────────────────────────────────────────────────────────

interface PropertiesPanelProps {
  segment: SegmentDetailResponse;
  utteranceEdits: UtteranceCorrection[];
  onUtteranceChange: (index: number, updates: Partial<UtteranceCorrection>) => void;
}

// ── Helpers ────────────────────────────────────────────────────────

function formatTs(s: number | null): string {
  if (s === null || s === undefined) return '--:--';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.round((s % 1) * 100);
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

function getConfidenceBadge(score: number | null): { label: string; className: string } {
  if (score === null) return { label: 'N/A', className: 'bg-gray-100 text-gray-500 border-gray-200' };
  if (score >= 0.9) return { label: `${Math.round(score * 100)}% Tinggi`, className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (score >= 0.5) return { label: `${Math.round(score * 100)}% Sedang`, className: 'bg-amber-50 text-amber-700 border-amber-200' };
  return { label: `${Math.round(score * 100)}% Rendah`, className: 'bg-red-50 text-red-700 border-red-200' };
}

function getConfidenceDot(score: number | null): string {
  if (score === null) return 'bg-gray-300';
  if (score >= 0.9) return 'bg-emerald-500';
  if (score >= 0.5) return 'bg-amber-500';
  return 'bg-red-500';
}

// ── Sub-component: Single Utterance Card ───────────────────────────

function UtteranceCard({
  transcript,
  edit,
  onChange,
}: {
  transcript: TranscriptUtterance;
  edit: UtteranceCorrection;
  onChange: (updates: Partial<UtteranceCorrection>) => void;
}) {
  const confBadge = getConfidenceBadge(transcript.confidence);
  const isModified = edit.text !== transcript.text || edit.start !== transcript.start || edit.end !== transcript.end;

  return (
    <div className={`border rounded-lg p-3 transition-colors ${isModified ? 'border-teal-200 bg-teal-50/30' : 'border-gray-100 bg-white'}`}>
      {/* Header row: index + timestamps + confidence */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[10px] text-gray-400">
            <GripVertical size={10} className="text-gray-300" />
            <span className="font-mono font-bold text-gray-500">#{transcript.utterance_index}</span>
          </div>
          <Badge variant="outline" className={`text-[9px] px-1 py-0 gap-0.5 ${confBadge.className}`}>
            <Shield size={7} className="mr-0.5" />
            {confBadge.label}
          </Badge>
          {isModified && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 bg-teal-50 text-teal-600 border-teal-200">
              diedit
            </Badge>
          )}
        </div>
        <div className="text-[10px] font-mono text-gray-400">
          {formatTs(transcript.start)} → {formatTs(transcript.end)}
        </div>
      </div>

      {/* ASR Reference (collapsible-style compact display) */}
      <div className="mb-2">
        <div className="text-[10px] text-gray-400 mb-0.5 flex items-center gap-1">
          <Volume2 size={8} />
          ASR Referensi
        </div>
        <div className="text-[11px] text-gray-500 bg-gray-50 border border-gray-100 rounded px-2 py-1 leading-relaxed">
          {transcript.text}
        </div>
      </div>

      {/* Editable Correction */}
      <div>
        <div className="text-[10px] text-teal-600 mb-0.5 flex items-center gap-1 font-medium">
          <FileText size={8} />
          Koreksi
        </div>
        <Textarea
          value={edit.text}
          onChange={(e) => onChange({ text: e.target.value })}
          placeholder="Tulis koreksi..."
          className="text-xs resize-none h-14 border-teal-200 focus-visible:ring-teal-500 mb-2"
        />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[9px] text-gray-400">Mulai (detik)</Label>
            <Input
              type="number"
              step="0.01"
              min={0}
              value={edit.start.toFixed(2)}
              onChange={(e) => onChange({ start: parseFloat(e.target.value) || 0 })}
              className="h-7 text-xs font-mono"
            />
          </div>
          <div>
            <Label className="text-[9px] text-gray-400">Berakhir (detik)</Label>
            <Input
              type="number"
              step="0.01"
              min={0}
              value={edit.end.toFixed(2)}
              onChange={(e) => onChange({ end: parseFloat(e.target.value) || 0 })}
              className="h-7 text-xs font-mono"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────

export function PropertiesPanel({ segment, utteranceEdits, onUtteranceChange }: PropertiesPanelProps) {
  const avgConfBadge = getConfidenceBadge(segment.avg_confidence);

  return (
    <Card className="h-full border-gray-200 flex flex-col shadow-sm">
      <CardHeader className="py-3 border-b border-gray-100 bg-gray-50">
        <CardTitle className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <FileText size={14} className="text-teal-600" />
          Annotation Editor
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0 flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4">
            {/* ── Segment Summary ── */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <List size={12} className="text-gray-400" />
                <span className="text-xs text-gray-600 font-medium">
                  {segment.transcripts.length} utterance{segment.transcripts.length !== 1 ? 's' : ''}
                </span>
              </div>
              {segment.avg_confidence !== null && (
                <Badge variant="outline" className={`text-[9px] ${avgConfBadge.className}`}>
                  <Shield size={8} className="mr-0.5" />
                  Avg: {avgConfBadge.label}
                </Badge>
              )}
            </div>

            {/* ── Aggregated Current Text (read-only reference) ── */}
            <div className="p-2.5 border border-gray-200 rounded-lg bg-white">
              <Label className="text-[10px] text-gray-400 uppercase tracking-wider font-bold flex items-center gap-1 mb-1">
                <FileText size={10} /> Teks Aggregrat Saat Ini
              </Label>
              <p className="text-xs text-gray-700 leading-relaxed">
                {segment.current_text || '(tidak ada teks)'}
              </p>
              <div className="flex gap-3 text-[10px] text-gray-400 mt-1">
                <span>Range: <strong className="text-gray-600">{formatTs(segment.current_start)} → {formatTs(segment.current_end)}</strong></span>
              </div>
            </div>

            {/* ── Utterance List ── */}
            <div className="space-y-2">
              <Label className="text-[10px] text-teal-600 uppercase tracking-wider font-bold flex items-center gap-1">
                <Volume2 size={10} /> Daftar Utterance ASR
              </Label>
              {segment.transcripts.length === 0 ? (
                <div className="text-xs text-gray-400 italic p-4 text-center border border-dashed border-gray-200 rounded-lg">
                  Tidak ada transkripsi untuk segmen ini
                </div>
              ) : (
                <div className="space-y-2">
                  {segment.transcripts.map((transcript, idx) => {
                    const edit = utteranceEdits[idx] || {
                      utterance_index: transcript.utterance_index,
                      text: transcript.text,
                      start: transcript.start,
                      end: transcript.end,
                    };
                    return (
                      <UtteranceCard
                        key={transcript.utterance_index}
                        transcript={transcript}
                        edit={edit}
                        onChange={(updates) => onUtteranceChange(idx, updates)}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Edit History ── */}
            {segment.edit_history.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <Label className="text-[10px] text-gray-400 uppercase tracking-wider font-bold flex items-center gap-1">
                  <History size={10} /> Riwayat Edit ({segment.edit_history.length})
                </Label>
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                  {segment.edit_history.map((edit: SegmentEditHistory) => (
                    <div
                      key={edit.edit_id}
                      className="border border-gray-100 rounded-lg p-2 bg-gray-50/50 text-[10px]"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="text-[9px] px-1 py-0 bg-gray-100 text-gray-500 border-gray-200">
                          {edit.status}
                        </Badge>
                        <span className="text-gray-400 flex items-center gap-0.5">
                          <Clock size={8} />
                          {new Date(edit.edited_at).toLocaleString('id-ID')}
                        </span>
                      </div>
                      <p className="text-gray-600 line-clamp-2 leading-relaxed">{edit.new_text}</p>
                      <div className="text-gray-400 mt-1">
                        {formatTs(edit.new_start)} → {formatTs(edit.new_end)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
