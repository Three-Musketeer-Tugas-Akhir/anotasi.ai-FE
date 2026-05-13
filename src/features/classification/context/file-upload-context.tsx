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

export interface FileUploadState {
  uploadId: string;
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed' | 'cancelled';
  error: string | null;
  jobId: string | null;
}

interface FileUploadContextValue {
  uploads: FileUploadState[];
  startUpload: (file: File, datasetId?: string) => void;
  cancelUpload: (uploadId: string) => void;
  dismissUpload: (uploadId: string) => void;
}

const FileUploadContext = createContext<FileUploadContextValue | null>(null);

const STORAGE_KEY = 'anotasi-uploads-v1';

function loadUploadsFromStorage(): FileUploadState[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FileUploadState[];
    // Mark any in-progress uploads as failed (can't recover AbortController)
    return parsed.map((u) =>
      u.status === 'uploading' || u.status === 'pending'
        ? { ...u, status: 'failed' as const, error: 'Upload terputus karena halaman dimuat ulang.' }
        : u,
    );
  } catch {
    return [];
  }
}

function saveUploadsToStorage(uploads: FileUploadState[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(uploads));
  } catch {
    // ignore
  }
}

export function FileUploadProvider({ children }: { children: ReactNode }) {
  const [uploads, setUploads] = useState<FileUploadState[]>(loadUploadsFromStorage);
  const abortRefs = useRef<Record<string, AbortController>>({});

  // Persist uploads to localStorage on every change
  useEffect(() => {
    saveUploadsToStorage(uploads);
  }, [uploads]);

  const dismissUpload = useCallback((uploadId: string) => {
    setUploads((prev) => prev.filter((u) => u.uploadId !== uploadId));
    if (abortRefs.current[uploadId]) {
      delete abortRefs.current[uploadId];
    }
  }, []);

  const cancelUpload = useCallback((uploadId: string) => {
    const controller = abortRefs.current[uploadId];
    if (controller) {
      controller.abort();
      setUploads((prev) =>
        prev.map((u) =>
          u.uploadId === uploadId
            ? { ...u, status: 'cancelled', error: 'Dibatalkan oleh pengguna.' }
            : u,
        ),
      );
      delete abortRefs.current[uploadId];
      toast.info('Upload dibatalkan', {
        description: 'Proses upload telah dihentikan.',
        position: 'top-center',
      });
    }
  }, []);

  const startUpload = useCallback(
    (file: File, datasetId?: string) => {
      const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const controller = new AbortController();
      abortRefs.current[uploadId] = controller;

      const initialState: FileUploadState = {
        uploadId,
        fileName: file.name,
        progress: 0,
        status: 'uploading',
        error: null,
        jobId: null,
      };

      setUploads((prev) => [...prev, initialState]);
      toast.info('Upload dimulai', {
        description: `${file.name} sedang diunggah...`,
        position: 'top-center',
      });

      classificationRepository
        .uploadVideo(file, datasetId, {
          signal: controller.signal,
          onProgress: (percent) => {
            setUploads((prev) =>
              prev.map((u) =>
                u.uploadId === uploadId ? { ...u, progress: percent } : u,
              ),
            );
          },
        })
        .then((data) => {
          setUploads((prev) =>
            prev.map((u) =>
              u.uploadId === uploadId
                ? {
                    ...u,
                    status: 'completed',
                    progress: 100,
                    jobId: String(data.id),
                  }
                : u,
            ),
          );
          toast.success('Video berhasil diupload', {
            description: `${file.name} telah ditambahkan ke daftar klasifikasi.`,
            position: 'top-center',
          });
          delete abortRefs.current[uploadId];
        })
        .catch((err) => {
          if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
            // Already handled by cancelUpload
            return;
          }
          const message =
            err?.response?.data?.detail ||
            err?.response?.data?.message ||
            'Terjadi kesalahan saat mengunggah.';
          setUploads((prev) =>
            prev.map((u) =>
              u.uploadId === uploadId
                ? { ...u, status: 'failed', error: message }
                : u,
            ),
          );
          toast.error('Upload gagal', {
            description: message,
            position: 'top-center',
          });
          delete abortRefs.current[uploadId];
        });
    },
    [],
  );

  return (
    <FileUploadContext.Provider
      value={{ uploads, startUpload, cancelUpload, dismissUpload }}
    >
      {children}
    </FileUploadContext.Provider>
  );
}

export function useFileUploads() {
  const ctx = useContext(FileUploadContext);
  if (!ctx) {
    throw new Error('useFileUploads must be used within a FileUploadProvider');
  }
  return ctx;
}
