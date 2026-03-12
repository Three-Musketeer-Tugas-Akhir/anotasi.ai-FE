'use client';

import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ScrollText,
  ChevronLeft,
  ChevronRight,
  Shield,
  Clock,
  User,
  Activity,
  LogIn,
  UserPlus,
  Wand2,
  ShieldCheck,
  FileText,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '@/features/auth';
import { auditApi } from '../audit-api';
import type { AuditLogEntry, AuditLogResponse } from '../types';

// ── Action config ──────────────────────────────────────────────────

const ACTION_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  LOGIN: { label: 'Login', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: <LogIn size={12} /> },
  REGISTER: { label: 'Register', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: <UserPlus size={12} /> },
  NORMALIZE: { label: 'Normalize', color: 'bg-teal-50 text-teal-700 border-teal-200', icon: <Wand2 size={12} /> },
  APPROVE: { label: 'Approve', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <ShieldCheck size={12} /> },
  EXPORT: { label: 'Export', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: <FileText size={12} /> },
};

function ActionBadge({ action }: { action: string }) {
  const cfg = ACTION_CONFIG[action] || {
    label: action,
    color: 'bg-gray-50 text-gray-700 border-gray-200',
    icon: <Activity size={12} />,
  };
  return (
    <Badge variant="outline" className={`${cfg.color} gap-1`}>
      {cfg.icon} {cfg.label}
    </Badge>
  );
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-50 text-red-700 border-red-200',
  annotator: 'bg-blue-50 text-blue-700 border-blue-200',
  curator: 'bg-teal-50 text-teal-700 border-teal-200',
  system: 'bg-gray-50 text-gray-700 border-gray-200',
};

// ── Mock Data ──────────────────────────────────────────────────────

const MOCK_LOGS: AuditLogEntry[] = [
  { id: '1', username: 'admin', role: 'admin', action: 'LOGIN', resource: 'user:admin', detail: 'User System Administrator logged in successfully', created_at: new Date(Date.now() - 1000 * 60 * 2).toISOString() },
  { id: '2', username: 'annotator', role: 'annotator', action: 'LOGIN', resource: 'user:annotator', detail: 'User Rina Annotator logged in successfully', created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
  { id: '3', username: 'curator', role: 'curator', action: 'NORMALIZE', resource: 'video:cv-1', detail: 'Auto-normalized 4 segments of video "29 Korban Kapal Tenggelam.mp4"', created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
  { id: '4', username: 'curator', role: 'curator', action: 'APPROVE', resource: 'video:cv-3', detail: 'Approved video "Berita Utama Siang.mp4" for export', created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString() },
  { id: '5', username: 'admin', role: 'admin', action: 'REGISTER', resource: 'user:new_user', detail: 'New user Siti registered with role annotator', created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString() },
  { id: '6', username: 'annotator', role: 'annotator', action: 'LOGIN', resource: 'user:annotator', detail: 'User Rina Annotator logged in successfully', created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
  { id: '7', username: 'system', role: 'system', action: 'EXPORT', resource: 'dataset:batch-12', detail: 'Exported 120 tuples as CSV + MP4 bundle', created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString() },
  { id: '8', username: 'curator', role: 'curator', action: 'NORMALIZE', resource: 'video:cv-2', detail: 'Auto-normalized 3 segments of video "Sidang Kabinet Paripurna.mp4"', created_at: new Date(Date.now() - 1000 * 60 * 240).toISOString() },
];

// ── Main Component ─────────────────────────────────────────────────

export function AuditPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [logs, setLogs] = useState<AuditLogEntry[]>(MOCK_LOGS);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(MOCK_LOGS.length);
  const [perPage, setPerPage] = useState('20');
  const [actionFilter, setActionFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async (p: number, pp: number) => {
    setLoading(true);
    try {
      const res: AuditLogResponse = await auditApi.fetchLogs(p, pp);
      setLogs(res.data);
      setTotal(res.meta.total);
      setTotalPages(res.meta.total_pages);
      setPage(res.meta.page);
    } catch {
      // Fallback to mock data if API is not available
      setLogs(MOCK_LOGS);
      setTotal(MOCK_LOGS.length);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(page, parseInt(perPage));
  }, [fetchLogs, page, perPage]);

  // Client-side action filter (on current page data)
  const filtered = actionFilter === 'all'
    ? logs
    : logs.filter((l) => l.action === actionFilter);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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
            Log aktivitas sistem.{' '}
            {isAdmin ? (
              <span className="text-teal-600 font-medium">
                <Shield size={12} className="inline mr-0.5" />
                Admin View — menampilkan user &amp; role
              </span>
            ) : (
              <span className="text-gray-400">
                <EyeOff size={12} className="inline mr-0.5" />
                Identitas pelaksana disembunyikan
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 gap-1">
            <Activity size={12} /> {total} Total Log
          </Badge>
          {isAdmin && (
            <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 gap-1">
              <Eye size={12} /> Full Access
            </Badge>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500">Filter Aksi</label>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-44 h-9">
              <SelectValue placeholder="Semua Aksi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Aksi</SelectItem>
              <SelectItem value="LOGIN">Login</SelectItem>
              <SelectItem value="REGISTER">Register</SelectItem>
              <SelectItem value="NORMALIZE">Normalize</SelectItem>
              <SelectItem value="APPROVE">Approve</SelectItem>
              <SelectItem value="EXPORT">Export</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500">Per Halaman</label>
          <Select value={perPage} onValueChange={(v) => { setPerPage(v); setPage(1); }}>
            <SelectTrigger className="w-24 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Logs Table */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <Clock size={16} className="text-teal-600" />
            Log Aktivitas ({filtered.length} ditampilkan)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50">
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead className="w-44">Waktu</TableHead>
                {isAdmin && <TableHead className="w-36">User</TableHead>}
                {isAdmin && <TableHead className="w-28 text-center">Role</TableHead>}
                <TableHead className="w-32 text-center">Aksi</TableHead>
                <TableHead className="w-44">Resource</TableHead>
                <TableHead>Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((log, i) => (
                <TableRow key={log.id} className={loading ? 'opacity-50' : ''}>
                  <TableCell className="text-center text-gray-400 text-xs">
                    {(page - 1) * parseInt(perPage) + i + 1}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <Clock size={12} className="text-gray-400" />
                      {formatTime(log.created_at)}
                    </div>
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <User size={14} className="text-gray-400" />
                        <span className="text-sm font-medium text-gray-800">{log.username || '—'}</span>
                      </div>
                    </TableCell>
                  )}
                  {isAdmin && (
                    <TableCell className="text-center">
                      {log.role ? (
                        <Badge variant="outline" className={`text-xs capitalize ${ROLE_COLORS[log.role] || ''}`}>
                          {log.role}
                        </Badge>
                      ) : '—'}
                    </TableCell>
                  )}
                  <TableCell className="text-center">
                    <ActionBadge action={log.action} />
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">
                      {log.resource || '—'}
                    </code>
                  </TableCell>
                  <TableCell className="text-sm text-gray-700 max-w-[300px] truncate">
                    {log.detail}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 7 : 5} className="text-center py-12 text-gray-400">
                    Tidak ada log yang cocok dengan filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          Halaman {page} dari {totalPages} ({total} total log)
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="gap-1"
          >
            <ChevronLeft size={14} /> Sebelumnya
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="gap-1"
          >
            Selanjutnya <ChevronRight size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}
