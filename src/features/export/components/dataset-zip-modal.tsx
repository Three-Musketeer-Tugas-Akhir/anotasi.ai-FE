'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Download, FolderTree, AlignLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/core/api/axios-client';

interface DatasetZipModalProps {
  jobId: string | null;
  filename: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DatasetZipDownloadModal({ jobId, filename, open, onOpenChange }: DatasetZipModalProps) {
  const [layout, setLayout] = useState<'file' | 'sentence'>('file');
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!jobId) return;
    setDownloading(true);
    try {
      const response = await apiClient.get(
        `/pipeline/jobs/${jobId}/dataset/download?layout=${layout}`,
        { responseType: 'blob' },
      );
      const disposition = (response.headers['content-disposition'] as string) || '';
      const match = disposition.match(/filename[^;=\n]*=([^;\n]*)/);
      const downloadName = match
        ? match[1].replace(/["']/g, '').trim()
        : `${filename}_dataset.zip`;

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Dataset berhasil diunduh', {
        description: `File ${downloadName} telah diunduh.`,
        position: 'top-center',
      });
      onOpenChange(false);
    } catch (err: unknown) {
      console.error('Failed to download ZIP', err);
      toast.error('Gagal mengunduh', {
        description: 'Terjadi kesalahan saat mengunduh dataset ZIP.',
        position: 'top-center',
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-slate-900">Pilih Struktur Folder ZIP</DialogTitle>
          <DialogDescription className="text-slate-500">
            Pilih cara pengelompokan file dalam folder dataset.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 py-2">
          {/* Option 1: File-focused */}
          <button
            onClick={() => setLayout('file')}
            disabled={downloading}
            className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
              layout === 'file'
                ? 'border-teal-500 bg-teal-50/50'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className={`p-2 rounded-lg mt-0.5 ${layout === 'file' ? 'bg-teal-100 text-teal-600' : 'bg-slate-100 text-slate-500'}`}>
              <FolderTree size={20} />
            </div>
            <div>
              <p className={`text-sm font-bold ${layout === 'file' ? 'text-teal-900' : 'text-slate-800'}`}>
                Berdasarkan Jenis File
              </p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Folder: video/, audio/, transkripsi/, glosa/<br />
                <span className="text-slate-400">Cocok untuk melihat semua video sekaligus</span>
              </p>
            </div>
          </button>

          {/* Option 2: Sentence-focused */}
          <button
            onClick={() => setLayout('sentence')}
            disabled={downloading}
            className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
              layout === 'sentence'
                ? 'border-teal-500 bg-teal-50/50'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className={`p-2 rounded-lg mt-0.5 ${layout === 'sentence' ? 'bg-teal-100 text-teal-600' : 'bg-slate-100 text-slate-500'}`}>
              <AlignLeft size={20} />
            </div>
            <div>
              <p className={`text-sm font-bold ${layout === 'sentence' ? 'text-teal-900' : 'text-slate-800'}`}>
                Berdasarkan Kalimat
              </p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Folder: kalimat_0001/, kalimat_0002/, ...<br />
                <span className="text-slate-400">Cocok untuk melihat semua file per kalimat</span>
              </p>
            </div>
          </button>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={downloading} className="text-sm">
            Batal
          </Button>
          <Button
            onClick={handleDownload}
            disabled={downloading}
            className="text-sm bg-teal-600 hover:bg-teal-700 text-white"
          >
            {downloading ? (
              <><Loader2 size={14} className="mr-1.5 animate-spin" /> Mengunduh...</>
            ) : (
              <><Download size={14} className="mr-1.5" /> Download ZIP</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
