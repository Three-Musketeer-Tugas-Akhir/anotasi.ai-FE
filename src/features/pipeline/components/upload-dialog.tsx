'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload,
  X,
  FileVideo,
  CheckCircle2,
  AlertTriangle,
  Link2,
  Loader2,
} from 'lucide-react';
import { pipelineApi } from '../pipeline-api';
import type { SignLanguageCategory } from '../types';

// ── Constants ──────────────────────────────────────────────────────

const ACCEPTED_TYPES = ['video/mp4', 'video/avi', 'video/x-msvideo', 'video/x-matroska', 'video/quicktime'];
const ACCEPTED_EXTENSIONS = ['.mp4', '.avi', '.mkv', '.mov'];
const MAX_SIMPLE_UPLOAD = 200 * 1024 * 1024; // 200MB for simple upload

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJobCreated: () => void;
}

export function UploadDialog({ open, onOpenChange, onJobCreated }: UploadDialogProps) {
  const [activeTab, setActiveTab] = useState('file');
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState<SignLanguageCategory | ''>('');
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ── File Selection ──────────────────────────────────────────────

  const validateFile = (f: File): string | null => {
    const ext = '.' + f.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext) && !ACCEPTED_TYPES.includes(f.type)) {
      return `Format file tidak didukung. Gunakan: ${ACCEPTED_EXTENSIONS.join(', ')}`;
    }
    return null;
  };

  const handleFileSelect = (f: File) => {
    const error = validateFile(f);
    if (error) {
      setErrorMessage(error);
      return;
    }
    setFile(f);
    setErrorMessage('');
    setUploadState('idle');
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelect(f);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  // ── Upload ──────────────────────────────────────────────────────

  const handleUploadFile = async () => {
    if (!file) return;

    setUploadState('uploading');
    setUploadProgress(0);
    setErrorMessage('');

    try {
      // Use simple multipart upload (works for most files)
      await pipelineApi.uploadVideo(file, (percent) => {
        setUploadProgress(percent);
      });

      setUploadState('success');
      setUploadProgress(100);

      // Notify parent after brief delay
      setTimeout(() => {
        onJobCreated();
        resetDialog();
      }, 1500);
    } catch (err: unknown) {
      setUploadState('error');
      const msg =
        (err as { response?: { data?: { detail?: { error?: { message?: string } }; message?: string } } })
          ?.response?.data?.detail?.error?.message ||
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (err as Error)?.message ||
        'Upload gagal. Silakan coba lagi.';
      setErrorMessage(typeof msg === 'string' ? msg : 'Upload gagal. Silakan coba lagi.');
    }
  };

  const handleUploadUrl = async () => {
    if (!url.trim()) return;

    setUploadState('uploading');
    setUploadProgress(0);
    setErrorMessage('');

    try {
      await pipelineApi.createJobFromUrl({ video_url: url.trim() });

      setUploadState('success');
      setUploadProgress(100);

      setTimeout(() => {
        onJobCreated();
        resetDialog();
      }, 1500);
    } catch (err: unknown) {
      setUploadState('error');
      const msg =
        (err as { response?: { data?: { detail?: { error?: { message?: string } }; message?: string } } })
          ?.response?.data?.detail?.error?.message ||
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (err as Error)?.message ||
        'Gagal memproses URL video.';
      setErrorMessage(typeof msg === 'string' ? msg : 'Gagal memproses URL video.');
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    resetDialog();
  };

  const resetDialog = () => {
    setFile(null);
    setUrl('');
    setCategory('');
    setUploadState('idle');
    setUploadProgress(0);
    setErrorMessage('');
    setActiveTab('file');
    onOpenChange(false);
  };

  // ── Format Helpers ──────────────────────────────────────────────

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  // ── Render ──────────────────────────────────────────────────────

  const isUploading = uploadState === 'uploading';
  const isSuccess = uploadState === 'success';

  return (
    <Dialog open={open} onOpenChange={(v) => !isUploading && onOpenChange(v)}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Upload size={20} className="text-teal-600" />
            Upload Video Baru
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="file" disabled={isUploading}>
              <FileVideo size={14} className="mr-1.5" />
              File Upload
            </TabsTrigger>
            <TabsTrigger value="url" disabled={isUploading}>
              <Link2 size={14} className="mr-1.5" />
              URL Video
            </TabsTrigger>
          </TabsList>

          {/* ── File Upload Tab ── */}
          <TabsContent value="file" className="mt-4 space-y-4">
            {!file ? (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  isDragOver
                    ? 'border-teal-400 bg-teal-50'
                    : 'border-gray-300 hover:border-teal-400 hover:bg-gray-50'
                }`}
              >
                <div className="w-14 h-14 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-3">
                  <Upload size={24} className="text-teal-600" />
                </div>
                <p className="text-sm font-medium text-gray-700">
                  Drag & drop file video di sini
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  atau klik untuk memilih file
                </p>
                <p className="text-[10px] text-gray-300 mt-2">
                  Format: MP4, AVI, MKV, MOV • Maks 10GB
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_EXTENSIONS.join(',')}
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                    <FileVideo size={20} className="text-teal-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                    <p className="text-xs text-gray-400">{formatSize(file.size)}</p>
                  </div>
                  {!isUploading && !isSuccess && (
                    <button
                      onClick={() => {
                        setFile(null);
                        setErrorMessage('');
                      }}
                      className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {/* Upload Progress */}
                {(isUploading || isSuccess) && (
                  <div className="mt-3">
                    <Progress value={uploadProgress} className="h-2" />
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-xs text-gray-500">
                        {isSuccess ? (
                          <span className="text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 size={12} /> Upload berhasil!
                          </span>
                        ) : (
                          'Mengupload video...'
                        )}
                      </span>
                      <span className="text-xs font-mono text-gray-400">{uploadProgress}%</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Upload Button */}
            {file && !isUploading && !isSuccess && (
              <Button
                onClick={handleUploadFile}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white"
              >
                <Upload size={14} className="mr-1.5" />
                Upload & Mulai Processing
              </Button>
            )}
          </TabsContent>

          {/* ── URL Tab ── */}
          <TabsContent value="url" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="video-url" className="text-sm text-gray-700">
                URL Video (publik)
              </Label>
              <Input
                id="video-url"
                type="url"
                placeholder="https://example.com/video.mp4"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isUploading}
              />
              <p className="text-[10px] text-gray-400">
                Masukkan URL publik ke file video. Server akan mengunduh dan memproses video.
              </p>
            </div>

            {/* Upload Progress */}
            {(isUploading || isSuccess) && (
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  {isSuccess ? (
                    <CheckCircle2 size={14} className="text-emerald-600" />
                  ) : (
                    <Loader2 size={14} className="text-teal-600 animate-spin" />
                  )}
                  <span className="text-sm text-gray-700">
                    {isSuccess ? 'Job berhasil dibuat!' : 'Membuat job dari URL...'}
                  </span>
                </div>
              </div>
            )}

            {url.trim() && !isUploading && !isSuccess && (
              <Button
                onClick={handleUploadUrl}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white"
              >
                <Link2 size={14} className="mr-1.5" />
                Proses dari URL
              </Button>
            )}
          </TabsContent>
        </Tabs>

        {/* Error */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 mt-2">
            <AlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">{errorMessage}</p>
          </div>
        )}

        {/* Cancel Button */}
        {isUploading && (
          <div className="flex justify-end mt-2">
            <Button variant="outline" size="sm" onClick={handleCancel}>
              <X size={14} className="mr-1" /> Batalkan
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
