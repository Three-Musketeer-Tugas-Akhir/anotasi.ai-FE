'use client';

import { useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatasetExplorer } from './dataset-explorer';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  Package,
  Download,
  Loader2,
  Calendar,
  Filter,
  FileArchive,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  FolderOpen,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/axios-client';
import { pipelineApi } from '@/features/pipeline/pipeline-api';
import { env } from '@/core/config/env';

// ── Types ──────────────────────────────────────────────────────────

interface ExportableJob {
  id: string;
  original_filename?: string;
  status: string;
  category: string | null;
  curation_status: string | null;
  total_segments: number;
  created_at: string | null;
  updated_at: string | null;
}

interface JobListResponse {
  items: ExportableJob[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ── Helpers ────────────────────────────────────────────────────────

const DOWNLOADABLE_STATUSES = new Set([
  'PENDING',
  'ANNOTATED',
  'READY_TO_BE_NORMALIZED',
  'NORMALIZED',
  'READY_TO_EXPORT',
]);

function getCurationBadge(status: string | null): { label: string; className: string } {
  switch (status) {
    case 'PENDING':
      return { label: 'Sedang Dianotasi', className: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'ANNOTATED':
      return { label: 'Selesai Dianotasi', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    case 'READY_TO_BE_NORMALIZED':
      return { label: 'Siap Normalisasi', className: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'NORMALIZED':
      return { label: 'Ternormalisasi', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'READY_TO_EXPORT':
      return { label: 'Siap Export', className: 'bg-teal-50 text-teal-700 border-teal-200' };
    default:
      return { label: status || 'Belum Siap', className: 'bg-gray-50 text-gray-500 border-gray-200' };
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// ── Component ──────────────────────────────────────────────────────

export function ExportPage() {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [exploreJobId, setExploreJobId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Fetch all jobs that are eligible for dataset download
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['export-jobs', dateFrom, dateTo],
    queryFn: async () => {
      const response = await apiClient.get<JobListResponse>('/pipeline/jobs', {
        params: {
          page: 1,
          page_size: 100,
          status: 'READY_FOR_ANNOTATION',
          from_date: dateFrom || undefined,
          to_date: dateTo || undefined,
        },
      });
      return response.data;
    },
  });

  const jobs = data?.items ?? [];

  // Show all jobs that are READY_FOR_ANNOTATION — filter by downloadable curation_status only for ZIP download button
  const downloadableJobs = jobs;

  // Stats
  const totalDownloadable = downloadableJobs.length;
  const normalizedCount = downloadableJobs.filter((j) => j.curation_status === 'NORMALIZED' || j.curation_status === 'READY_TO_EXPORT').length;

  // Download handler using streamed blob
  const handleDownload = useCallback(async (jobId: string) => {
    setDownloadingId(jobId);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      const response = await fetch(`${env.API_URL}/pipeline/jobs/${jobId}/dataset/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) {
        throw new Error('Download gagal');
      }
      const blob = await response.blob();
      const contentDisposition = response.headers.get('content-disposition');
      const filenameMatch = contentDisposition?.match(/filename="?(.+?)"?$/);
      const filename = filenameMatch?.[1] || `dataset_${jobId.slice(0, 8)}.zip`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloadingId(null);
    }
  }, []);

  if (exploreJobId) {
    return <DatasetExplorer jobId={exploreJobId} onBack={() => setExploreJobId(null)} />;
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package size={24} className="text-teal-600" />
            Dataset Export
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Download dataset ZIP yang berisi video, audio WAV, dan transkrip dari pipeline yang sudah selesai.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs">
          <RefreshCw size={14} className="mr-1" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Filter size={16} /> Filter Dataset
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                <Calendar size={12} /> Dari Tanggal
              </label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                <Calendar size={12} /> Sampai Tanggal
              </label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{totalDownloadable}</p>
            <p className="text-xs text-gray-500 mt-0.5">Dapat Didownload</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-emerald-700">{normalizedCount}</p>
            <p className="text-xs text-gray-500 mt-0.5">Sudah Normalisasi</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-gray-900">ZIP</p>
            <p className="text-xs text-gray-500 mt-0.5">Format Download</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-800">
            Dataset yang Tersedia
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="text-teal-600 animate-spin" />
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <AlertTriangle size={24} className="text-red-400 mx-auto mb-2" />
              <p className="text-sm text-red-600">Gagal memuat data</p>
            </div>
          ) : downloadableJobs.length === 0 ? (
            <div className="p-12 text-center">
              <FileArchive size={40} className="text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500">Belum ada dataset yang siap didownload</p>
              <p className="text-xs text-gray-400 mt-1">
                Dataset tersedia setelah kurator melakukan approve dan/atau normalisasi.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50">
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>Nama File</TableHead>
                  <TableHead className="w-28 text-center">Segmen</TableHead>
                  <TableHead className="w-28 text-center">Kategori</TableHead>
                  <TableHead className="w-36 text-center">Status Kurasi</TableHead>
                  <TableHead className="w-28 text-center">Tanggal</TableHead>
                  <TableHead className="w-32 text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {downloadableJobs.map((job, i) => {
                  const badge = getCurationBadge(job.curation_status);
                  const isDownloading = downloadingId === job.id;

                  return (
                    <TableRow key={job.id}>
                      <TableCell className="text-center text-gray-400 text-xs">{i + 1}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm text-gray-800">
                            {job.original_filename || 'Unknown File'}
                          </span>
                          <span className="font-mono text-[10px] text-gray-400">
                            ID: {job.id.slice(0, 8)}...
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-xs font-mono">
                          {job.total_segments}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {job.category ? (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            {job.category}
                          </Badge>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={`text-[10px] ${badge.className}`}>
                          {badge.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-xs text-gray-500">
                        {formatDate(job.created_at)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs text-teal-700 border-teal-200 hover:bg-teal-50"
                            onClick={() => setExploreJobId(job.id)}
                          >
                            <FolderOpen size={12} className="mr-1" /> Explorer
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 bg-teal-600 hover:bg-teal-700 text-white text-xs disabled:opacity-40"
                            disabled={isDownloading || !job.curation_status || !DOWNLOADABLE_STATUSES.has(job.curation_status)}
                            onClick={() => handleDownload(job.id)}
                            title={!job.curation_status || !DOWNLOADABLE_STATUSES.has(job.curation_status) ? 'Belum siap untuk diunduh' : 'Download seluruh Job (semua segmen)'}
                          >
                            {isDownloading ? (
                              <>
                                <Loader2 size={12} className="mr-1 animate-spin" /> Downloading...
                              </>
                            ) : (
                              <>
                                <Download size={12} className="mr-1" /> ZIP
                              </>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
