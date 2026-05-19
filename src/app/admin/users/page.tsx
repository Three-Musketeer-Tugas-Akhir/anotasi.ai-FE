'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/shared/components/layout/app-layout';
import { adminApi } from '@/features/admin';
import type { UserListItem, UserListParams } from '@/features/admin';
import { useAuth } from '@/features/auth';
import {
  Users, Plus, ChevronLeft, ChevronRight, Shield, Loader2, UserX, AlertTriangle,
  Search, Filter,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from '@/components/ui/pagination';

const ROLES = [
  { value: 'admin', label: 'Admin', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'annotator', label: 'Annotator', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'curator', label: 'Curator', color: 'bg-amber-100 text-amber-700 border-amber-200' },
];

function getRoleBadge(role: string) {
  const r = ROLES.find((x) => x.value === role);
  return r ? r.color : 'bg-gray-100 text-gray-700 border-gray-200';
}

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('');

  // Create user modal
  const [showCreate, setShowCreate] = useState(false);
  const [createRole, setCreateRole] = useState('annotator');
  const [createFirstName, setCreateFirstName] = useState('');
  const [createLastName, setCreateLastName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createResult, setCreateResult] = useState<string | null>(null);

  // Role change
  const [changingRole, setChangingRole] = useState<string | null>(null);

  // Deactivate
  const [confirmDeactivate, setConfirmDeactivate] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: UserListParams = { page, page_size: 20 };
      if (roleFilter) params.role = roleFilter;
      if (activeFilter === 'true') params.is_active = true;
      if (activeFilter === 'false') params.is_active = false;
      const res = await adminApi.listUsers(params);
      setUsers(res.items);
      setTotal(res.total);
      setPages(res.pages);
    } catch {
      setError('Gagal memuat daftar pengguna');
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter, activeFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleCreateUser = async () => {
    setCreateLoading(true);
    setCreateResult(null);
    try {
      const data: any = { roles: [createRole] };
      
      if (createEmail) {
        data.email = createEmail;
      } else {
        data.first_name = createFirstName;
        data.last_name = createLastName;
      }
      
      if (createPassword) data.password = createPassword;
      
      const res = await adminApi.createUser(data);
      setCreateResult(`User berhasil dibuat.${res?.temporary_password ? ` Password sementara: ${res.temporary_password}` : ''}`);
      setCreateEmail('');
      setCreateFirstName('');
      setCreateLastName('');
      setCreatePassword('');
      setShowCreate(false);
      fetchUsers();
    } catch (err: unknown) {
      const resp = (err as { response?: { data?: { detail?: string } } })?.response;
      setCreateResult(resp?.data?.detail || 'Gagal membuat user.');
    } finally {
      setCreateLoading(false);
    }
  };

  // Preview generated email and password based on names
  const previewEmail = (createFirstName && createLastName) 
    ? `${createFirstName.toLowerCase()}.${createLastName.toLowerCase()}@anotasi.ai` 
    : '';
  const previewPassword = createFirstName 
    ? `${createFirstName.charAt(0).toUpperCase() + createFirstName.slice(1).toLowerCase()}123!` 
    : '';

  const handleRoleChange = async (userId: string, newRole: string) => {
    setChangingRole(userId);
    try {
      await adminApi.updateUserRole(userId, { role: newRole });
      fetchUsers();
    } catch {
      // silently fail — user will see unchanged role
    } finally {
      setChangingRole(null);
    }
  };

  const handleDeactivate = async (userId: string) => {
    try {
      await adminApi.deactivateUser(userId);
      setConfirmDeactivate(null);
      fetchUsers();
    } catch {
      // silently fail
    }
  };

  // Gate: only admin can use this page
  if (user?.role !== 'admin') {
    return (
      <AppLayout activePath="/admin/users">
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

  return (
    <AppLayout activePath="/admin/users">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users size={24} className="text-teal-600" />
              Kelola Pengguna
            </h1>
            <p className="text-sm text-gray-500 mt-1">{total} pengguna terdaftar</p>
          </div>
          <button
            onClick={() => { setShowCreate(true); setCreateResult(null); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-white text-sm font-semibold rounded-lg shadow-lg shadow-teal-600/25 transition-all"
          >
            <Plus size={16} />
            Tambah User
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Filter size={14} />
            <span>Filter:</span>
          </div>
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          >
            <option value="">Semua Role</option>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <select
            value={activeFilter}
            onChange={(e) => { setActiveFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          >
            <option value="">Semua Status</option>
            <option value="true">Aktif</option>
            <option value="false">Non-aktif</option>
          </select>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="bg-gray-50 border-b border-gray-200 hover:bg-gray-50">
                  <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Dibuat</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100">
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <Loader2 size={24} className="animate-spin text-teal-600 mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-sm text-gray-400">
                      <Search size={32} className="mx-auto mb-2 text-gray-300" />
                      Tidak ada pengguna ditemukan
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => (
                    <TableRow key={u.id} className="hover:bg-gray-50/50 transition-colors">
                      <TableCell className="py-4">
                        <p className="text-sm font-medium text-gray-900">{u.email}</p>
                        <p className="text-xs text-gray-400 font-mono">{u.id.slice(0, 8)}...</p>
                      </TableCell>
                      <TableCell className="py-4">
                        {changingRole === u.id ? (
                          <Loader2 size={14} className="animate-spin text-teal-600" />
                        ) : (
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            disabled={u.id === user?.id}
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getRoleBadge(u.role)} cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {ROLES.map((r) => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </select>
                        )}
                      </TableCell>
                      <TableCell className="py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                          {u.is_active ? 'Aktif' : 'Non-aktif'}
                        </span>
                      </TableCell>
                      <TableCell className="py-4 text-sm text-gray-500">
                        {new Date(u.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </TableCell>
                      <TableCell className="py-4 text-right">
                        {u.id !== user?.id && u.is_active && (
                          confirmDeactivate === u.id ? (
                            <div className="flex items-center gap-2 justify-end">
                              <span className="text-xs text-red-600">Yakin?</span>
                              <button
                                onClick={() => handleDeactivate(u.id)}
                                className="px-2.5 py-1 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                              >
                                Ya
                              </button>
                              <button
                                onClick={() => setConfirmDeactivate(null)}
                                className="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                              >
                                Batal
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeactivate(u.id)}
                              className="text-red-500 hover:text-red-700 transition-colors p-1"
                              title="Nonaktifkan user"
                            >
                              <UserX size={16} />
                            </button>
                          )
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
              <p className="text-xs text-gray-500">
                Halaman {page} dari {pages} · {total} pengguna
              </p>
              <Pagination className="mx-0 w-auto">
                <PaginationContent>
                  <PaginationItem>
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600 transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                  </PaginationItem>
                  <PaginationItem>
                    <button
                      onClick={() => setPage((p) => Math.min(pages, p + 1))}
                      disabled={page >= pages}
                      className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600 transition-colors"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>

        {/* Create User Modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setShowCreate(false); setCreateResult(null); }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Plus size={20} className="text-teal-600" />
                Tambah Pengguna Baru
              </h3>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Role</label>
                  <select
                    value={createRole}
                    onChange={(e) => setCreateRole(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Nama Depan</label>
                    <input
                      type="text"
                      value={createFirstName}
                      onChange={(e) => setCreateFirstName(e.target.value)}
                      placeholder="Budi"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Nama Belakang</label>
                    <input
                      type="text"
                      value={createLastName}
                      onChange={(e) => setCreateLastName(e.target.value)}
                      placeholder="Santoso"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                    />
                  </div>
                </div>
                
                {previewEmail && (
                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800 space-y-1">
                    <p className="font-medium text-blue-900">Auto-generated Credentials:</p>
                    <p><strong>Email:</strong> {previewEmail}</p>
                    <p><strong>Password:</strong> {previewPassword}</p>
                  </div>
                )}
                
                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-gray-200"></div>
                  <span className="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase font-medium">Atau manual</span>
                  <div className="flex-grow border-t border-gray-200"></div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Email (Opsional)</label>
                  <input
                    type="email"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                  />
                  <p className="text-xs text-gray-500">Jika diisi, fitur auto-generate email dari nama akan diabaikan.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Role</label>
                  <select
                    value={createRole}
                    onChange={(e) => setCreateRole(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Password Sementara (opsional)</label>
                  <input
                    type="text"
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    placeholder="Biarkan kosong untuk auto-generate"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                  />
                </div>

                {createResult && (
                  <div className={`p-3 rounded-lg text-sm ${createResult.startsWith('User berhasil') ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {createResult}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => { setShowCreate(false); setCreateResult(null); }}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Tutup
                </button>
                <button
                  onClick={handleCreateUser}
                  disabled={createLoading || (!createEmail && (!createFirstName || !createLastName))}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {createLoading && <Loader2 size={14} className="animate-spin" />}
                  Buat User
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
