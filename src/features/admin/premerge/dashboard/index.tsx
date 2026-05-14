'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Layers,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { adminApi } from '../../admin-api';
import type { PremergeJobStatus, PremergeBatchDetail } from '../../types';

const POLL_INTERVAL_MS = 5000;

function formatDuration(startedAt: string | null | undefined, completedAt?: string | null): string {
  const start = startedAt ? new Date(startedAt).getTime() : null;
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  if (!start) return '-';
  const diff = Math.max(0, end - start);
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function statusBadge(status: string | null) {
  switch (status) {
    case 'RUNNING':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
          <Loader2 size={12} className="animate-spin" />
          Running
        </span>
      );
    case 'PENDING':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
          <Clock size={12} />
          Pending
        </span>
      );
    case 'COMPLETED':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
          <CheckCircle2 size={12} />
          Completed
        </span>
      );
    case 'COMPLETED_WITH_ERRORS':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-700">
          <AlertTriangle size={12} />
          Partial
        </span>
      );
    case 'FAILED':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
          <XCircle size={12} />
          Failed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
          <Pause size={12} />
          Idle
        </span>
      );
  }
}

function batchStatusIcon(status: string) {
  switch (status) {
    case 'RUNNING':
      return <Loader2 size={14} className="animate-spin text-blue-500" />;
    case 'COMPLETED':
      return <CheckCircle2 size={14} className="text-emerald-500" />;
    case 'FAILED':
      return <XCircle size={14} className="text-red-500" />;
    default:
      return <Clock size={14} className="text-gray-400" />;
  }
}

