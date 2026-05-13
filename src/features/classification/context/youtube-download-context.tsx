'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';
import { classificationRepository } from '@/features/classification/api/classification.repository';
import type { YTDownloadState, YTStatus } from '@/features/classification/components/youtube-download-banner';

interface YoutubeDownloadContextValue {
  downloads: YTDownloadState[];
  startDownload: (downloadId: string, datasetId?: string) => void;
  dismissDownload: (downloadId: string) => void;
}

const YoutubeDownloadContext = createContext<YoutubeDownloadContextValue | null>(null);

export function YoutubeDownloadProvider({ children }: { children: ReactNode }) {
  const [downloads, setDownloads] = useState<YTDownloadState[]>([]);
  const pollRefs = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  const dismissDownload = useCallback((downloadId: string) => {
    setDownloads((prev) => prev.filter((d) => d.downloadId !== downloadId));
    if (pollRefs.current[downloadId]) {
      clearInterval(pollRefs.current[downloadId]);
      delete pollRefs.current[downloadId];
    }
  }, []);

  const startDownload = useCallback((downloadId: string, datasetId?: string) => {
    setDownloads((prev) => {
      if (prev.some((d) => d.downloadId === downloadId)) return prev;
      return [
        ...prev,
        {
          downloadId,
          status: 'pending',
          title: null,
          percent: 0,
          speed: null,
          eta: null,
          error: null,
          job_id: null,
        },
      ];
    });

    if (pollRefs.current[downloadId]) {
      clearInterval(pollRefs.current[downloadId]);
    }

    pollRefs.current[downloadId] = setInterval(async () => {
      try {
        const data = await classificationRepository.getYoutubeDownloadProgress(downloadId);

        setDownloads((prev) =>
          prev.map((d) =>
            d.downloadId === downloadId
              ? {
                  ...d,
                  status: data.status as YTStatus,
                  title: data.title ?? d.title,
                  percent: data.percent,
                  speed: data.speed,
                  eta: data.eta,
                  error: data.error,
                  job_id: data.job_id,
                }
              : d,
          ),
        );

        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(pollRefs.current[downloadId]);
          delete pollRefs.current[downloadId];

          if (data.status === 'completed') {
            toast.success('Download YouTube selesai', {
              description: data.title ? `${data.title} siap untuk diklasifikasikan.` : 'Video siap untuk diklasifikasikan.',
              position: 'top-center',
            });
          } else if (data.status === 'failed') {
            toast.error('Download YouTube gagal', {
              description: data.error || 'Terjadi kesalahan saat mendownload video.',
              position: 'top-center',
            });
          }
        }
      } catch {
        // silently retry
      }
    }, 1500);
  }, []);

  // Cleanup all intervals on unmount
  useEffect(() => {
    return () => {
      Object.values(pollRefs.current).forEach(clearInterval);
      pollRefs.current = {};
    };
  }, []);

  return (
    <YoutubeDownloadContext.Provider value={{ downloads, startDownload, dismissDownload }}>
      {children}
    </YoutubeDownloadContext.Provider>
  );
}

export function useYoutubeDownloads() {
  const ctx = useContext(YoutubeDownloadContext);
  if (!ctx) {
    throw new Error('useYoutubeDownloads must be used within a YoutubeDownloadProvider');
  }
  return ctx;
}
