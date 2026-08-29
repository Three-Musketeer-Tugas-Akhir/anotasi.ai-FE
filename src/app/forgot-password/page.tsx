'use client';

import { useState, FormEvent } from 'react';
import { authApi } from '@/features/auth';
import Link from 'next/link';
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await authApi.forgotPassword({ email });
      setIsSuccess(true);
    } catch (err: unknown) {
      // API returns generic success even if email doesn't exist (security)
      // So we only show errors for network/server issues
      const resp = (err as { response?: { data?: { detail?: string } } })?.response;
      setError(resp?.data?.detail || 'Terjadi kesalahan. Coba lagi nanti.');
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
            Lupa Password?
            <br />
            <span className="text-teal-400">Kami Bantu Reset</span>
          </h1>
          <p className="text-slate-300 text-lg leading-relaxed max-w-md">
            Masukkan email yang terdaftar dan kami akan mengirimkan link untuk mengatur ulang password Anda.
          </p>
        </div>
      </div>

      {/* Right Panel */}
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
            {isSuccess ? (
              /* Success State */
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 size={32} className="text-teal-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Terkirim</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Jika email <strong>{email}</strong> terdaftar di sistem kami, Anda akan menerima link
                  untuk mengatur ulang password.
                </p>
                <p className="text-xs text-gray-400 mb-6">
                  Periksa juga folder spam jika tidak menemukan email.
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
                >
                  <ArrowLeft size={16} />
                  Kembali ke Login
                </Link>
              </div>
            ) : (
              /* Form State */
              <>
                <div className="text-center mb-8">
                  <div className="mx-auto w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mb-4">
                    <Mail size={32} className="text-teal-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Lupa Password</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Masukkan email akun Anda untuk menerima link reset
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
                    <label htmlFor="forgot-email" className="text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      id="forgot-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(null); }}
                      placeholder="Masukkan email terdaftar"
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-white font-semibold rounded-lg shadow-lg shadow-teal-600/25 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Mail size={18} />
                    )}
                    {isLoading ? 'Mengirim...' : 'Kirim Link Reset'}
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
            &copy; 2026 Anotasi.ai · Bahasa Isyarat Dataset Platform
          </p>
        </div>
      </div>
    </div>
  );
}
