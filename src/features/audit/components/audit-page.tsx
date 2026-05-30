'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from '@/components/ui/pagination';
import {
  ScrollText,
  ChevronLeft,
  ChevronRight,
  Shield,
  Clock,
  User,
  Activity,
  FileText,
  AlertTriangle,
  RotateCcw,
  Download,
  BarChart3,
  Users,
  Calendar,
  ChevronDown,
  ChevronUp,
  PenTool,
  Mic,
  Layers,
  Tag,
  Wand2,
  CheckCircle2,
} from 'lucide-react';
import { auditApi } from '../audit-api';
import type {
  AuditLogItem,
  AuditLogListResponse,
  AuditStatsSummary,
  AvailableFilters,
} from '../types';
import { AUDIT_MODULES } from '../types';

// ── Action icon/color mapping ──────────────────────────────────────

function getActionStyle(action: string): { color: string; icon: React.ReactNode } {
  if (action.startsWith('user.login')) return { color: 'bg-blue-50 text-blue-700 border-blue-200', icon: <User size={10} /> };
  if (action.includes('created')) return { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <Activity size={10} /> };
  if (action.includes('deactivated')) return { color: 'bg-red-50 text-red-700 border-red-200', icon: <AlertTriangle size={10} /> };
  if (action.includes('role_changed')) return { color: 'bg-purple-50 text-purple-700 border-purple-200', icon: <Shield size={10} /> };
  if (action.includes('cancelled')) return { color: 'bg-amber-50 text-amber-700 border-amber-200', icon: <AlertTriangle size={10} /> };
  if (action.includes('submitted') || action.includes('approved')) return { color: 'bg-teal-50 text-teal-700 border-teal-200', icon: <FileText size={10} /> };
  if (action.includes('classification')) return { color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: <Tag size={10} /> };
  if (action.includes('voice_annotation')) return { color: 'bg-pink-50 text-pink-700 border-pink-200', icon: <Mic size={10} /> };
  if (action.includes('jbi_annotation')) return { color: 'bg-cyan-50 text-cyan-700 border-cyan-200', icon: <PenTool size={10} /> };
  if (action.includes('normalization')) return { color: 'bg-orange-50 text-orange-700 border-orange-200', icon: <Wand2 size={10} /> };
  if (action.includes('curation')) return { color: 'bg-lime-50 text-lime-700 border-lime-200', icon: <CheckCircle2 size={10} /> };
  if (action.includes('pipeline')) return { color: 'bg-sky-50 text-sky-700 border-sky-200', icon: <Layers size={10} /> };
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

// ── Expandable Row Detail ──────────────────────────────────────────

function AuditLogDetailRow({ log }: { log: AuditLogItem }) {
  return (
    <tr className="bg-slate-50/50 border-t-0">
      <td colSpan={6} className="py-4 px-6 border-t border-slate-100 shadow-inner">
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5 font-bold">Aktor</p>
              <p className="text-xs font-medium text-slate-800">
                {log.actor?.email || 'System'}
              </p>
              {log.actor?.id && (
                <p className="text-[10px] font-mono text-slate-400 mt-0.5">{log.actor.id}</p>
              )}
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5 font-bold">Resource</p>
              <p className="text-xs text-slate-700">{log.resource.type}</p>
              <p className="text-[10px] font-mono text-slate-400 mt-0.5">{log.resource.id}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5 font-bold">IP Address</p>
              <p className="text-xs font-mono text-slate-700">{log.ip_address || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5 font-bold">Waktu</p>
              <p className="text-xs text-slate-700">{formatDate(log.timestamp)}</p>
            </div>
          </div>

          {Object.keys(log.details).length > 0 && (
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 font-bold">Detail</p>
              <pre className="bg-white rounded-lg border border-slate-200 p-3.5 text-[11px] text-slate-700 overflow-x-auto shadow-sm">
                {JSON.stringify(log.details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
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
  const [moduleFilter, setModuleFilter] = useState('all');
  const [actorFilter, setActorFilter] = useState('all');

  // ── Expanded Rows ─────────────────────────────────────────────
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (logId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  };

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
      if (moduleFilter !== 'all') params.module = moduleFilter;
      if (actorFilter !== 'all') params.actor_id = actorFilter;

      const res: AuditLogListResponse = await auditApi.listLogs(params as never);
      setLogs(res.items);
      setTotal(res.total);
      setPages(res.pages);
      // Clear expanded rows on new data
      setExpandedRows(new Set());
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Gagal memuat audit log';
      setError(typeof msg === 'string' ? msg : 'Gagal memuat audit log');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, actionFilter, resourceFilter, moduleFilter, actorFilter]);

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

  // ── Export ────────────────────────────────────────────────────

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const params: Record<string, string | number> = {};
      if (actionFilter !== 'all') params.action = actionFilter;
      if (resourceFilter !== 'all') params.resource_type = resourceFilter;
      if (moduleFilter !== 'all') params.module = moduleFilter;
      if (actorFilter !== 'all') params.actor_id = actorFilter;
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
          <label className="text-xs font-medium text-gray-500">Modul</label>
          <select
            value={moduleFilter}
            onChange={(e) => { setModuleFilter(e.target.value); setPage(1); }}
            className="h-9 text-xs w-44 bg-white border border-slate-200 rounded-md px-2 text-slate-700 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all cursor-pointer"
          >
            {AUDIT_MODULES.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500">Aksi</label>
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="h-9 text-xs w-48 bg-white border border-slate-200 rounded-md px-2 text-slate-700 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all cursor-pointer"
          >
            <option value="all">Semua Aksi</option>
            {availableFilters?.actions.map(a => (
              <option key={a.action} value={a.action}>{a.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500">Resource</label>
          <select
            value={resourceFilter}
            onChange={(e) => { setResourceFilter(e.target.value); setPage(1); }}
            className="h-9 text-xs w-36 bg-white border border-slate-200 rounded-md px-2 text-slate-700 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all cursor-pointer"
          >
            <option value="all">Semua</option>
            {availableFilters?.resource_types.map(rt => (
              <option key={rt} value={rt}>{rt}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500">User</label>
          <select
            value={actorFilter}
            onChange={(e) => { setActorFilter(e.target.value); setPage(1); }}
            className="h-9 text-xs w-48 bg-white border border-slate-200 rounded-md px-2 text-slate-700 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all cursor-pointer"
          >
            <option value="all">Semua User</option>
            {availableFilters?.actors?.map(u => (
              <option key={u.id} value={u.id}>{u.email}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500">Per Halaman</label>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="h-9 text-xs w-24 bg-white border border-slate-200 rounded-md px-2 text-slate-700 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all cursor-pointer"
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
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
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Clock size={16} className="text-teal-600" />
            Log Aktivitas
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-3 w-10 text-center"></th>
                <th className="px-6 py-3 w-44">Waktu</th>
                <th className="px-6 py-3 w-44">Aktor</th>
                <th className="px-6 py-3 w-40 text-center">Aksi</th>
                <th className="px-6 py-3 w-28">Resource</th>
                <th className="px-6 py-3 w-24 text-center">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading && (
                <>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 text-center"><Skeleton className="h-4 w-4 inline-block" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                      <td className="px-6 py-4 text-center"><Skeleton className="h-6 w-20 rounded-full inline-block" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                      <td className="px-6 py-4 text-center"><Skeleton className="h-4 w-20 inline-block" /></td>
                    </tr>
                  ))}
                </>
              )}
              {!loading && logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    Tidak ada log yang ditemukan.
                  </td>
                </tr>
              )}
              {!loading && logs.map((log) => {
                const style = getActionStyle(log.action);
                const isExpanded = expandedRows.has(log.id);
                return (
                  <Fragment key={log.id}>
                    <tr
                      className={`hover:bg-slate-50/80 cursor-pointer transition-colors group ${isExpanded ? 'bg-slate-50' : ''}`}
                      onClick={() => toggleRow(log.id)}
                    >
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleRow(log.id); }}
                          className="p-1 rounded text-slate-400 group-hover:text-teal-600 transition-colors"
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <Clock size={11} className="text-slate-400 flex-shrink-0" />
                          {formatDate(log.timestamp)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {log.actor ? (
                          <div className="flex items-center gap-1.5">
                            <User size={12} className="text-slate-400 flex-shrink-0" />
                            <span className="text-xs font-medium text-slate-800 truncate max-w-[140px]">
                              {log.actor.email || log.actor.id?.slice(0, 8) || '—'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">System</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider font-bold border shadow-sm ${style.color}`}>
                          {style.icon} {log.action_label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono border border-slate-200">
                          {log.resource.type}
                        </code>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {log.ip_address ? (
                          <span className="text-[10px] text-slate-500 font-mono">{log.ip_address}</span>
                        ) : (
                          <span className="text-[10px] text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                    {isExpanded && <AuditLogDetailRow log={log} />}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-4">
        <p className="text-xs text-gray-500">
          Halaman {page} dari {pages} ({total} total log)
        </p>
        <Pagination className="mx-0 w-auto">
          <PaginationContent>
            <PaginationItem>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="gap-1 text-xs"
              >
                <ChevronLeft size={14} /> Sebelumnya
              </Button>
            </PaginationItem>
            <PaginationItem>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages}
                className="gap-1 text-xs"
              >
                Selanjutnya <ChevronRight size={14} />
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
