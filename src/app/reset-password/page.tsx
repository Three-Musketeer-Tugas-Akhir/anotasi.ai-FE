'use client';

import { useState, FormEvent, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { authApi } from '@/features/auth';
import Link from 'next/link';
import { Loader2, Lock, ArrowLeft, CheckCircle2, Eye, EyeOff, ShieldCheck } from 'lucide-react';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';

  const [token] = useState(tokenFromUrl);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Password strength checks
  const checks = {
    length: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    lowercase: /[a-z]/.test(newPassword),
    digit: /\d/.test(newPassword),
    special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword),
  };
  const allValid = Object.values(checks).every(Boolean);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!allValid || !passwordsMatch) return;

    setError(null);
    setIsLoading(true);
    try {
      await authApi.resetPassword({ token, new_password: newPassword });
      setIsSuccess(true);
    } catch (err: unknown) {
      const resp = (err as { response?: { data?: { detail?: string } } })?.response;
      setError(resp?.data?.detail || 'Token tidak valid atau sudah kadaluarsa.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Hero Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-teal-900 to-slate-900 relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-teal-400/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-teal-600/10 rounded-full blur-2xl" />

        <div className="relative z-10 flex flex-col justify-center px-16 w-full">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl flex items-center justify-center font-bold text-xl text-white shadow-xl shadow-teal-900/40">
              A
            </div>
            <span className="text-white font-bold text-2xl tracking-tight">Anotasi.ai</span>
          </div>

          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Atur Ulang
            <br />
            <span className="text-teal-400">Password Anda</span>
          </h1>
          <p className="text-slate-300 text-lg leading-relaxed max-w-md">
            Buat password baru yang kuat untuk melindungi akun Anda.
          </p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-teal-600 rounded-lg flex items-center justify-center font-bold text-lg text-white shadow-lg">
              A
            </div>
            <span className="font-bold text-xl tracking-tight text-gray-900">Anotasi.ai</span>
          </div>

          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8">
            {isSuccess ? (
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 size={32} className="text-teal-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Password Berhasil Diubah</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Password Anda telah diperbarui. Silakan login dengan password baru.
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-white font-semibold rounded-lg shadow-lg shadow-teal-600/25 transition-all duration-200"
                >
                  <Lock size={18} />
                  Login Sekarang
                </Link>
              </div>
            ) : !token ? (
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                  <ShieldCheck size={32} className="text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Token Tidak Ditemukan</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Link reset password tidak valid. Silakan minta link baru.
                </p>
                <Link
                  href="/forgot-password"
                  className="inline-flex items-center gap-2 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
                >
                  <ArrowLeft size={16} />
                  Minta Link Baru
                </Link>
              </div>
            ) : (
              <>
                <div className="text-center mb-8">
                  <div className="mx-auto w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mb-4">
                    <Lock size={32} className="text-teal-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Reset Password</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Buat password baru untuk akun Anda
                  </p>
                </div>

                {error && (
                  <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
                    <span className="mt-0.5">⚠️</span>
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600 text-xs">✕</button>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <label htmlFor="new-password" className="text-sm font-medium text-gray-700">
                      Password Baru
                    </label>
                    <div className="relative">
                      <input
                        id="new-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => { setNewPassword(e.target.value); setError(null); }}
                        placeholder="Masukkan password baru"
                        className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Password strength indicators */}
                  {newPassword.length > 0 && (
                    <div className="space-y-1.5 p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <p className="text-xs font-medium text-gray-500 mb-2">Persyaratan password:</p>
                      {[
                        { key: 'length', label: 'Minimal 8 karakter' },
                        { key: 'uppercase', label: 'Huruf besar (A-Z)' },
                        { key: 'lowercase', label: 'Huruf kecil (a-z)' },
                        { key: 'digit', label: 'Angka (0-9)' },
                        { key: 'special', label: 'Karakter spesial (!@#$...)' },
                      ].map(({ key, label }) => (
                        <div key={key} className="flex items-center gap-2 text-xs">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center ${checks[key as keyof typeof checks] ? 'bg-teal-100 text-teal-600' : 'bg-gray-200 text-gray-400'}`}>
                            {checks[key as keyof typeof checks] ? '✓' : '·'}
                          </div>
                          <span className={checks[key as keyof typeof checks] ? 'text-teal-700' : 'text-gray-400'}>{label}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label htmlFor="confirm-password" className="text-sm font-medium text-gray-700">
                      Konfirmasi Password
                    </label>
                    <input
                      id="confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                      placeholder="Ketik ulang password baru"
                      className={`w-full px-4 py-3 rounded-lg border text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
                        confirmPassword.length > 0
                          ? passwordsMatch
                            ? 'border-teal-300 bg-teal-50/50 focus:ring-teal-500/20 focus:border-teal-500'
                            : 'border-red-300 bg-red-50/50 focus:ring-red-500/20 focus:border-red-500'
                          : 'border-gray-200 bg-gray-50 focus:ring-teal-500/20 focus:border-teal-500'
                      }`}
                    />
                    {confirmPassword.length > 0 && !passwordsMatch && (
                      <p className="text-xs text-red-500">Password tidak sama</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !allValid || !passwordsMatch}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-white font-semibold rounded-lg shadow-lg shadow-teal-600/25 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <ShieldCheck size={18} />
                    )}
                    {isLoading ? 'Menyimpan...' : 'Simpan Password Baru'}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
                  >
                    <ArrowLeft size={14} />
                    Kembali ke Login
                  </Link>
                </div>
              </>
            )}
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            &copy; 2026 Anotasi.ai · SIBI Dataset Platform
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 size={32} className="animate-spin text-teal-600" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
