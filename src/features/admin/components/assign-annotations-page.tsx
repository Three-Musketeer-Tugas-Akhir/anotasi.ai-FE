import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAnnotationsApi } from '../api/admin-annotations-api';
import { classificationRepository } from '@/features/classification/api/classification.repository';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserCheck, Video, CheckCircle2, Users, LayoutDashboard } from 'lucide-react';

export function AssignAnnotationsPage() {
  const queryClient = useQueryClient();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedAnnotatorId, setSelectedAnnotatorId] = useState<string | null>(null);

  // Queries
  const { data: jobsResponse, isLoading: isLoadingJobs } = useQuery({
    queryKey: ['admin', 'jobs', 'ready_for_annotation'],
    queryFn: () => classificationRepository.getJobs({ status: 'READY_FOR_ANNOTATION', limit: 50 }),
  });

  const { data: queueStatus, isLoading: isLoadingQueueStatus } = useQuery({
    queryKey: ['admin', 'queue-status'],
    queryFn: adminAnnotationsApi.getQueueStatus,
  });

  const { data: usersResponse, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['admin', 'users', 'annotators'],
    queryFn: adminAnnotationsApi.getAnnotators,
  });

  // Mutations
  const assignMutation = useMutation({
    mutationFn: ({ jobId, annotatorId }: { jobId: string; annotatorId: string }) =>
      adminAnnotationsApi.assignJob({ job_id: jobId, annotator_id: annotatorId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'jobs'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'queue-status'] });
      setSelectedJobId(null);
      setSelectedAnnotatorId(null);
    },
  });

  const jobs = jobsResponse?.jobs || [];
  const annotators = usersResponse?.items || [];

  const handleAssign = () => {
    if (selectedJobId && selectedAnnotatorId) {
      assignMutation.mutate({ jobId: selectedJobId, annotatorId: selectedAnnotatorId });
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <LayoutDashboard className="text-teal-600" />
          Distribusi Tugas JBI
        </h1>
        <p className="text-sm text-gray-500">
          Tugaskan Job (video) yang telah selesai proses Anotasi Suara ke Annotator JBI.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Jobs List */}
        <Card className="lg:col-span-2 shadow-sm border-gray-200">
          <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Video className="w-5 h-5 text-teal-500" />
              Job Siap Dialokasikan
            </CardTitle>
            <CardDescription>Pilih job dengan status READY_FOR_ANNOTATION</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingJobs ? (
              <div className="flex justify-center p-8">
                <Loader2 className="animate-spin text-gray-400" />
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center p-8 text-gray-500 text-sm">
                <CheckCircle2 className="w-10 h-10 text-emerald-300 mx-auto mb-2" />
                Semua job sudah dialokasikan!
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                {jobs.map((job: any) => (
                  <div
                    key={job.job_id}
                    onClick={() => setSelectedJobId(job.job_id)}
                    className={`p-4 cursor-pointer transition-colors ${
                      selectedJobId === job.job_id
                        ? 'bg-teal-50 border-l-4 border-teal-500'
                        : 'hover:bg-gray-50 border-l-4 border-transparent'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-sm text-gray-900 truncate max-w-sm">
                          {job.video_title || 'Unknown Video'}
                        </div>
                        <div className="text-xs text-gray-500 font-mono mt-1">ID: {job.job_id.slice(0,8)}...</div>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-teal-50 text-teal-700">
                        {job.status}
                      </Badge>
                    </div>
                    <div className="flex gap-4 mt-3 text-xs text-gray-600">
                      <div>
                        {job.progress ? (
                          <span className="font-semibold">{job.progress.percent}%</span>
                        ) : (
                          <span className="font-semibold">-</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column: Assign & Status */}
        <div className="space-y-6">
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="bg-teal-50/50 border-b border-teal-100 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-teal-600" />
                Penugasan
              </CardTitle>
              <CardDescription>Pilih annotator untuk job yang ditandai</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {!selectedJobId ? (
                <div className="text-center p-4 text-sm text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  Pilih Job di sebelah kiri terlebih dahulu
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                      Pilih Annotator
                    </label>
                    {isLoadingUsers ? (
                      <Loader2 className="animate-spin w-4 h-4" />
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                        {annotators.map((user) => (
                          <div
                            key={user.id}
                            onClick={() => setSelectedAnnotatorId(user.id)}
                            className={`p-2 rounded-md border text-sm cursor-pointer transition-all ${
                              selectedAnnotatorId === user.id
                                ? 'bg-teal-600 text-white border-teal-600 font-medium shadow-md'
                                : 'bg-white text-gray-700 border-gray-200 hover:border-teal-300 hover:bg-teal-50'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="truncate">{user.email}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                    disabled={!selectedAnnotatorId || assignMutation.isPending}
                    onClick={handleAssign}
                  >
                    {assignMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sedang Menugaskan...
                      </>
                    ) : (
                      'Tugaskan Job'
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Queue Status Dashboard */}
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-gray-700">
                <Users className="w-4 h-4" />
                Beban Kerja Saat Ini
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingQueueStatus ? (
                <div className="p-4 text-center">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400 mx-auto" />
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {queueStatus?.by_annotator.map((stat, idx) => (
                    <div key={idx} className="p-3 flex justify-between items-center text-xs">
                      <span className="text-gray-600 truncate max-w-[150px]" title={stat.annotator_email}>
                        {stat.annotator_email.split('@')[0]}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[9px] bg-gray-100 text-gray-600">
                          {stat.status}
                        </Badge>
                        <span className="font-mono font-bold text-gray-700 w-6 text-right">
                          {stat.count}
                        </span>
                      </div>
                    </div>
                  ))}
                  {(!queueStatus?.by_annotator || queueStatus.by_annotator.length === 0) && (
                    <div className="p-4 text-xs text-center text-gray-400">
                      Belum ada penugasan aktif
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
