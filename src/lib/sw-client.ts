/**
 * Service Worker client for background uploads.
 * Handles registration, messaging, and progress tracking.
 */

import { uploadDb } from './upload-db';

const SW_PATH = '/sw-upload.js';
const BC_CHANNEL = 'anotasi-uploads';

let swRegistration: ServiceWorkerRegistration | null = null;
let broadcastChannel: BroadcastChannel | null = null;

export interface SWUploadProgress {
  uploadId: string;
  progress: number;
}

export interface SWUploadComplete {
  uploadId: string;
  jobId: string;
}

export interface SWUploadError {
  uploadId: string;
  error: string;
}

type UploadListener = (event: { type: string; payload: unknown }) => void;
const listeners = new Set<UploadListener>();

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

function initBroadcastChannel() {
  if (broadcastChannel) return;
  if (typeof BroadcastChannel === 'undefined') return;

  broadcastChannel = new BroadcastChannel(BC_CHANNEL);
  broadcastChannel.onmessage = (event) => {
    const { type, payload } = event.data || {};
    listeners.forEach((fn) => fn({ type, payload }));
  };
}

export const swClient = {
  async register(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    if (!('serviceWorker' in navigator)) return false;

    try {
      swRegistration = await navigator.serviceWorker.register(SW_PATH, {
        scope: '/',
      });
      console.log('[SW-Client] Registered:', swRegistration.scope);
      initBroadcastChannel();
      return true;
    } catch (err) {
      console.error('[SW-Client] Registration failed:', err);
      return false;
    }
  },

  async startUpload(
    file: File,
    metadata: { category?: string; dataset_id?: string },
    onProgress?: (progress: number) => void,
    onComplete?: (jobId: string) => void,
    onError?: (error: string) => void,
  ): Promise<string> {
    const token = getToken();
    if (!token) throw new Error('No auth token available');

    // Store file in IndexedDB for SW access
    const fileId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    await uploadDb.storeFile(file, fileId, metadata);

    // Create a synthetic uploadId for tracking before SW creates the real one
    const trackingId = fileId;

    // Set up listener for this upload
    const listener: UploadListener = (event) => {
      const { type, payload } = event;
      if (type === 'UPLOAD_STARTED' && (payload as { filename: string }).filename === file.name) {
        // Real uploadId assigned
      }
      if (type === 'UPLOAD_PROGRESS' && (payload as SWUploadProgress).uploadId) {
        onProgress?.((payload as SWUploadProgress).progress);
      }
      if (type === 'UPLOAD_COMPLETE' && (payload as SWUploadComplete).jobId) {
        onComplete?.((payload as SWUploadComplete).jobId);
        cleanup();
      }
      if (type === 'UPLOAD_ERROR') {
        onError?.((payload as SWUploadError).error);
        cleanup();
      }
    };

    const cleanup = () => listeners.delete(listener);
    listeners.add(listener);

    // Send message to SW
    if (swRegistration?.active) {
      swRegistration.active.postMessage({
        type: 'START_UPLOAD',
        payload: { fileId, token, metadata },
      });
    } else {
      // Fallback: start upload directly in main thread
      cleanup();
      throw new Error('Service Worker not active');
    }

    return trackingId;
  },

  async cancelUpload(uploadId: string): Promise<void> {
    const token = getToken();
    if (!token) return;

    if (swRegistration?.active) {
      swRegistration.active.postMessage({
        type: 'CANCEL_UPLOAD',
        payload: { uploadId, token },
      });
    }
  },

  async getUploadsStatus(): Promise<unknown[]> {
    if (!swRegistration?.active) return [];

    return new Promise((resolve) => {
      const handler = (event: MessageEvent) => {
        if (event.data?.type === 'UPLOADS_STATUS') {
          navigator.serviceWorker.removeEventListener('message', handler);
          resolve(event.data.payload || []);
        }
      };
      navigator.serviceWorker.addEventListener('message', handler);

      // Also try via active controller
      swRegistration?.active?.postMessage({ type: 'GET_STATUS' });

      // Timeout fallback
      setTimeout(() => resolve([]), 2000);
    });
  },

  subscribe(fn: UploadListener): () => void {
    listeners.add(fn);
    initBroadcastChannel();
    return () => listeners.delete(fn);
  },

  async unregister(): Promise<void> {
    if (swRegistration) {
      await swRegistration.unregister();
      swRegistration = null;
    }
    if (broadcastChannel) {
      broadcastChannel.close();
      broadcastChannel = null;
    }
  },
};
