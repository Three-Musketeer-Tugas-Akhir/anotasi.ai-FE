'use client';

import { useState } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { apiClient } from '@/core/api/axios-client';
import { ApiResponse } from '@/core/types/api';
import { Video } from '@/features/classification/types/classification.types';

interface VideoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (video: Video) => void;
}

export function VideoUploadModal({ isOpen, onClose, onUploadSuccess }: VideoUploadModalProps) {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !file) {
      setError('Title and video file are required.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('video', file);

      const { data } = await apiClient.post<ApiResponse<Video>>('/videos/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      onUploadSuccess(data.data);
      onClose();
      setTitle('');
      setFile(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'An error occurred during upload.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden relative">
        <div className="flex justify-between items-center p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Upload size={18} className="text-teal-600" /> Upload Video Baru
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors"
            disabled={isUploading}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleUpload} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Judul Video</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Berita TVRI 12 Maret"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
              disabled={isUploading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">File Video</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-teal-400 transition-colors bg-gray-50">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600 justify-center">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-teal-600 hover:text-teal-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-teal-500 px-2 py-1 border border-teal-100"
                  >
                    <span>Pilih file</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      accept="video/mp4,video/webm"
                      className="sr-only"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      disabled={isUploading}
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500">MP4, WebM up to 500MB</p>
                {file && (
                  <p className="text-sm font-medium text-teal-700 mt-2 truncate max-w-[200px] mx-auto">
                    {file.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isUploading || !title || !file}
              className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isUploading && <Loader2 size={16} className="animate-spin" />}
              {isUploading ? 'Mengunggah...' : 'Unggah Video'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
