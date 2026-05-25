'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { authApi } from '@/features/auth';
import Link from 'next/link';
import { Loader2, CheckCircle2, XCircle, Mail, ArrowLeft, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'no-token'>('loading');
  const [message, setMessage] = useState('');

  // Resend state
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('no-token');
      return;
    }

    authApi
      .verifyEmail({ token })
      .then((res) => {
        setStatus('success');
        setMessage(res.message);
      })
      .catch((err: unknown) => {
        setStatus('error');
        const resp = (err as { response?: { data?: { detail?: string } } })?.response;
        setMessage(resp?.data?.detail || 'Token verifikasi tidak valid atau sudah kadaluarsa.');
      });
  }, [token]);

  const handleResend = async () => {
    if (!resendEmail) return;
    setResendLoading(true);
    setResendMessage(null);
    try {
      const res = await authApi.resendVerification({ email: resendEmail });
      setResendMessage(res.message);
    } catch (err: unknown) {
      const resp = (err as { response?: { data?: { detail?: string } } })?.response;
      setResendMessage(resp?.data?.detail || 'Gagal mengirim ulang. Coba lagi nanti.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-teal-600 rounded-lg flex items-center justify-center font-bold text-lg text-white shadow-lg">
            A
          </div>
          <span className="font-bold text-xl tracking-tight text-gray-900">Gestura.ai</span>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8">
          {status === 'loading' && (
            <div className="text-center py-8 space-y-4">
              <Skeleton className="h-12 w-12 rounded-full mx-auto" />
              <Skeleton className="h-7 w-56 mx-auto" />
              <Skeleton className="h-4 w-40 mx-auto" />
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 size={32} className="text-teal-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Terverifikasi!</h2>
              <p className="text-sm text-gray-500 mb-6">{message}</p>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-white font-semibold rounded-lg shadow-lg shadow-teal-600/25 transition-all duration-200"
              >
                Login Sekarang
              </Link>
            </div>
          )}

          {(status === 'error' || status === 'no-token') && (
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                <XCircle size={32} className="text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {status === 'no-token' ? 'Token Tidak Ditemukan' : 'Verifikasi Gagal'}
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                {status === 'no-token'
                  ? 'Link verifikasi tidak valid. Silakan minta link baru.'
                  : message}
              </p>

              {/* Resend verification form */}
              <div className="border-t border-gray-100 pt-6 mt-6">
                <p className="text-sm font-medium text-gray-700 mb-3">Kirim ulang email verifikasi</p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="Email Anda"
                    className="flex-1 px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                  />
                  <button
                    onClick={handleResend}
                    disabled={resendLoading || !resendEmail}
                    className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {resendLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                  </button>
                </div>
                {resendMessage && (
                  <p className="text-xs text-teal-600 mt-2">{resendMessage}</p>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
            >
              <ArrowLeft size={14} />
              Kembali ke Login
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          &copy; 2026 Gestura.ai · SIBI Dataset Platform
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-sm space-y-4 p-8">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-6 w-48 mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
