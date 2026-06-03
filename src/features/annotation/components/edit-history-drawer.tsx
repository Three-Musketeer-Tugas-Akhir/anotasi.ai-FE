'use client';

import { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { annotationApi } from '../annotation-api';
import type { SegmentEditHistory } from '../annotation-types';
import { Loader2, History, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EditHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  segmentId: string | null;
}

export function EditHistoryDrawer({ isOpen, onClose, segmentId }: EditHistoryDrawerProps) {
  const [history, setHistory] = useState<SegmentEditHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && segmentId) {
      setLoading(true);
      setError(null);
      annotationApi
        .getEditHistory(segmentId)
        .then((res) => {
          // Flatten edits (the API actually returns edits directly inside 'edits' or similar)
          // Wait, the API returns AnnotationEditListResponse which has `edits` of type AnnotationEditResponse[]
          // but we mapped it to `SegmentEditHistory`? No, wait! The UAT API `getEditHistory` returns `AnnotationEditListResponse`.
          setHistory((res.edits as any) || []);
        })
        .catch(() => {
          setError('Gagal memuat riwayat edit.');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, segmentId]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-[450px] sm:w-[540px] flex flex-col p-0 border-l border-slate-200">
        <SheetHeader className="px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
          <SheetTitle className="flex items-center gap-2 text-xl font-bold text-slate-800">
            <History className="w-5 h-5 text-teal-600" />
            Riwayat Edit Segment
          </SheetTitle>
          <SheetDescription>
            Riwayat perubahan anotasi dari yang terbaru.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
              <Loader2 className="w-8 h-8 animate-spin mb-4" />
              <p>Memuat riwayat...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
              <AlertTriangle className="w-8 h-8 text-red-400 mb-4" />
              <p className="text-red-500">{error}</p>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
              <History className="w-12 h-12 opacity-20 mb-4" />
              <p>Belum ada riwayat edit.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {history.map((edit, idx) => (
                <div key={edit.edit_id || idx} className="relative pl-6 border-l-2 border-slate-200 last:border-transparent pb-6 last:pb-0">
                  <div className="absolute w-3 h-3 bg-teal-500 rounded-full -left-[7px] top-1.5 border-2 border-white shadow-sm" />
                  <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 hover:border-teal-100 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <Badge variant="outline" className={`text-xs mb-2 ${edit.status === 'OK' || edit.status === 'APPROVED' ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                          {edit.status}
                        </Badge>
                        <p className="text-xs text-slate-500 font-medium">
                          {edit.edited_at ? formatDate(edit.edited_at) : 'Waktu tidak diketahui'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm">
                        <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Teks Baru</span>
                        <p className="text-slate-800 font-medium">{edit.new_text || '(kosong)'}</p>
                      </div>
                      
                      {(edit.old_text && edit.old_text !== edit.new_text) && (
                        <div className="bg-red-50 p-3 rounded-lg border border-red-100 text-sm">
                          <span className="text-xs font-bold text-red-400 uppercase block mb-1">Teks Lama</span>
                          <p className="text-red-800 font-medium line-through">{edit.old_text}</p>
                        </div>
                      )}
                      
                      <div className="flex gap-4 text-xs font-mono text-slate-500 mt-2">
                        <span>Waktu: {edit.new_start?.toFixed(2)}s - {edit.new_end?.toFixed(2)}s</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
