'use client';

import { useState, useEffect } from 'react';
import { usersApi } from '@/features/auth/users-api';
import { useAuth } from '@/features/auth';
import type { UserProfileResponse } from '@/features/auth';
import {
  User, Mail, Shield, Calendar, Edit3, Save, Loader2, Lock, Eye, EyeOff, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfilePage() {
  const { user } = useAuth();

  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit email
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Change password
  const [showPwSection, setShowPwSection] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    usersApi.getProfile()
      .then((p) => {
        setProfile(p);
        setNewEmail(p.email);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleEmailSave = async () => {
    setEmailSaving(true);
    setEmailMsg(null);
    try {
      const res = await usersApi.updateProfile({ email: newEmail });
      setProfile((prev) => prev ? { ...prev, email: res.email } : prev);
      setEditingEmail(false);
      setEmailMsg({ type: 'success', text: res.message || 'Email berhasil diperbarui' });
    } catch (err: unknown) {
      const resp = (err as { response?: { data?: { detail?: string } } })?.response;
      setEmailMsg({ type: 'error', text: resp?.data?.detail || 'Gagal mengubah email' });
    } finally {
      setEmailSaving(false);
    }
  };

  const pwChecks = {
    length: newPw.length >= 8,
    uppercase: /[A-Z]/.test(newPw),
    lowercase: /[a-z]/.test(newPw),
    digit: /\d/.test(newPw),
    special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPw),
  };
  const pwValid = Object.values(pwChecks).every(Boolean);
  const pwMatch = newPw === confirmPw && confirmPw.length > 0;

  const handlePasswordChange = async () => {
    if (!pwValid || !pwMatch) return;
    setPwSaving(true);
    setPwMsg(null);
    try {
      const res = await usersApi.changePassword({
        current_password: currentPw,
        new_password: newPw,
      });
      setPwMsg({ type: 'success', text: res.message || 'Password berhasil diubah' });
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      setShowPwSection(false);
    } catch (err: unknown) {
      const resp = (err as { response?: { data?: { detail?: string } } })?.response;
      setPwMsg({ type: 'error', text: resp?.data?.detail || 'Gagal mengubah password' });
    } finally {
      setPwSaving(false);
    }
  };

  if (loading) {
    return (
      
        <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-3xl mx-auto">
          {/* Header skeleton */}
          <div>
            <div className="flex items-center gap-2">
              <Skeleton className="w-6 h-6 rounded-full" />
              <Skeleton className="w-40 h-7 rounded-md" />
            </div>
            <Skeleton className="w-60 h-4 mt-2 rounded-md" />
          </div>

          {/* Profile Info Card skeleton */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-5">
            {/* Avatar + Name skeleton */}
            <div className="flex items-center gap-4">
              <Skeleton className="w-16 h-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="w-48 h-5 rounded-md" />
                <Skeleton className="w-24 h-4 rounded-md" />
              </div>
            </div>

            <div className="border-t border-gray-100 pt-5 space-y-4">
              {/* Email row skeleton */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <Skeleton className="w-[18px] h-[18px] mt-0.5 flex-shrink-0 rounded-sm" />
                  <div className="min-w-0 space-y-1.5">
                    <Skeleton className="w-10 h-3 rounded-md" />
                    <Skeleton className="w-56 h-4 rounded-md" />
                  </div>
                </div>
                <Skeleton className="w-7 h-7 rounded-md" />
              </div>

              {/* Role row skeleton */}
              <div className="flex items-start gap-3">
                <Skeleton className="w-[18px] h-[18px] mt-0.5 flex-shrink-0 rounded-sm" />
                <div className="space-y-1.5">
                  <Skeleton className="w-8 h-3 rounded-md" />
                  <div className="flex gap-1.5">
                    <Skeleton className="w-16 h-6 rounded-full" />
                    <Skeleton className="w-14 h-6 rounded-full" />
                  </div>
                </div>
              </div>

              {/* Status row skeleton */}
              <div className="flex items-start gap-3">
                <Skeleton className="w-[18px] h-[18px] mt-0.5 flex-shrink-0 rounded-sm" />
                <div className="space-y-1.5">
                  <Skeleton className="w-10 h-3 rounded-md" />
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-20 h-6 rounded-full" />
                    <Skeleton className="w-32 h-6 rounded-full" />
                  </div>
                </div>
              </div>

              {/* Created row skeleton */}
              <div className="flex items-start gap-3">
                <Skeleton className="w-[18px] h-[18px] mt-0.5 flex-shrink-0 rounded-sm" />
                <div className="space-y-1.5">
                  <Skeleton className="w-20 h-3 rounded-md" />
                  <Skeleton className="w-32 h-4 rounded-md" />
                </div>
              </div>
            </div>
          </div>

          {/* Change Password Section skeleton */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="w-[18px] h-[18px] rounded-sm" />
                <Skeleton className="w-32 h-5 rounded-md" />
              </div>
              <Skeleton className="w-10 h-4 rounded-md" />
            </div>
          </div>
        </div>
      
    );
  }

  return (
    
      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-3xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <User size={24} className="text-teal-600" />
            Profil Saya
          </h1>
          <p className="text-sm text-gray-500 mt-1">Kelola informasi akun dan keamanan Anda</p>
        </div>

        {/* Profile Info Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-5">
          {/* Avatar + Name */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
              {profile?.email?.charAt(0).toUpperCase() || '?'}
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{profile?.email || '-'}</p>
              <p className="text-sm text-gray-500">
                {profile?.roles?.map((r) => r.charAt(0).toUpperCase() + r.slice(1)).join(', ') || user?.role || '-'}
              </p>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-5 space-y-4">
            {/* Email row */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <Mail size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Email</p>
                  {editingEmail ? (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 min-w-[250px]"
                      />
                      <button
                        onClick={handleEmailSave}
                        disabled={emailSaving}
                        className="p-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-60"
                      >
                        {emailSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      </button>
                      <button
                        onClick={() => { setEditingEmail(false); setNewEmail(profile?.email || ''); }}
                        className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-900 mt-0.5">{profile?.email || '-'}</p>
                  )}
                </div>
              </div>
              {!editingEmail && (
                <button onClick={() => setEditingEmail(true)} className="text-teal-600 hover:text-teal-700 transition-colors p-1">
                  <Edit3 size={14} />
                </button>
              )}
            </div>

            {emailMsg && (
              <div className={`p-2.5 rounded-lg text-xs ${emailMsg.type === 'success' ? 'bg-teal-50 text-teal-700' : 'bg-red-50 text-red-700'}`}>
                {emailMsg.text}
              </div>
            )}

            {/* Role */}
            <div className="flex items-start gap-3">
              <Shield size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Role</p>
                <div className="flex gap-1.5 mt-1">
                  {(profile?.roles || [user?.role || '']).map((r) => (
                    <span key={r} className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-700 border border-teal-200">
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-start gap-3">
              <CheckCircle2 size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${profile?.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${profile?.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                    {profile?.is_active ? 'Aktif' : 'Non-aktif'}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${profile?.email_verified ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                    {profile?.email_verified ? '✓ Email Terverifikasi' : '○ Email Belum Verifikasi'}
                  </span>
                </div>
              </div>
            </div>

            {/* Created */}
            <div className="flex items-start gap-3">
              <Calendar size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Bergabung</p>
                <p className="text-sm text-gray-900 mt-0.5">
                  {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Change Password Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock size={18} className="text-teal-600" />
              <h3 className="font-semibold text-gray-900">Ubah Password</h3>
            </div>
            {!showPwSection && (
              <button
                onClick={() => setShowPwSection(true)}
                className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
              >
                Ubah
              </button>
            )}
          </div>

          {showPwSection && (
            <div className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Password Saat Ini</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all pr-10"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Password Baru</label>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                />
              </div>

              {newPw.length > 0 && (
                <div className="space-y-1 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  {[
                    { key: 'length', label: 'Minimal 8 karakter' },
                    { key: 'uppercase', label: 'Huruf besar' },
                    { key: 'lowercase', label: 'Huruf kecil' },
                    { key: 'digit', label: 'Angka' },
                    { key: 'special', label: 'Karakter spesial' },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-2 text-xs">
                      <span className={pwChecks[key as keyof typeof pwChecks] ? 'text-teal-600' : 'text-gray-400'}>
                        {pwChecks[key as keyof typeof pwChecks] ? '✓' : '·'}
                      </span>
                      <span className={pwChecks[key as keyof typeof pwChecks] ? 'text-teal-700' : 'text-gray-400'}>{label}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Konfirmasi Password Baru</label>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 transition-all ${
                    confirmPw.length > 0 ? (pwMatch ? 'border-teal-300 bg-teal-50/50' : 'border-red-300 bg-red-50/50') : 'border-gray-200 bg-gray-50'
                  }`}
                />
              </div>

              {pwMsg && (
                <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${pwMsg.type === 'success' ? 'bg-teal-50 text-teal-700' : 'bg-red-50 text-red-700'}`}>
                  {pwMsg.type === 'success' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                  {pwMsg.text}
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handlePasswordChange}
                  disabled={pwSaving || !pwValid || !pwMatch || !currentPw}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
                >
                  {pwSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Simpan Password
                </button>
                <button
                  onClick={() => { setShowPwSection(false); setCurrentPw(''); setNewPw(''); setConfirmPw(''); }}
                  className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Batal
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    
  );
}
