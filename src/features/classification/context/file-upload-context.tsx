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
import { swClient } from '@/lib/sw-client';

export interface FileUploadState {
  uploadId: string;
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed' | 'cancelled' | 'assembling';
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
const MAX_SIMPLE_UPLOAD = 50 * 1024 * 1024; // 50MB — files larger than this use chunked Tus upload

// Statuses that mean "a request is supposedly in flight". Persisted to
// localStorage so the card survives a reload, but the AbortController that
// actually drives the upload lives only in memory (abortRefs) — it cannot
// survive a reload. So on every fresh mount, any entry still carrying one of
// these statuses is provably orphaned: nothing is actually uploading it
// anymore, regardless of how it got interrupted (tab crash, reload, browser
// closed). There used to be a second sessionStorage-based tracker that tried
// to distinguish "really orphaned" from "browser still open elsewhere", but
// sessionStorage does not survive a crash or a fresh tab either, so it just
// missed most real orphans — they sat forever as a live-looking progress bar
// with nothing behind it.
const ORPHANABLE_STATUSES: FileUploadState['status'][] = ['pending', 'uploading', 'assembling'];

function loadUploadsFromStorage(): FileUploadState[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FileUploadState[];
    // Every one of these is orphaned the instant we load it — see
    // ORPHANABLE_STATUSES. Mark them here, at load time, so the UI never
    // renders a phantom "in progress" state even for one frame.
    return parsed.map((u) =>
      ORPHANABLE_STATUSES.includes(u.status)
        ? {
            ...u,
            status: 'failed',
            error:
              'Upload terhenti karena halaman dimuat ulang atau tab ditutup. Silakan unggah ulang file ini.',
          }
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
  const swRegistered = useRef(false);

  // Persist uploads to localStorage on every change
  useEffect(() => {
    saveUploadsToStorage(uploads);
  }, [uploads]);

  // Register Service Worker on mount
  useEffect(() => {
    if (!swRegistered.current) {
      swRegistered.current = true;
      swClient.register().catch(() => {
        // SW is optional; fallback to main-thread upload works fine
      });
    }
  }, []);

  // Beforeunload warning when uploads are active
  useEffect(() => {
    const hasActive = uploads.some(
      (u) => u.status === 'uploading' || u.status === 'pending' || u.status === 'assembling',
    );
    if (!hasActive) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Upload masih berlangsung. Yakin ingin meninggalkan halaman?';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
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
    }
    // Also try to cancel via SW
    swClient.cancelUpload(uploadId).catch(() => {});

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
  }, []);

  const handleUploadSuccess = useCallback(
    (uploadId: string, data: { id?: string | null; job_id?: string | null; jobId?: string | null }) => {
      // Extract job ID from either TUS result shape or legacy shape
      const resolvedJobId = String(data.job_id || data.jobId || data.id || '');
      setUploads((prev) =>
        prev.map((u) =>
          u.uploadId === uploadId
            ? {
                ...u,
                status: 'completed',
                progress: 100,
                jobId: resolvedJobId || null,
              }
            : u,
        ),
      );
      delete abortRefs.current[uploadId];

      if (resolvedJobId) {
        window.dispatchEvent(
          new CustomEvent('JOB_UPLOADED', { detail: { jobId: resolvedJobId } }),
        );
      }
    },
    [],
  );

  const handleUploadError = useCallback((uploadId: string, err: unknown) => {
    if ((err as Error).name === 'AbortError' || (err as { code?: string }).code === 'ERR_CANCELED') {
      return;
    }
    const message =
      (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
      (err as Error)?.message ||
      'Terjadi kesalahan saat mengunggah.';
    setUploads((prev) =>
      prev.map((u) =>
        u.uploadId === uploadId ? { ...u, status: 'failed', error: message } : u,
      ),
    );
    toast.error('Upload gagal', {
      description: message,
      position: 'top-center',
    });
    delete abortRefs.current[uploadId];
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

      const onProgress = (percent: number) => {
        setUploads((prev) =>
          prev.map((u) =>
            u.uploadId === uploadId ? { ...u, progress: percent } : u,
          ),
        );
      };

      const uploadPromise =
        file.size > MAX_SIMPLE_UPLOAD
          ? classificationRepository.uploadVideoChunked(file, datasetId, {
              signal: controller.signal,
              onProgress,
            })
          : classificationRepository.uploadVideo(file, datasetId, {
              signal: controller.signal,
              onProgress,
            });

      uploadPromise
        .then((data) => handleUploadSuccess(uploadId, data))
        .catch((err) => handleUploadError(uploadId, err));
    },
    [handleUploadSuccess, handleUploadError],
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
