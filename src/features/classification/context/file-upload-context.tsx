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
  isResumed?: boolean;
}

interface FileUploadContextValue {
  uploads: FileUploadState[];
  startUpload: (file: File, datasetId?: string) => void;
  cancelUpload: (uploadId: string) => void;
  dismissUpload: (uploadId: string) => void;
  resumeUpload: (uploadId: string, file: File) => void;
}

const FileUploadContext = createContext<FileUploadContextValue | null>(null);

const STORAGE_KEY = 'anotasi-uploads-v1';
const SESSION_KEY = 'anotasi-active-uploads';
const MAX_SIMPLE_UPLOAD = 200 * 1024 * 1024; // 200MB — files larger than this use chunked Tus upload

function loadUploadsFromStorage(): FileUploadState[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FileUploadState[];
    // Keep in-progress uploads as-is; we will check server status on mount
    return parsed;
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

function getSessionUploads(): Array<{ uploadId: string; fileName: string; fileSize: number }> {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setSessionUploads(uploads: Array<{ uploadId: string; fileName: string; fileSize: number }>) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(uploads));
  } catch {
    // ignore
  }
}

function addSessionUpload(upload: { uploadId: string; fileName: string; fileSize: number }) {
  const current = getSessionUploads();
  current.push(upload);
  setSessionUploads(current);
}

function removeSessionUpload(uploadId: string) {
  const current = getSessionUploads().filter((u) => u.uploadId !== uploadId);
  setSessionUploads(current);
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
    removeSessionUpload(uploadId);
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
    removeSessionUpload(uploadId);
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
      removeSessionUpload(uploadId);
      delete abortRefs.current[uploadId];
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
      addSessionUpload({ uploadId, fileName: file.name, fileSize: file.size });

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

  /**
   * Resume an upload after page refresh.
   * This checks server status and continues from where it left off.
   */
  const resumeUpload = useCallback(
    async (uploadId: string, file: File) => {
      const controller = new AbortController();
      abortRefs.current[uploadId] = controller;

      setUploads((prev) =>
        prev.map((u) =>
          u.uploadId === uploadId
            ? { ...u, status: 'uploading', error: null, isResumed: true }
            : u,
        ),
      );

      toast.info('Melanjutkan upload', {
        description: `${file.name} sedang dilanjutkan...`,
        position: 'top-center',
      });

      const onProgress = (percent: number) => {
        setUploads((prev) =>
          prev.map((u) =>
            u.uploadId === uploadId ? { ...u, progress: percent } : u,
          ),
        );
      };

      // Always use chunked upload for resume
      classificationRepository
        .uploadVideoChunked(file, undefined, {
          signal: controller.signal,
          onProgress,
        })
        .then((data) => handleUploadSuccess(uploadId, data))
        .catch((err) => handleUploadError(uploadId, err));
    },
    [handleUploadSuccess, handleUploadError],
  );

  // On mount: check for interrupted uploads and try to reconnect
  useEffect(() => {
    const sessionUploads = getSessionUploads();
    if (sessionUploads.length === 0) return;

    // For each session upload, poll server status
    sessionUploads.forEach(async ({ uploadId, fileName, fileSize }) => {
      try {
        // Check if we already have this upload in state
        const existing = uploads.find((u) => u.uploadId === uploadId);
        if (existing && (existing.status === 'completed' || existing.status === 'failed')) {
          return;
        }

        // We can't poll without the uploadId from the server, so we just mark as interrupted
        // The user will need to re-select the file to resume
        setUploads((prev) => {
          if (prev.find((u) => u.uploadId === uploadId)) {
            return prev.map((u) =>
              u.uploadId === uploadId
                ? {
                    ...u,
                    status: 'assembling',
                    error:
                      'Upload terputus karena halaman dimuat ulang. Pilih file yang sama untuk melanjutkan.',
                  }
                : u,
            );
          }
          return [
            ...prev,
            {
              uploadId,
              fileName,
              progress: 0,
              status: 'assembling',
              error:
                'Upload terputus karena halaman dimuat ulang. Pilih file yang sama untuk melanjutkan.',
              jobId: null,
            },
          ];
        });
      } catch {
        // ignore
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <FileUploadContext.Provider
      value={{ uploads, startUpload, cancelUpload, dismissUpload, resumeUpload }}
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
