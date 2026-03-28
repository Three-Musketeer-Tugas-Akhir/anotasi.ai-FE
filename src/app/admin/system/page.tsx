'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/shared/components/layout/app-layout';
import { adminApi } from '@/features/admin';
import type {
  SystemConfigResponse,
  SystemMetricsResponse,
  FailedJobItem,
  ASRConfidenceStatsResponse,
} from '@/features/admin';
import { useAuth } from '@/features/auth';
import {
  Settings, Activity, Save, Loader2, Shield, AlertTriangle, Server,
  Cpu, HardDrive, Clock, BarChart3, XCircle, CheckCircle2,
} from 'lucide-react';

export default function AdminSystemPage() {
  const { user } = useAuth();

  // Data states
  const [config, setConfig] = useState<SystemConfigResponse | null>(null);
  const [metrics, setMetrics] = useState<SystemMetricsResponse | null>(null);
  const [failedJobs, setFailedJobs] = useState<FailedJobItem[]>([]);
  const [failedTotal, setFailedTotal] = useState(0);
  const [asrStats, setAsrStats] = useState<ASRConfidenceStatsResponse | null>(null);

  // UI states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'config' | 'metrics' | 'failed' | 'asr'>('metrics');

  // Editable config
  const [editConfig, setEditConfig] = useState<Partial<SystemConfigResponse>>({});

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [c, m, f, a] = await Promise.all([
          adminApi.getSystemConfig(),
          adminApi.getSystemMetrics(),
          adminApi.getFailedJobs({ limit: 20 }),
          adminApi.getASRConfidenceStats(),
        ]);
        setConfig(c);
        setEditConfig(c);
        setMetrics(m);
        setFailedJobs(f.jobs);
        setFailedTotal(f.total);
        setAsrStats(a);
      } catch {
        // individual sections will show empty
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSaveConfig = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const updated = await adminApi.updateSystemConfig(editConfig);
      setConfig(updated);
      setEditConfig(updated);
      setSaveMsg('Konfigurasi berhasil disimpan');
    } catch (err: unknown) {
      const resp = (err as { response?: { data?: { detail?: string } } })?.response;
      setSaveMsg(resp?.data?.detail || 'Gagal menyimpan konfigurasi');
    } finally {
      setSaving(false);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <AppLayout activePath="/admin/system">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Shield size={48} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-bold text-gray-900">Akses Ditolak</h2>
            <p className="text-sm text-gray-500 mt-1">Hanya admin yang dapat mengakses halaman ini.</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (loading) {
    return (
      <AppLayout activePath="/admin/system">
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={32} className="animate-spin text-teal-600" />
        </div>
      </AppLayout>
    );
  }

  const tabs = [
    { key: 'metrics' as const, label: 'Metrik Sistem', icon: <Activity size={16} /> },
    { key: 'config' as const, label: 'Konfigurasi', icon: <Settings size={16} /> },
    { key: 'failed' as const, label: `Job Gagal (${failedTotal})`, icon: <AlertTriangle size={16} /> },
    { key: 'asr' as const, label: 'Statistik ASR', icon: <BarChart3 size={16} /> },
  ];

  return (
    <AppLayout activePath="/admin/system">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Server size={24} className="text-teal-600" />
            Manajemen Sistem
          </h1>
          <p className="text-sm text-gray-500 mt-1">Konfigurasi pipeline, metrik, dan monitoring</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === t.key
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Metrics ────────────────────────────────────────────── */}
        {activeTab === 'metrics' && metrics && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Job Selesai Hari Ini', value: metrics.jobs_completed_today, icon: <CheckCircle2 size={20} />, color: 'text-green-600 bg-green-50' },
                { label: 'Job Gagal Hari Ini', value: metrics.jobs_failed_today, icon: <XCircle size={20} />, color: 'text-red-600 bg-red-50' },
                { label: 'Job Dibatalkan', value: metrics.jobs_cancelled_today, icon: <AlertTriangle size={20} />, color: 'text-amber-600 bg-amber-50' },
                { label: 'Rata-rata Waktu Proses', value: `${Math.round(metrics.average_processing_time_seconds)}s`, icon: <Clock size={20} />, color: 'text-blue-600 bg-blue-50' },
              ].map((card) => (
                <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2 rounded-lg ${card.color}`}>{card.icon}</div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{card.label}</p>
                </div>
              ))}
            </div>

            {/* GPU + Queue */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Cpu size={18} className="text-teal-600" />
                  <h3 className="font-semibold text-gray-900">GPU Utilization</h3>
                </div>
                <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-teal-500 to-teal-400 rounded-full transition-all"
                    style={{ width: `${Math.min(100, metrics.gpu_utilization_percent)}%` }}
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">{metrics.gpu_utilization_percent.toFixed(1)}%</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <HardDrive size={18} className="text-teal-600" />
                  <h3 className="font-semibold text-gray-900">Antrian per Stage</h3>
                </div>
                <div className="space-y-2">
                  {Object.entries(metrics.queue_depth_by_stage).length === 0 ? (
                    <p className="text-sm text-gray-400">Tidak ada antrian</p>
                  ) : (
                    Object.entries(metrics.queue_depth_by_stage).map(([stage, count]) => (
                      <div key={stage} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 capitalize">{stage}</span>
                        <span className="font-semibold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">{count}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Config ─────────────────────────────────────────────── */}
        {activeTab === 'config' && config && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-6">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Settings size={18} className="text-teal-600" />
              Pipeline Configuration
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[
                { key: 'min_segment_duration', label: 'Min Segment Duration (s)', type: 'number' },
                { key: 'max_concurrent_jobs', label: 'Max Concurrent Jobs', type: 'number' },
                { key: 'queue_max_depth', label: 'Queue Max Depth', type: 'number' },
                { key: 'jbi_buffer_seconds', label: 'JBI Buffer (s)', type: 'number' },
                { key: 'asr_model_default', label: 'ASR Model Default', type: 'text' },
                { key: 'asr_compute_type', label: 'ASR Compute Type', type: 'text' },
              ].map(({ key, label, type }) => (
                <div key={key} className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">{label}</label>
                  <input
                    type={type}
                    value={(editConfig as Record<string, unknown>)[key] as string | number ?? ''}
                    onChange={(e) =>
                      setEditConfig((prev) => ({
                        ...prev,
                        [key]: type === 'number' ? Number(e.target.value) : e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                  />
                </div>
              ))}
            </div>

            {saveMsg && (
              <div className={`p-3 rounded-lg text-sm ${saveMsg.includes('berhasil') ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {saveMsg}
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={handleSaveConfig}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Simpan Konfigurasi
              </button>
            </div>
          </div>
        )}

        {/* ── Failed Jobs ────────────────────────────────────────── */}
        {activeTab === 'failed' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">File</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Stage</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Error</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Retry</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Waktu Gagal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {failedJobs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-sm text-gray-400">
                        <CheckCircle2 size={32} className="mx-auto mb-2 text-green-300" />
                        Tidak ada job yang gagal
                      </td>
                    </tr>
                  ) : (
                    failedJobs.map((j) => (
                      <tr key={j.job_id} className="hover:bg-gray-50/50">
                        <td className="px-5 py-3 text-sm text-gray-900 max-w-[180px] truncate" title={j.original_filename}>
                          {j.original_filename}
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded capitalize">{j.stage}</span>
                        </td>
                        <td className="px-5 py-3 text-sm text-red-600 max-w-[250px] truncate" title={j.error_message}>
                          {j.error_message}
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-500">{j.retry_count}</td>
                        <td className="px-5 py-3 text-sm text-gray-500">
                          {j.failed_at ? new Date(j.failed_at).toLocaleString('id-ID') : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── ASR Stats ──────────────────────────────────────────── */}
        {activeTab === 'asr' && asrStats && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Segmen', value: asrStats.total_segments },
                { label: 'Rata-rata Confidence', value: asrStats.average_confidence != null ? `${(asrStats.average_confidence * 100).toFixed(1)}%` : '-' },
                { label: 'Min Confidence', value: asrStats.min_confidence != null ? `${(asrStats.min_confidence * 100).toFixed(1)}%` : '-' },
                { label: 'Max Confidence', value: asrStats.max_confidence != null ? `${(asrStats.max_confidence * 100).toFixed(1)}%` : '-' },
              ].map((card) => (
                <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{card.label}</p>
                </div>
              ))}
            </div>

            {/* Distribution */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">Distribusi Confidence</h3>
              <div className="space-y-3">
                {[
                  { label: 'High (≥ 90%)', value: asrStats.confidence_distribution.high, color: 'bg-green-500' },
                  { label: 'Medium (50–90%)', value: asrStats.confidence_distribution.medium, color: 'bg-amber-500' },
                  { label: 'Low (< 50%)', value: asrStats.confidence_distribution.low, color: 'bg-red-500' },
                ].map((item) => {
                  const pct = asrStats.total_segments > 0 ? (item.value / asrStats.total_segments) * 100 : 0;
                  return (
                    <div key={item.label}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600">{item.label}</span>
                        <span className="font-semibold text-gray-900">{item.value} ({pct.toFixed(1)}%)</span>
                      </div>
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${item.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
