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
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/core/api/axios-client';

interface DatasetZipModalProps {
  jobId: string | null;
  filename: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DatasetZipDownloadModal({ jobId, filename, open, onOpenChange }: DatasetZipModalProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!jobId) return;
    setDownloading(true);
    try {
      const response = await apiClient.get(
        `/pipeline/jobs/${jobId}/dataset/download?layout=file`,
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
          <DialogTitle className="text-slate-900">Konfirmasi Unduh Dataset</DialogTitle>
          <DialogDescription className="text-slate-500">
            Apakah Anda yakin ingin mengunduh dataset ini?
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:justify-end mt-4">
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
              <><Download size={14} className="mr-1.5" /> Ya, unduh</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
