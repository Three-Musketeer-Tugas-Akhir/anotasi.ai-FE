'use client';

import { useState, FormEvent } from 'react';
import { useAuth } from '@/features/auth';
import { useRouter } from 'next/navigation';
import { Loader2, KeyRound, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { authApi } from '@/features/auth/auth-api';

export default function ForceChangePasswordPage() {
  const { user, clearError, isLoading, logout } = useAuth();
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isLoading || isSubmitting) return;

    if (newPassword !== confirmPassword) {
      setError('Password baru dan konfirmasi password tidak cocok.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password baru harus memiliki minimal 8 karakter.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await authApi.forceChangePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      
      // Success! We need to force a re-fetch of user info to clear the must_change_password flag
      window.location.href = '/';
    } catch (err: any) {
      const resp = err?.response?.data;
      setError(resp?.detail || resp?.error || 'Terjadi kesalahan saat mengganti password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Hero Panel (Matching Login Page) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-teal-900 to-slate-900 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-teal-400/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-teal-600/10 rounded-full blur-2xl" />

        <div className="relative z-10 flex flex-col justify-center px-16 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl flex items-center justify-center font-bold text-xl text-white shadow-xl shadow-teal-900/40">
              A
            </div>
            <span className="text-white font-bold text-2xl tracking-tight">Anotasi.ai</span>
          </div>

          {/* Tagline */}
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Keamanan Akun
            <br />
            <span className="text-teal-400">Pembaruan Password</span>
          </h1>
          <p className="text-slate-300 text-lg leading-relaxed max-w-md">
            Untuk menjaga keamanan platform dan dataset SIBI, Anda diwajibkan untuk mengganti
            password sementara yang diberikan oleh administrator.
          </p>
        </div>
      </div>

      {/* Right Login Panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-teal-600 rounded-lg flex items-center justify-center font-bold text-lg text-white shadow-lg">
              A
            </div>
            <span className="font-bold text-xl tracking-tight text-gray-900">Anotasi.ai</span>
          </div>

          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="text-amber-600" size={24} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Ubah Password</h2>
              <p className="text-sm text-gray-500 mt-2">
                Ini adalah login pertama Anda. Demi keamanan, silakan ubah password sementara Anda.
              </p>
            </div>

            {/* Error display */}
            {error && (
              <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
                <span className="mt-0.5">⚠️</span>
                <span>{error}</span>
                <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600 text-xs">✕</button>
              </div>
            )}

            <div className="space-y-4" onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSubmit(e as any);
              }
            }}>
              {/* Current Password */}
              <div className="space-y-1.5">
                <label htmlFor="currentPassword" className="text-sm font-medium text-gray-700">
                  Password Saat Ini (Sementara)
                </label>
                <div className="relative">
                  <input
                    id="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => { setCurrentPassword(e.target.value); setError(null); }}
                    placeholder="Contoh: Budi123!"
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label htmlFor="newPassword" className="text-sm font-medium text-gray-700">
                  Password Baru
                </label>
                <div className="relative">
                  <input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setError(null); }}
                    placeholder="Minimal 8 karakter"
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              
              {/* Confirm New Password */}
              <div className="space-y-1.5">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                  Konfirmasi Password Baru
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                    placeholder="Ketik ulang password baru"
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading || isSubmitting || !currentPassword || !newPassword || !confirmPassword}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-white font-semibold rounded-lg shadow-lg shadow-teal-600/25 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {isSubmitting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <KeyRound size={18} />
                )}
                {isSubmitting ? 'Menyimpan...' : 'Simpan Password & Masuk'}
              </button>
              
              <button
                type="button"
                onClick={logout}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Batal & Keluar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
