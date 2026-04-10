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
} from 'lucide-react';
import type { SegmentDetailResponse, SegmentEditHistory } from '../annotation-types';

// ── Types ──────────────────────────────────────────────────────────

export interface AnnotationEditData {
  newText: string;
  newStart: number;
  newEnd: number;
}

interface PropertiesPanelProps {
  segment: SegmentDetailResponse;
  editData: AnnotationEditData;
  onEditDataChange: (updates: Partial<AnnotationEditData>) => void;
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

// ── Component ──────────────────────────────────────────────────────

export function PropertiesPanel({ segment, editData, onEditDataChange }: PropertiesPanelProps) {
  const confBadge = getConfidenceBadge(segment.asr_confidence);

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
            {/* ── ASR Original (read-only) ── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] text-gray-400 uppercase tracking-wider font-bold flex items-center gap-1">
                  <Volume2 size={10} /> Transkripsi ASR (Referensi)
                </Label>
                <Badge variant="outline" className={`text-[9px] ${confBadge.className}`}>
                  <Shield size={8} className="mr-0.5" />
                  {confBadge.label}
                </Badge>
              </div>
              <div className="p-2.5 border border-blue-200 rounded-lg bg-blue-50 text-xs text-blue-900 leading-relaxed min-h-[40px]">
                {segment.asr_text || '(tidak ada transkripsi)'}
              </div>
              <div className="flex gap-3 text-[10px] text-gray-400">
                <span>Start: <strong className="text-gray-600">{formatTs(segment.asr_start)}</strong></span>
                <span>End: <strong className="text-gray-600">{formatTs(segment.asr_end)}</strong></span>
              </div>
            </div>

            {/* ── JBI Timestamps (read-only reference) ── */}
            {(segment.jbi_start !== null || segment.jbi_end !== null) && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-2.5">
                <Label className="text-[10px] text-purple-500 uppercase tracking-wider font-bold">
                  JBI Detection Timestamps
                </Label>
                <div className="flex gap-3 text-[10px] text-purple-700 mt-1">
                  <span>Start: <strong>{formatTs(segment.jbi_start)}</strong></span>
                  <span>End: <strong>{formatTs(segment.jbi_end)}</strong></span>
                </div>
              </div>
            )}

            {/* ── Editable: Current/Draft Values ── */}
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <Label className="text-[10px] text-teal-600 uppercase tracking-wider font-bold flex items-center gap-1">
                <FileText size={10} /> Koreksi Anotasi
              </Label>

              <div>
                <Label htmlFor="ann-text" className="text-xs text-gray-600 font-medium">
                  Teks Transkripsi *
                </Label>
                <Textarea
                  id="ann-text"
                  value={editData.newText}
                  onChange={(e) => onEditDataChange({ newText: e.target.value })}
                  placeholder="Tulis koreksi transkripsi..."
                  className="mt-1 text-sm resize-none h-24 border-teal-200 focus-visible:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="ann-start" className="text-xs text-gray-500">
                    Mulai (detik)
                  </Label>
                  <Input
                    id="ann-start"
                    type="number"
                    step="0.01"
                    min={0}
                    value={editData.newStart.toFixed(2)}
                    onChange={(e) => onEditDataChange({ newStart: parseFloat(e.target.value) || 0 })}
                    className="h-8 text-sm font-mono"
                  />
                </div>
                <div>
                  <Label htmlFor="ann-end" className="text-xs text-gray-500">
                    Berakhir (detik)
                  </Label>
                  <Input
                    id="ann-end"
                    type="number"
                    step="0.01"
                    min={0}
                    value={editData.newEnd.toFixed(2)}
                    onChange={(e) => onEditDataChange({ newEnd: parseFloat(e.target.value) || 0 })}
                    className="h-8 text-sm font-mono"
                  />
                </div>
              </div>
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
