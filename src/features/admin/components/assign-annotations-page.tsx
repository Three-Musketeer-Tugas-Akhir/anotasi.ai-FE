import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAnnotationsApi } from '../api/admin-annotations-api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Loader2,
  UserCheck,
  Video,
  CheckCircle2,
  PlayCircle,
  Search,
  FileText,
  Clock,
  AlertCircle,
  ArrowRight,
  Check,
  AlertTriangle,
  UserX,
  RefreshCw,
  ChevronLeft,
} from 'lucide-react';

// ── Helper ──────────────────────────────────────────────────────────

function getInitials(email: string): string {
  const name = email.split('@')[0];
  const parts = name.split(/[._-]/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// ── Component ──────────────────────────────────────────────────────

export function AssignAnnotationsPage() {
  const queryClient = useQueryClient();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedAnnotatorId, setSelectedAnnotatorId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // ── Queries ──
  const { data: assignmentsResponse, isLoading: isLoadingJobs } = useQuery({
    queryKey: ['admin', 'job-assignments'],
    queryFn: () => adminAnnotationsApi.getJobAssignments(),
  });

  const { data: queueStatus, isLoading: isLoadingQueueStatus } = useQuery({
    queryKey: ['admin', 'queue-status'],
    queryFn: adminAnnotationsApi.getQueueStatus,
  });

  const { data: usersResponse, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['admin', 'users', 'annotators'],
    queryFn: adminAnnotationsApi.getAnnotators,
  });

  // ── Mutations ──
  const assignMutation = useMutation({
    mutationFn: ({ jobId, annotatorId }: { jobId: string; annotatorId: string }) =>
      adminAnnotationsApi.assignJob({ job_id: jobId, annotator_id: annotatorId }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'job-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'queue-status'] });
      setSelectedJobId(null);
      setSelectedAnnotatorId(null);
      toast.success('Penugasan berhasil', {
        description: data.message,
        position: 'top-center',
      });
    },
    onError: (err: any) => {
      toast.error('Penugasan gagal', {
        description: err?.response?.data?.detail || 'Terjadi kesalahan saat menugaskan job.',
        position: 'top-center',
      });
    },
  });

  const reassignMutation = useMutation({
    mutationFn: ({ jobId, annotatorId }: { jobId: string; annotatorId: string }) =>
      adminAnnotationsApi.reassignJob({ job_id: jobId, annotator_id: annotatorId }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'job-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'queue-status'] });
      setSelectedJobId(null);
      setSelectedAnnotatorId(null);
      toast.success('Penggantian Annotator berhasil', {
        description: data.message,
        position: 'top-center',
      });
    },
    onError: (err: any) => {
      toast.error('Penggantian gagal', {
        description: err?.response?.data?.detail || 'Terjadi kesalahan saat mengganti Annotator.',
        position: 'top-center',
      });
    },
  });

  const jobs = assignmentsResponse?.items || [];
  const annotators = usersResponse?.items || [];

  const filteredJobs = useMemo(() =>
    jobs.filter((job: any) =>
      (job.original_filename || '').toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [jobs, searchQuery]
  );

  const selectedJob = jobs.find((j: any) => j.job_id === selectedJobId);
  const isReassigning = selectedJob?.assignment_status === 'assigned';

  const handleAssign = () => {
    if (!selectedJobId || !selectedAnnotatorId) return;

    if (isReassigning) {
      reassignMutation.mutate({ jobId: selectedJobId, annotatorId: selectedAnnotatorId });
    } else {
      assignMutation.mutate({ jobId: selectedJobId, annotatorId: selectedAnnotatorId });
    }
  };

  const isMutating = assignMutation.isPending || reassignMutation.isPending;

  // Build job count per annotator from queueStatus
  const jobCountByEmail = useMemo(() => {
    const map: Record<string, number> = {};
    if (queueStatus?.by_annotator) {
      queueStatus.by_annotator.forEach((stat: any) => {
        map[stat.annotator_email] = (map[stat.annotator_email] || 0) + (stat.count || 0);
      });
    }
    return map;
  }, [queueStatus]);

  // Stats
  const assignedCount = jobs.filter((j: any) => j.assignment_status === 'assigned').length;
  const unassignedCount = jobs.filter((j: any) => j.assignment_status === 'unassigned').length;

  return (
    <div className="p-6 max-w-[1400px] mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-teal-600/10 rounded-xl">
              <UserCheck className="w-6 h-6 text-teal-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Distribusi Tugas JBI</h1>
          </div>
          <p className="text-slate-500 text-sm max-w-2xl leading-relaxed">
            Pilih video yang telah siap, lalu tugaskan kepada annotator JBI. Job yang sudah ditugaskan dapat diganti Annotatornya kapan saja.
          </p>
        </div>

        {/* Compact Stats */}
        <div className="flex bg-white border border-slate-200 rounded-xl shadow-sm divide-x divide-slate-100 overflow-hidden flex-shrink-0">
          <div className="px-5 py-3 text-center">
            <p className="text-lg font-bold text-slate-900 leading-none">{jobs.length}</p>
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mt-1">Total Job</p>
          </div>
          <div className="px-5 py-3 text-center">
            <p className="text-lg font-bold text-emerald-600 leading-none">{assignedCount}</p>
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mt-1">Sudah Ditugaskan</p>
          </div>
          <div className="px-5 py-3 text-center">
            <p className="text-lg font-bold text-amber-600 leading-none">{unassignedCount}</p>
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mt-1">Belum Ditugaskan</p>
          </div>
          <div className="px-5 py-3 text-center">
            <p className="text-lg font-bold text-teal-600 leading-none">{annotators.length}</p>
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mt-1">Annotator</p>
          </div>
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* ── LEFT: Job List (7 cols) ── */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
              1. Pilih Job Target
            </h2>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari judul video..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 w-64 transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 320px)', minHeight: '480px' }}>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50/50 custom-scrollbar">
              {isLoadingJobs ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
                  <p className="text-sm font-medium">Memuat daftar job...</p>
                </div>
              ) : filteredJobs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-3 p-8">
                  <div className="w-16 h-16 bg-white border border-slate-100 rounded-full flex items-center justify-center mb-2 shadow-sm">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  </div>
                  <p className="font-semibold text-slate-900 text-lg">
                    {searchQuery ? 'Tidak ada hasil' : 'Semua Job Selesai!'}
                  </p>
                  <p className="text-sm text-center max-w-sm">
                    {searchQuery
                      ? 'Coba ubah kata kunci pencarian.'
                      : 'Tidak ada job yang menunggu untuk dialokasikan saat ini.'}
                  </p>
                </div>
              ) : (
                filteredJobs.map((job: any) => {
                  const isSelected = selectedJobId === job.job_id;
                  const isAssigned = job.assignment_status === 'assigned';
                  const isPartial = job.assignment_status === 'partial';

                  return (
                    <div
                      key={job.job_id}
                      onClick={() => setSelectedJobId(job.job_id)}
                      className={`group relative p-4 rounded-xl cursor-pointer transition-all duration-200 border bg-white
                        ${isSelected
                          ? 'border-teal-500 shadow-[0_0_0_1px_rgba(20,184,166,1)] ring-4 ring-teal-50'
                          : 'border-slate-200 hover:border-teal-300 hover:shadow-md'
                        }`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-colors
                          ${isSelected
                            ? 'bg-teal-100 text-teal-600'
                            : 'bg-slate-100 text-slate-400 group-hover:bg-teal-50 group-hover:text-teal-500'
                          }`}>
                          <PlayCircle className="w-5 h-5" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-semibold text-sm truncate mb-1.5 transition-colors
                            ${isSelected ? 'text-teal-900' : 'text-slate-900 group-hover:text-teal-700'}`}>
                            {job.original_filename || 'Unknown Video'}
                          </h3>
                          <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium flex-wrap">
                            <span className="flex items-center gap-1.5 bg-slate-100 px-2 py-0.5 rounded-md font-mono">
                              <FileText className="w-3 h-3" /> {job.job_id.slice(0, 8)}...
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3 h-3" /> {job.total_segments} segmen
                            </span>
                            {/* Assignment status indicator */}
                            {isAssigned ? (
                              <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                                <CheckCircle2 className="w-3 h-3" />
                                {job.assigned_to_email || 'Ditugaskan'}
                              </span>
                            ) : isPartial ? (
                              <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                                <AlertTriangle className="w-3 h-3" />
                                Sebagian ditugaskan
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                                <UserX className="w-3 h-3" />
                                Perlu ditugaskan
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Selection indicator */}
                        <div className="shrink-0">
                          {isSelected ? (
                            <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center text-white shadow-sm">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                          ) : (
                            <div className="w-6 h-6 border-2 border-slate-200 rounded-full group-hover:border-teal-300 transition-colors" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Assignment Hub (5 cols, sticky) ── */}
        <div className="lg:col-span-5 flex flex-col space-y-4 sticky top-6">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
            2. Pilih Annotator & Tugaskan
          </h2>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden flex flex-col">

            {/* Selected Job Context */}
            <div className={`p-4 border-b transition-colors duration-300 ${selectedJob ? 'bg-teal-50/50 border-teal-100' : 'bg-slate-50 border-slate-100'}`}>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Job Terpilih</p>
              {selectedJob ? (
                <div className="flex items-start gap-3">
                  <Video className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 line-clamp-2 leading-tight">
                      {(selectedJob as any).original_filename || 'Unknown Video'}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <p className="text-xs text-slate-400 font-mono">
                        {(selectedJob as any).job_id}
                      </p>
                      {(selectedJob as any).assignment_status === 'assigned' ? (
                        <span className="text-[10px] flex items-center gap-1 text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3" />
                          {(selectedJob as any).assigned_to_email}
                        </span>
                      ) : (
                        <span className="text-[10px] flex items-center gap-1 text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                          <UserX className="w-3 h-3" />
                          Perlu ditugaskan
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-400 text-sm py-1">
                  <AlertCircle className="w-4 h-4" />
                  Belum ada job yang dipilih
                </div>
              )}
            </div>

            {/* Annotator List with inline workload */}
            <div className="p-4 flex-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Pilih Annotator</p>

              {isLoadingUsers || isLoadingQueueStatus ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
                </div>
              ) : (
                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
                  {annotators.map((user: any) => {
                    const isSelected = selectedAnnotatorId === user.id;
                    const jobCount = jobCountByEmail[user.email] ?? 0;

                    return (
                      <div
                        key={user.id}
                        onClick={() => setSelectedAnnotatorId(user.id)}
                        className={`group flex items-center p-3 rounded-xl cursor-pointer transition-all border
                          ${isSelected
                            ? 'bg-slate-900 border-slate-900 shadow-md'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                      >
                        {/* Avatar */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors
                          ${isSelected ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'}`}>
                          {getInitials(user.email)}
                        </div>

                        {/* Info */}
                        <div className="ml-3 flex-1 min-w-0">
                          <p className={`text-sm font-semibold truncate transition-colors ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                            {user.name || user.email.split('@')[0]}
                          </p>
                          <p className={`text-[11px] truncate transition-colors ${isSelected ? 'text-slate-400' : 'text-slate-500'}`}>
                            {user.email}
                          </p>
                        </div>

                        {/* Job Count Badge */}
                        <div className="shrink-0 ml-2 flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md
                            ${isSelected
                              ? 'bg-slate-700 text-slate-300'
                              : 'bg-slate-100 text-slate-600'
                            }`}>
                            {jobCount} job
                          </span>
                          {isSelected && <Check className="w-4 h-4 text-teal-400" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Action Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100">
              <Button
                onClick={handleAssign}
                disabled={!selectedJobId || !selectedAnnotatorId || isMutating}
                className={`w-full py-3.5 h-auto font-bold text-sm flex justify-center items-center gap-2 transition-all duration-300 rounded-xl
                  ${(!selectedJobId || !selectedAnnotatorId)
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed hover:bg-slate-200'
                    : isMutating
                      ? 'bg-teal-700 text-white cursor-wait'
                      : isReassigning
                        ? 'bg-amber-600 text-white hover:bg-amber-700 hover:shadow-lg hover:shadow-amber-600/20 active:scale-[0.98]'
                        : 'bg-teal-600 text-white hover:bg-teal-700 hover:shadow-lg hover:shadow-teal-600/20 active:scale-[0.98]'
                  }`}
              >
                {isMutating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Memproses...
                  </>
                ) : isReassigning ? (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Ganti Annotator
                  </>
                ) : (
                  <>
                    Tugaskan Job Sekarang
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>

              <p className="text-center text-[11px] text-slate-400 mt-3 font-medium">
                {!selectedJobId
                  ? 'Pilih job target di panel sebelah kiri'
                  : !selectedAnnotatorId
                    ? isReassigning
                      ? 'Pilih annotator pengganti'
                      : 'Pilih annotator untuk menugaskan job ini'
                    : isReassigning
                      ? 'Siap mengganti Annotator. Pekerjaan sebelumnya tetap tersimpan.'
                      : 'Siap ditugaskan. Tindakan ini tidak bisa dibatalkan.'}
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Custom scrollbar style */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .custom-scrollbar::-webkit-scrollbar { width: 5px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
          .custom-scrollbar:hover::-webkit-scrollbar-thumb { background-color: #94a3b8; }
        `
      }} />
    </div>
  );
}