function BatchRow({ batch }: { batch: PremergeBatchDetail }) {
  const pairsCount = batch.pairs_count || batch.utterance_indices.length;
  const mergedCount = batch.merged_count || 0;
  const failedCount = batch.failed_count || 0;
  const batchProgress = pairsCount > 0 ? Math.round((mergedCount / pairsCount) * 100) : 0;
  const isRunning = batch.status === 'RUNNING';
  const isDone = batch.status === 'COMPLETED' || batch.status === 'FAILED';

  return (
    <div className="rounded-lg border border-gray-100 bg-white px-3 py-2.5 shadow-sm">
      <div className="flex items-center gap-2.5">
        <div className="shrink-0">{batchStatusIcon(batch.status)}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-800">{batch.segment_code}</span>
            {batch.total_batches > 1 && (
              <span className="text-[11px] text-gray-400">
                Batch {batch.batch_index + 1}/{batch.total_batches}
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-[11px] text-gray-500">
            <span>
              {mergedCount}/{pairsCount} pair{pairsCount !== 1 && 's'}
            </span>
            {failedCount > 0 && (
              <span className="text-red-500">{failedCount} failed</span>
            )}
            {batch.started_at && (
              <span className="text-gray-400">
                {formatDuration(batch.started_at, batch.completed_at)}
              </span>
            )}
          </div>
        </div>
        {batch.error && (
          <div className="shrink-0" title={batch.error}>
            <AlertCircle size={14} className="text-red-500" />
          </div>
        )}
      </div>
      {/* Mini progress bar for running/completed batches */}
      {(isRunning || isDone) && pairsCount > 0 && (
        <div className="mt-1.5">
          <div className="h-1 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                batch.status === 'COMPLETED'
                  ? 'bg-emerald-400'
                  : batch.status === 'FAILED'
                    ? 'bg-red-400'
                    : 'bg-blue-400'
              }`}
              style={{ width: `${batchProgress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function JobCard({ job }: { job: PremergeJobStatus }) {
  const isActive = job.premerge_status === 'RUNNING' || job.premerge_status === 'PENDING';
  const [expanded, setExpanded] = useState(isActive); // Auto-expand running jobs
  const queryClient = useQueryClient();

  const triggerMutation = useMutation({
    mutationFn: () => adminApi.triggerPremerge(job.job_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['premerge-queue'] });
    },
  });

  const total = job.premerge_total_pairs || 0;
  const completed = job.premerge_completed_pairs || 0;
  const failed = job.premerge_failed_pairs || 0;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  const batches = job.premerge_batches || [];
  const canRetrigger = job.premerge_status === 'FAILED' || job.premerge_status === 'COMPLETED_WITH_ERRORS';

  // Batch status counts
  const runningBatches = batches.filter((b) => b.status === 'RUNNING').length;
  const completedBatches = batches.filter((b) => b.status === 'COMPLETED').length;
  const pendingBatches = batches.filter((b) => b.status === 'PENDING').length;
  const failedBatches = batches.filter((b) => b.status === 'FAILED').length;

  return (
    <div
      className={`rounded-xl border bg-white shadow-sm transition-colors ${
        isActive ? 'border-blue-200 ring-1 ring-blue-100' : 'border-gray-200'
      }`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {job.original_filename ? (
                <span className="truncate text-sm font-semibold text-gray-900">
                  {job.original_filename}
                </span>
              ) : (
                <span className="truncate font-mono text-sm font-medium text-gray-900">
                  {job.job_id.slice(0, 8)}…
                </span>
              )}
              {statusBadge(job.premerge_status)}
            </div>
            <div className="mt-0.5 truncate font-mono text-[11px] text-gray-400">
              {job.job_id}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Play size={12} />
                {formatTime(job.premerge_started_at)}
              </span>
              {job.premerge_completed_at && (
                <span className="flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  {formatTime(job.premerge_completed_at)}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {formatDuration(job.premerge_started_at, job.premerge_completed_at)}
              </span>
              {/* Concurrent batch indicator */}
              {isActive && runningBatches > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                  <Loader2 size={10} className="animate-spin" />
                  {runningBatches} batch{runningBatches !== 1 && 'es'} active
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {canRetrigger && (
              <button
                onClick={() => triggerMutation.mutate()}
                disabled={triggerMutation.isPending}
                className="shrink-0 rounded-md p-1.5 text-amber-600 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-50"
                title="Re-trigger pre-merge"
              >
                {triggerMutation.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <RotateCcw size={16} />
                )}
              </button>
            )}
            <button
              onClick={() => setExpanded(!expanded)}
              className="shrink-0 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              title={expanded ? 'Collapse' : 'Expand batches'}
            >
              {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-gray-700">
              {completed} / {total} pairs
              {batches.length > 0 && (
                <span className="ml-2 font-normal text-gray-400">
                  ({completedBatches}✓ {runningBatches > 0 ? `${runningBatches}⟳ ` : ''}{pendingBatches > 0 ? `${pendingBatches}… ` : ''}{failedBatches > 0 ? `${failedBatches}✗` : ''} of {batches.length} batches)
                </span>
              )}
            </span>
            <span className="text-gray-500">{progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isActive ? 'bg-blue-500' :
                job.premerge_status === 'COMPLETED' ? 'bg-emerald-500' :
                job.premerge_status === 'FAILED' ? 'bg-red-400' : 'bg-orange-400'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          {failed > 0 && (
            <div className="mt-1 text-xs text-red-500">
              {failed} pair{failed !== 1 && 's'} failed
            </div>
          )}
          {job.premerge_error && (
            <div className="mt-2 rounded-md bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
              {job.premerge_error}
            </div>
          )}
        </div>
      </div>

      {/* Expandable batches */}
      {expanded && batches.length > 0 && (
        <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-3">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Batches ({batches.length})
          </h4>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {batches.map((batch, idx) => (
              <BatchRow key={`${batch.segment_id}-${idx}`} batch={batch} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function PremergeDashboardPage() {
  const {
    data,
    isLoading,
    isError,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ['premerge-queue'],
    queryFn: () => adminApi.getPremergeQueue(),
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: true,
    staleTime: 2000,
  });

  const jobs = data?.jobs || [];
  const runningCount = jobs.filter((j) => j.premerge_status === 'RUNNING').length;
  const pendingCount = jobs.filter((j) => j.premerge_status === 'PENDING').length;
  const completedCount = jobs.filter((j) => j.premerge_status === 'COMPLETED' || j.premerge_status === 'COMPLETED_WITH_ERRORS').length;
  const failedCount = jobs.filter((j) => j.premerge_status === 'FAILED').length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Layers size={28} className="text-blue-600" />
            Pre-merge Queue
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor utterance N+N+1 pre-merge batch processing across pipeline jobs
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            Updated: {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('id-ID') : '-'}
          </span>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
          <div className="flex items-center gap-2 text-blue-700">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm font-medium">Running</span>
          </div>
          <div className="mt-1 text-2xl font-bold text-blue-900">{runningCount}</div>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
          <div className="flex items-center gap-2 text-amber-700">
            <Clock size={18} />
            <span className="text-sm font-medium">Pending</span>
          </div>
          <div className="mt-1 text-2xl font-bold text-amber-900">{pendingCount}</div>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 size={18} />
            <span className="text-sm font-medium">Completed</span>
          </div>
          <div className="mt-1 text-2xl font-bold text-emerald-900">{completedCount}</div>
        </div>
        <div className="rounded-xl border border-red-100 bg-red-50/50 p-4">
          <div className="flex items-center gap-2 text-red-700">
            <XCircle size={18} />
            <span className="text-sm font-medium">Failed</span>
          </div>
          <div className="mt-1 text-2xl font-bold text-red-900">{failedCount}</div>
        </div>
      </div>

      {/* Error state */}
      {isError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-center text-red-700">
          <AlertCircle size={24} className="mx-auto mb-2" />
          <p className="font-medium">Failed to load pre-merge queue</p>
          <button
            onClick={() => refetch()}
            className="mt-2 text-sm underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && jobs.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 py-16 text-center">
          <Layers size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-lg font-medium text-gray-600">No pre-merge jobs found</p>
          <p className="mt-1 text-sm text-gray-400">
            Jobs will appear here when cropping (CV2) completes and pre-merge triggers
          </p>
        </div>
      )}

      {/* Job list */}
      <div className="space-y-3">
        {jobs.map((job) => (
          <JobCard key={job.job_id} job={job} />
        ))}
      </div>
    </div>
  );
}
