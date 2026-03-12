'use client';

import { useState, FormEvent } from 'react';
import { useAuth } from '@/features/auth';
import type { UserRole } from '@/features/auth';
import { USER_ROLE_LABELS } from '@/features/auth/types';
import { useRouter } from 'next/navigation';
import { Loader2, UserPlus, Eye, EyeOff, ChevronDown } from 'lucide-react';

const SELECTABLE_ROLES: UserRole[] = ['annotator', 'curator'];

export default function RegisterPage() {
  const { register, error, clearError, isLoading } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('annotator');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    // Client-side validation
    if (password !== confirmPassword) {
      setLocalError('Password dan konfirmasi password tidak cocok.');
      return;
    }

    try {
      await register({ username, password, full_name: fullName, role });
      router.push('/');
    } catch {
      // error is already set in auth context
    }
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen flex">
      {/* Left Hero Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-teal-900 to-slate-900 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-12 left-12 w-80 h-80 bg-teal-400/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-teal-600/10 rounded-full blur-2xl" />

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
            Bergabung Bersama
            <br />
            <span className="text-teal-400">Tim Dataset SIBI</span>
          </h1>
          <p className="text-slate-300 text-lg leading-relaxed max-w-md">
            Daftarkan akun Anda untuk mulai berkontribusi dalam anotasi dan kurasi
            dataset Sistem Isyarat Bahasa Indonesia.
          </p>

          {/* Role Info */}
          <div className="mt-12 space-y-4">
            <h3 className="text-sm font-semibold text-teal-400 uppercase tracking-wider">Peran Tersedia</h3>
            <div className="space-y-3">
              {([
                { role: 'Annotator', desc: 'Menginput glosa SIBI dan melakukan alignment video-teks.' },
                { role: 'Curator', desc: 'Memvalidasi dan menormalisasi teks sebelum di-export.' },
              ] as const).map((r) => (
                <div key={r.role} className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-sm font-semibold text-white">{r.role}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{r.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Register Panel */}
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
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Buat Akun Baru</h2>
              <p className="text-sm text-gray-500 mt-1">
                Lengkapi data di bawah untuk mendaftarkan akun Anda
              </p>
            </div>

            {/* Error display */}
            {displayError && (
              <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
                <span className="mt-0.5">⚠️</span>
                <span>{displayError}</span>
                <button onClick={() => { setLocalError(null); clearError(); }} className="ml-auto text-red-400 hover:text-red-600 text-xs">✕</button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label htmlFor="fullName" className="text-sm font-medium text-gray-700">
                  Nama Lengkap
                </label>
                <input
                  id="fullName"
                  type="text"
                  required
                  minLength={2}
                  value={fullName}
                  onChange={(e) => { setFullName(e.target.value); clearError(); }}
                  placeholder="Masukkan nama lengkap"
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                />
              </div>

              {/* Username */}
              <div className="space-y-1.5">
                <label htmlFor="reg-username" className="text-sm font-medium text-gray-700">
                  Username
                </label>
                <input
                  id="reg-username"
                  type="text"
                  required
                  minLength={3}
                  maxLength={50}
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); clearError(); }}
                  placeholder="Pilih username unik"
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                />
              </div>

              {/* Role Select */}
              <div className="space-y-1.5">
                <label htmlFor="role" className="text-sm font-medium text-gray-700">
                  Peran
                </label>
                <div className="relative">
                  <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full appearance-none px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all pr-10"
                  >
                    {SELECTABLE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {USER_ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="reg-password" className="text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setLocalError(null); clearError(); }}
                    placeholder="Minimal 6 karakter"
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

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                  Konfirmasi Password
                </label>
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setLocalError(null); }}
                  placeholder="Ketik ulang password"
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-white font-semibold rounded-lg shadow-lg shadow-teal-600/25 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {isLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <UserPlus size={18} />
                )}
                {isLoading ? 'Mendaftarkan...' : 'Daftar'}
              </button>
            </form>

            {/* Login link */}
            <p className="text-center text-sm text-gray-500 mt-6">
              Sudah punya akun?{' '}
              <a
                href="/login"
                className="text-teal-600 font-semibold hover:text-teal-700 transition-colors"
              >
                Masuk di sini
              </a>
            </p>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 mt-6">
            &copy; 2026 Anotasi.ai · SIBI Dataset Platform
          </p>
        </div>
      </div>
    </div>
  );
}
