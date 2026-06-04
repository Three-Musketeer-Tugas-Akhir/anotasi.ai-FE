'use client';

import { useState, FormEvent } from 'react';
import { useAuth } from '@/features/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2, LogIn, Eye, EyeOff } from 'lucide-react';
import brandLogo from '../icon.png';

export default function LoginPage() {
  const { login, error, clearError, isLoading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isLoading || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await login({ email, password });
      router.push('/');
    } catch {
      // error is already set in auth context
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white selection:bg-emerald-500/30">
      {/* Left Hero Panel */}
      <div className="hidden lg:flex lg:w-5/12 bg-slate-950 relative overflow-hidden flex-col justify-between p-12">
        {/* Abstract Background Effects */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-emerald-600/20 blur-[120px]" />
          <div className="absolute top-[60%] -right-[20%] w-[60%] h-[60%] rounded-full bg-teal-600/20 blur-[100px]" />
          <div className="absolute bottom-0 left-[20%] w-[50%] h-[50%] rounded-full bg-emerald-900/40 blur-[100px]" />
          {/* Subtle grid pattern overlay */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        </div>

        {/* Top Spacer to push content down */}
        <div className="relative z-10"></div>

        {/* Main Hero Content */}
        <div className="relative z-10 space-y-8 max-w-lg">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-[1.15] tracking-tight">
            Orkestrasi Dataset <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
              SIBI Terpusat
            </span>
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed">
            Sistem terpadu untuk klasifikasi, pemrosesan, anotasi, dan kurasi dataset Sistem Isyarat Bahasa Indonesia dengan teknologi AI mutakhir.
          </p>
        </div>

        {/* Footer info on left panel */}
        <div className="relative z-10 text-slate-500 text-sm font-medium">
          &copy; {new Date().getFullYear()} Gestura.ai. All rights reserved.
        </div>
      </div>

      {/* Right Login Panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 lg:p-16 bg-slate-50 relative">
        <div className="w-full max-w-md">
          {/* Main Card */}
          <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-8 sm:p-10">
            {/* Brand Logo - Replacing the text-based logo */}
            <div className="flex justify-center mb-10">
              <Image 
                src={brandLogo} 
                alt="Gestura.ai Logo" 
                className="h-24 sm:h-28 w-auto object-contain"
                priority
              />
            </div>

            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Selamat Datang Kembali</h2>
              <p className="text-sm text-slate-500 mt-2">
                Silakan masuk ke akun Anda untuk melanjutkan
              </p>
            </div>

            {/* Error display */}
            {error && (
              <div className="mb-6 p-4 bg-red-50/50 border border-red-100 rounded-2xl text-sm text-red-600 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <span className="mt-0.5 shrink-0 bg-red-100 text-red-600 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">!</span>
                <span className="leading-relaxed">{error}</span>
                <button onClick={clearError} className="ml-auto text-red-400 hover:text-red-700 transition-colors">✕</button>
              </div>
            )}

            <div className="space-y-5" onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSubmit(e as any);
              }
            }}>
              {/* Email */}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-semibold text-slate-700">
                  Alamat Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearError(); }}
                  placeholder="nama@email.com"
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-semibold text-slate-700">
                    Kata Sandi
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                  >
                    Lupa Sandi?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); clearError(); }}
                    placeholder="••••••••"
                    className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isLoading || isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-[0_4px_12px_rgb(5,150,105,0.25)] hover:shadow-[0_6px_16px_rgb(5,150,105,0.3)] transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <LogIn size={18} />
                  )}
                  {isSubmitting ? 'Memproses...' : 'Masuk ke Akun'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
