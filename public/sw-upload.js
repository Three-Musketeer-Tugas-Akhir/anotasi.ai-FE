/**
 * Service Worker for background video uploads.
 * Handles Tus Protocol chunked uploads independently of the main page.
 */

const API_BASE = self.location.origin.includes('localhost')
  ? 'http://localhost:8000/api/v1'
  : self.location.origin + '/api/v1';

const DB_NAME = 'anotasi-uploads-db';
const DB_VERSION = 1;
const CHUNK_SIZE = 5 * 1024 * 1024;
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000;
const POLL_INTERVAL = 2000;
const MAX_POLL_TIME = 5 * 60 * 1000;

// Broadcast channel for progress updates
let bc = null;
try {
  bc = new BroadcastChannel('anotasi-uploads');
} catch (e) {
  console.warn('[SW] BroadcastChannel not supported', e);
}

function postMessage(type, payload) {
  if (bc) {
    bc.postMessage({ type, payload });
  }
  // Also try to post to all clients
  self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
    clients.forEach(client => client.postMessage({ type, payload }));
  });
}

async function getDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('files')) db.createObjectStore('files', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('uploads')) db.createObjectStore('uploads', { keyPath: 'uploadId' });
    };
  });
}

async function getFile(fileId) {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readonly');
    const store = tx.objectStore('files');
    const req = store.get(fileId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveUpload(record) {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('uploads', 'readwrite');
    const store = tx.objectStore('uploads');
    const req = store.put({ ...record, updatedAt: Date.now() });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function deleteUpload(uploadId) {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('uploads', 'readwrite');
    const store = tx.objectStore('uploads');
    const req = store.delete(uploadId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function deleteFile(fileId) {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('files', 'readwrite');
    const store = tx.objectStore('files');
    const req = store.delete(fileId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options, retries = MAX_RETRIES) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok && res.status >= 400 && res.status < 500 && res.status !== 409 && res.status !== 423) {
        throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (err) {
      lastErr = err;
      if (i < retries) {
        await sleep(RETRY_DELAY_BASE * Math.pow(2, i));
      }
    }
  }
  throw lastErr;
}

async function createUpload(file, token, metadata) {
  const metaParts = [];
  metaParts.push(`filename ${btoa(file.name)}`);
  metaParts.push(`filetype ${btoa(file.type || 'video/mp4')}`);
  if (metadata.category) metaParts.push(`category ${btoa(metadata.category)}`);
  if (metadata.dataset_id) metaParts.push(`dataset_id ${btoa(metadata.dataset_id)}`);

  const res = await fetchWithRetry(`${API_BASE}/upload/files`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Upload-Length': String(file.size),
      'Upload-Metadata': metaParts.join(','),
      'Content-Type': 'application/offset+octet-stream',
    },
  });

  const location = res.headers.get('location') || '';
  const uploadId = location.split('/').pop() || '';
  if (!uploadId) throw new Error('No upload ID returned');
  return uploadId;
}

async function getUploadOffset(uploadId, token) {
  const res = await fetchWithRetry(`${API_BASE}/upload/files/${uploadId}`, {
    method: 'HEAD',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return parseInt(res.headers.get('upload-offset') || '0', 10);
}

async function uploadChunk(uploadId, chunk, offset, token) {
  const res = await fetchWithRetry(`${API_BASE}/upload/files/${uploadId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Upload-Offset': String(offset),
      'Content-Length': String(chunk.byteLength),
      'Content-Type': 'application/offset+octet-stream',
    },
    body: chunk,
  });
  return parseInt(res.headers.get('upload-offset') || '0', 10);
}

async function getUploadStatus(uploadId, token) {
  const res = await fetchWithRetry(`${API_BASE}/upload/files/${uploadId}/status`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return res.json();
}

async function cancelUpload(uploadId, token) {
  try {
    await fetch(`${API_BASE}/upload/files/${uploadId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
  } catch (e) {
    // ignore
  }
}

async function performUpload(uploadId, file, token) {
  const totalSize = file.size;
  const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);

  // Get server offset for resume
  let offset = 0;
  try {
    offset = await getUploadOffset(uploadId, token);
  } catch (e) {
    console.warn('[SW] Could not get offset, starting from 0');
  }

  const completedChunks = Math.floor(offset / CHUNK_SIZE);

  for (let i = completedChunks; i < totalChunks; i++) {
    const chunkOffset = i * CHUNK_SIZE;
    const end = Math.min(chunkOffset + CHUNK_SIZE, totalSize);
    const chunk = await file.slice(chunkOffset, end).arrayBuffer();

    offset = await uploadChunk(uploadId, chunk, chunkOffset, token);

    const progress = Math.min(100, Math.round((i + 1) / totalChunks * 100));
    postMessage('UPLOAD_PROGRESS', { uploadId, progress });
    await saveUpload({ uploadId, fileId: uploadId, status: 'uploading', progress, jobId: null, error: null });
  }

  // Poll assembly
  postMessage('UPLOAD_PROGRESS', { uploadId, progress: 99 });
  await saveUpload({ uploadId, fileId: uploadId, status: 'assembling', progress: 99, jobId: null, error: null });

  const startPoll = Date.now();
  while (Date.now() - startPoll < MAX_POLL_TIME) {
    const status = await getUploadStatus(uploadId, token);

    if (status.status === 'complete' && status.pipeline_job?.job_id) {
      postMessage('UPLOAD_COMPLETE', { uploadId, jobId: status.pipeline_job.job_id });
      await saveUpload({ uploadId, fileId: uploadId, status: 'complete', progress: 100, jobId: status.pipeline_job.job_id, error: null });
      return { jobId: status.pipeline_job.job_id };
    }

    if (status.status === 'failed') {
      throw new Error('Server assembly failed');
    }

    await sleep(POLL_INTERVAL);
  }

  throw new Error('Assembly timed out');
}

// Track active uploads
const activeUploads = new Map();

async function startUpload(fileId, token, metadata) {
  const fileRecord = await getFile(fileId);
  if (!fileRecord) throw new Error('File not found in IndexedDB');

  const uploadId = await createUpload(fileRecord.blob, token, metadata);
  await saveUpload({ uploadId, fileId, status: 'uploading', progress: 0, jobId: null, error: null });

  postMessage('UPLOAD_STARTED', { uploadId, filename: fileRecord.name });

  const controller = new AbortController();
  activeUploads.set(uploadId, controller);

  try {
    await performUpload(uploadId, fileRecord.blob, token);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    postMessage('UPLOAD_ERROR', { uploadId, error: msg });
    await saveUpload({ uploadId, fileId, status: 'failed', progress: 0, jobId: null, error: msg });
  } finally {
    activeUploads.delete(uploadId);
    // Cleanup file after some time
    setTimeout(() => deleteFile(fileId).catch(() => {}), 60000);
  }

  return uploadId;
}

async function cancelUploadById(uploadId, token) {
  const controller = activeUploads.get(uploadId);
  if (controller) {
    controller.abort();
  }
  await cancelUpload(uploadId, token);
  await saveUpload({ uploadId, fileId: uploadId, status: 'cancelled', progress: 0, jobId: null, error: null });
  postMessage('UPLOAD_CANCELLED', { uploadId });
}

// Service Worker lifecycle
self.addEventListener('install', (event) => {
  console.log('[SW] Install');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activate');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};

  switch (type) {
    case 'START_UPLOAD':
      startUpload(payload.fileId, payload.token, payload.metadata).catch(err => {
        console.error('[SW] Upload failed:', err);
        postMessage('UPLOAD_ERROR', { uploadId: payload.uploadId, error: err.message });
      });
      break;

    case 'CANCEL_UPLOAD':
      cancelUploadById(payload.uploadId, payload.token).catch(() => {});
      break;

    case 'GET_STATUS':
      getDb().then(async (db) => {
        const tx = db.transaction('uploads', 'readonly');
        const store = tx.objectStore('uploads');
        const req = store.getAll();
        req.onsuccess = () => {
          event.source?.postMessage({ type: 'UPLOADS_STATUS', payload: req.result });
        };
      });
      break;

    default:
      break;
  }
});

// Keep alive via fetch events (optional)
self.addEventListener('fetch', (event) => {
  // Let fetch pass through normally
});
