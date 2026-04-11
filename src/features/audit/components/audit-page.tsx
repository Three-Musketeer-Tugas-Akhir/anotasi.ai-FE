'use client';

import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Combobox } from '@/components/ui/combobox';
import {
  ScrollText,
  ChevronLeft,
  ChevronRight,
  Shield,
  Clock,
  User,
  Activity,
  FileText,
  Eye,
  Loader2,
  AlertTriangle,
  RotateCcw,
  Download,
  BarChart3,
  Users,
  Calendar,
  Globe,
  X,
} from 'lucide-react';
import { auditApi } from '../audit-api';
import type {
  AuditLogItem,
  AuditLogListResponse,
  AuditLogDetailResponse,
  AuditStatsSummary,
  AvailableFilters,
} from '../types';

// ── Action icon/color mapping ──────────────────────────────────────

function getActionStyle(action: string): { color: string; icon: React.ReactNode } {
  if (action.startsWith('user.login')) return { color: 'bg-blue-50 text-blue-700 border-blue-200', icon: <User size={10} /> };
  if (action.includes('created')) return { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <Activity size={10} /> };
  if (action.includes('deactivated')) return { color: 'bg-red-50 text-red-700 border-red-200', icon: <AlertTriangle size={10} /> };
  if (action.includes('role_changed')) return { color: 'bg-purple-50 text-purple-700 border-purple-200', icon: <Shield size={10} /> };
  if (action.includes('cancelled')) return { color: 'bg-amber-50 text-amber-700 border-amber-200', icon: <AlertTriangle size={10} /> };
  if (action.includes('submitted') || action.includes('approved')) return { color: 'bg-teal-50 text-teal-700 border-teal-200', icon: <FileText size={10} /> };
  return { color: 'bg-gray-50 text-gray-600 border-gray-200', icon: <Activity size={10} /> };
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

// ── Main Component ─────────────────────────────────────────────────

export function AuditPage() {
  // ── Data States ───────────────────────────────────────────────
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Stats ─────────────────────────────────────────────────────
  const [stats, setStats] = useState<AuditStatsSummary | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // ── Filters ───────────────────────────────────────────────────
  const [availableFilters, setAvailableFilters] = useState<AvailableFilters | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [actionFilter, setActionFilter] = useState('all');
  const [resourceFilter, setResourceFilter] = useState('all');

  // ── Detail Modal ──────────────────────────────────────────────
  const [selectedLog, setSelectedLog] = useState<AuditLogDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ── Fetch Logs ────────────────────────────────────────────────

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = {
        page,
        page_size: pageSize,
      };
      if (actionFilter !== 'all') params.action = actionFilter;
      if (resourceFilter !== 'all') params.resource_type = resourceFilter;

      const res: AuditLogListResponse = await auditApi.listLogs(params as never);
      setLogs(res.items);
      setTotal(res.total);
      setPages(res.pages);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Gagal memuat audit log';
      setError(typeof msg === 'string' ? msg : 'Gagal memuat audit log');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, actionFilter, resourceFilter]);

  // ── Fetch Stats ───────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await auditApi.getStats({ days: 30 });
      setStats(data);
    } catch {
      // Stats are optional, silently fail
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // ── Fetch Filters ─────────────────────────────────────────────

  const fetchFilters = useCallback(async () => {
    try {
      const data = await auditApi.getFilters();
      setAvailableFilters(data);
    } catch {
      // Silently fail
    }
  }, []);

  // ── View Detail ───────────────────────────────────────────────

  const viewDetail = async (logId: string) => {
    setDetailLoading(true);
    try {
      const detail = await auditApi.getLog(logId);
      setSelectedLog(detail);
    } catch {
      // Silently fail
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Export ────────────────────────────────────────────────────

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const params: Record<string, string | number> = {};
      if (actionFilter !== 'all') params.action = actionFilter;
      if (resourceFilter !== 'all') params.resource_type = resourceFilter;
      await auditApi.exportLogs(format, params);
    } catch {
      // Silently fail
    }
  };

  // ── Effects ───────────────────────────────────────────────────

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => { fetchStats(); fetchFilters(); }, [fetchStats, fetchFilters]);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ScrollText size={24} className="text-teal-600" />
            Audit Trail
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Log aktivitas sistem untuk keamanan dan kepatuhan.
            <span className="text-teal-600 font-medium ml-1">
              <Shield size={12} className="inline mr-0.5" />
              Admin Only
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport('csv')} className="text-xs gap-1">
            <Download size={12} /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('json')} className="text-xs gap-1">
            <Download size={12} /> JSON
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <BarChart3 size={14} className="text-blue-600" />
              </div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Total Log</p>
            </div>
            <p className="text-2xl font-bold text-gray-800">{stats.total_logs.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Users size={14} className="text-emerald-600" />
              </div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">User Aktif</p>
            </div>
            <p className="text-2xl font-bold text-gray-800">{stats.unique_users}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <Activity size={14} className="text-amber-600" />
              </div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Aksi Teratas</p>
            </div>
            <p className="text-sm font-bold text-gray-800 truncate">
              {stats.top_actions[0]?.label || '-'}
            </p>
            <p className="text-xs text-gray-400">{stats.top_actions[0]?.count || 0} kali</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <Calendar size={14} className="text-purple-600" />
              </div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Periode</p>
            </div>
            <p className="text-sm font-medium text-gray-700">30 hari terakhir</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-end gap-3 flex-wrap">
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500">Aksi</label>
          <Combobox
            options={[
              { value: "all", label: "Semua Aksi" },
              ...(availableFilters?.actions.map(a => ({ value: a.action, label: a.label })) || [])
            ]}
            value={actionFilter || ''}
            onChange={(v) => { setActionFilter(v); setPage(1); }}
            placeholder="Semua Aksi"
            className="w-48 h-9 text-xs"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500">Resource</label>
          <Combobox
            options={[
              { value: "all", label: "Semua" },
              ...(availableFilters?.resource_types.map(rt => ({ value: rt, label: rt })) || [])
            ]}
            value={resourceFilter || ''}
            onChange={(v) => { setResourceFilter(v); setPage(1); }}
            placeholder="Semua"
            className="w-36 h-9 text-xs"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500">Per Halaman</label>
          <Combobox
            options={[
              { value: "10", label: "10" },
              { value: "20", label: "20" },
              { value: "50", label: "50" }
            ]}
            value={String(pageSize)}
            onChange={(v) => { setPageSize(Number(v)); setPage(1); }}
            placeholder="Pilih..."
            className="w-24 h-9 text-xs"
          />
        </div>

        <Badge variant="outline" className="h-9 px-3 bg-gray-50 text-gray-600 border-gray-200 gap-1">
          <Activity size={12} /> {total.toLocaleString()} log
        </Badge>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-500" />
          <p className="text-sm text-red-700 flex-1">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchLogs} className="text-xs">
            <RotateCcw size={12} className="mr-1" /> Retry
          </Button>
        </div>
      )}

      {/* Logs Table */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <Clock size={16} className="text-teal-600" />
            Log Aktivitas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50">
                <TableHead className="w-44">Waktu</TableHead>
                <TableHead className="w-44">Aktor</TableHead>
                <TableHead className="w-36 text-center">Aksi</TableHead>
                <TableHead className="w-28">Resource</TableHead>
                <TableHead className="w-24 text-center">IP</TableHead>
                <TableHead className="w-16 text-center">Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <Loader2 size={20} className="text-teal-600 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Memuat...</p>
                  </TableCell>
                </TableRow>
              )}
              {!loading && logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-gray-400">
                    Tidak ada log yang ditemukan.
                  </TableCell>
                </TableRow>
              )}
              {!loading && logs.map((log) => {
                const style = getActionStyle(log.action);
                return (
                  <TableRow key={log.id} className="hover:bg-gray-50/50">
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <Clock size={11} className="text-gray-400 flex-shrink-0" />
                        {formatDate(log.timestamp)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.actor ? (
                        <div className="flex items-center gap-1.5">
                          <User size={12} className="text-gray-400 flex-shrink-0" />
                          <span className="text-xs font-medium text-gray-800 truncate max-w-[140px]">
                            {log.actor.email || log.actor.id?.slice(0, 8) || '—'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">System</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={`text-[10px] gap-0.5 ${style.color}`}>
                        {style.icon} {log.action_label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <code className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">
                        {log.resource.type}
                      </code>
                    </TableCell>
                    <TableCell className="text-center">
                      {log.ip_address ? (
                        <span className="text-[10px] text-gray-500 font-mono">{log.ip_address}</span>
                      ) : (
                        <span className="text-[10px] text-gray-300">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <button
                        onClick={() => viewDetail(log.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                      >
                        <Eye size={14} />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          Halaman {page} dari {pages} ({total} total log)
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="gap-1 text-xs">
            <ChevronLeft size={14} /> Sebelumnya
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages} className="gap-1 text-xs">
            Selanjutnya <ChevronRight size={14} />
          </Button>
        </div>
      </div>

      {/* Detail Modal */}
      <Dialog open={!!selectedLog} onOpenChange={(v) => !v && setSelectedLog(null)}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ScrollText size={16} className="text-teal-600" />
              Detail Log
            </DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="text-teal-600 animate-spin" />
            </div>
          ) : selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Waktu</p>
                  <p className="text-sm font-medium text-gray-800">{formatDate(selectedLog.timestamp)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Aksi</p>
                  <Badge variant="outline" className={`text-[10px] ${getActionStyle(selectedLog.action).color}`}>
                    {selectedLog.action_label}
                  </Badge>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Aktor</p>
                  <p className="text-sm text-gray-700">
                    {selectedLog.actor?.email || 'System'}
                  </p>
                  {selectedLog.actor?.id && (
                    <p className="text-[10px] font-mono text-gray-400">{selectedLog.actor.id}</p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Resource</p>
                  <p className="text-sm text-gray-700">{selectedLog.resource.type}</p>
                  <p className="text-[10px] font-mono text-gray-400">{selectedLog.resource.id}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">IP Address</p>
                  <p className="text-sm font-mono text-gray-700">{selectedLog.ip_address || '—'}</p>
                </div>
                {selectedLog.user_agent && (
                  <div className="col-span-2">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">User Agent</p>
                    <p className="text-xs text-gray-600 break-all">{selectedLog.user_agent}</p>
                  </div>
                )}
              </div>

              {Object.keys(selectedLog.details).length > 0 && (
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Detail</p>
                  <pre className="bg-gray-50 rounded-lg border border-gray-200 p-3 text-xs text-gray-700 overflow-x-auto">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
