/**
 * IndexedDB wrapper for storing upload files and state.
 * Used by the Service Worker to resume uploads after page refresh.
 */

const DB_NAME = 'anotasi-uploads-db';
const DB_VERSION = 1;

interface StoredFile {
  id: string;
  blob: Blob;
  name: string;
  type: string;
  size: number;
  category?: string;
  dataset_id?: string;
  createdAt: number;
}

interface UploadRecord {
  uploadId: string;
  fileId: string;
  status: 'pending' | 'uploading' | 'assembling' | 'complete' | 'failed' | 'cancelled';
  progress: number;
  jobId: string | null;
  error: string | null;
  updatedAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('uploads')) {
        db.createObjectStore('uploads', { keyPath: 'uploadId' });
      }
    };
  });
  return dbPromise;
}

export const uploadDb = {
  async storeFile(file: File, id: string, meta?: { category?: string; dataset_id?: string }): Promise<void> {
    const db = await getDb();
    const tx = db.transaction('files', 'readwrite');
    const store = tx.objectStore('files');
    const record: StoredFile = {
      id,
      blob: file,
      name: file.name,
      type: file.type,
      size: file.size,
      category: meta?.category,
      dataset_id: meta?.dataset_id,
      createdAt: Date.now(),
    };
    return new Promise((resolve, reject) => {
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  async getFile(id: string): Promise<StoredFile | undefined> {
    const db = await getDb();
    const tx = db.transaction('files', 'readonly');
    const store = tx.objectStore('files');
    return new Promise((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async deleteFile(id: string): Promise<void> {
    const db = await getDb();
    const tx = db.transaction('files', 'readwrite');
    const store = tx.objectStore('files');
    return new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  async saveUpload(record: UploadRecord): Promise<void> {
    const db = await getDb();
    const tx = db.transaction('uploads', 'readwrite');
    const store = tx.objectStore('uploads');
    return new Promise((resolve, reject) => {
      const req = store.put({ ...record, updatedAt: Date.now() });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  async getUpload(uploadId: string): Promise<UploadRecord | undefined> {
    const db = await getDb();
    const tx = db.transaction('uploads', 'readonly');
    const store = tx.objectStore('uploads');
    return new Promise((resolve, reject) => {
      const req = store.get(uploadId);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async getAllUploads(): Promise<UploadRecord[]> {
    const db = await getDb();
    const tx = db.transaction('uploads', 'readonly');
    const store = tx.objectStore('uploads');
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  async deleteUpload(uploadId: string): Promise<void> {
    const db = await getDb();
    const tx = db.transaction('uploads', 'readwrite');
    const store = tx.objectStore('uploads');
    return new Promise((resolve, reject) => {
      const req = store.delete(uploadId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  async cleanupOldFiles(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<void> {
    const db = await getDb();
    const tx = db.transaction(['files', 'uploads'], 'readwrite');
    const fileStore = tx.objectStore('files');
    const uploadStore = tx.objectStore('uploads');
    const cutoff = Date.now() - maxAgeMs;

    const files: StoredFile[] = await new Promise((resolve, reject) => {
      const req = fileStore.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    for (const f of files) {
      if (f.createdAt < cutoff) {
        fileStore.delete(f.id);
        // Also delete associated upload records
        const uploads: UploadRecord[] = await new Promise((resolve, reject) => {
          const req = uploadStore.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => reject(req.error);
        });
        for (const u of uploads) {
          if (u.fileId === f.id) {
            uploadStore.delete(u.uploadId);
          }
        }
      }
    }
  },
};
