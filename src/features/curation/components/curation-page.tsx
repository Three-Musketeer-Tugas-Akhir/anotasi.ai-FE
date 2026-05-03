'use client';

import { useState, useEffect, useCallback } from 'react';
import React from 'react';
import {
  Search,
  CheckCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Wand2,
  ShieldCheck,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Loader2,
  FileText,
  Pencil,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import type {
  CurationStatus,
  CurationVideo,
  CurationSegment,
  SlangEntry,
} from '../types';
import { curationApi } from '../curation-api';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// ── Slang Dictionary (visual reference — real normalization is on BE) ──

const SLANG_DICTIONARY: SlangEntry[] = [
  { slang: 'enggak', standard: 'tidak' },
  { slang: 'udah', standard: 'sudah' },
  { slang: 'gak', standard: 'tidak' },
  { slang: 'kayak', standard: 'seperti' },
  { slang: 'gimana', standard: 'bagaimana' },
  { slang: 'emang', standard: 'memang' },
  { slang: 'aja', standard: 'saja' },
  { slang: 'banget', standard: 'sangat' },
  { slang: 'biar', standard: 'agar' },
  { slang: 'kalo', standard: 'kalau' },
  { slang: 'trus', standard: 'terus' },
  { slang: 'nggak', standard: 'tidak' },
  { slang: 'denger', standard: 'dengar' },
  { slang: 'ngomong', standard: 'bicara' },
];

// ── Status Badge Component ──────────────────────────────────────────

function CurationStatusBadge({ status }: { status: CurationStatus }) {
  const configs: Record<CurationStatus, { label: string; color: string; icon: React.ReactNode }> = {
    ANNOTATED: { label: 'Perlu Kurasi', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: <AlertTriangle size={12} /> },
    READY_TO_BE_NORMALIZED: { label: 'Siap Normalisasi', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: <Wand2 size={12} /> },
    NORMALIZING: { label: 'Memproses...', color: 'bg-teal-50 text-teal-700 border-teal-200', icon: <Loader2 size={12} className="animate-spin" /> },
    NORMALIZED: { label: 'Sudah Dinormalisasi', color: 'bg-teal-100 text-teal-800 border-teal-300', icon: <Wand2 size={12} /> },
    READY_TO_EXPORT: { label: 'Siap Export', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 size={12} /> },
  };
  const cfg = configs[status];
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider font-bold border shadow-sm ${cfg.color}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ── Category Badge Component ────────────────────────────────────────

function CategoryBadge({ category }: { category: string | null }) {
  if (!category) return <span className="text-xs text-slate-400 italic">—</span>;
  const color = category === 'SIBI'
    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
    : 'bg-rose-50 text-rose-700 border-rose-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${color}`}>
      {category}
    </span>
  );
}

// ── Main Component ──────────────────────────────────────────────────

export function CurationPage() {
  // ── State ──────────────────────────────────────────────────────────
  const [videos, setVideos] = useState<CurationVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [dictOpen, setDictOpen] = useState(true);
  const [normalizing, setNormalizing] = useState(false);

  // ── Fetch curatable jobs from backend ──────────────────────────────

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const jobs = await curationApi.getCuratableJobs();

      // Map backend jobs → CurationVideo with empty segments initially.
      // Segments are loaded when the user opens a video for curation.
      const mapped: CurationVideo[] = jobs.map((job) => {
        // Derive CurationStatus from backend curation_status field
        let curationStatus: CurationStatus = 'ANNOTATED';
        const cs = job.curation_status;
        if (cs === 'READY_TO_EXPORT') curationStatus = 'READY_TO_EXPORT';
        else if (cs === 'NORMALIZED') curationStatus = 'NORMALIZED';
        else if (cs === 'NORMALIZING') curationStatus = 'NORMALIZING';
        else if (cs === 'READY_TO_BE_NORMALIZED') curationStatus = 'READY_TO_BE_NORMALIZED';

        return {
          id: job.job_id,
          filename: job.video_title || 'Untitled Video',
          source: extractSource(job.video_title),
          category: (job.category === 'SIBI' || job.category === 'BISINDO') ? job.category : null,
          segmentCount: 0, // Will be updated when segments are loaded
          status: curationStatus,
          segments: [],
        };
      });

      setVideos(mapped);
    } catch (err) {
      console.error('Failed to fetch curatable jobs:', err);
      setLoadError('Gagal memuat daftar video untuk kurasi. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // ── Load segments when opening a video ─────────────────────────────

  const loadSegments = useCallback(async (videoId: string) => {
    const video = videos.find((v) => v.id === videoId);
    if (!video) return;

    // Only fetch if segments haven't been loaded yet
    if (video.segments.length > 0) {
      setActiveVideoId(videoId);
      return;
    }

    try {
      const segments = await curationApi.getJobSegments(videoId);
      setVideos((prev) =>
        prev.map((v) =>
          v.id === videoId
            ? { ...v, segments, segmentCount: segments.length }
            : v,
        ),
      );
      setActiveVideoId(videoId);
    } catch (err) {
      console.error('Failed to load segments for video:', videoId, err);
      toast.error('Gagal Memuat Kalimat', {
        description: 'Tidak dapat memuat kalimat untuk video ini.',
      });
    }
  }, [videos]);

  // ── Derived state ──────────────────────────────────────────────────

  const activeVideo = videos.find((v) => v.id === activeVideoId) ?? null;
  const filtered = videos.filter(
    (v) =>
      !search ||
      v.filename.toLowerCase().includes(search.toLowerCase()) ||
      v.source.toLowerCase().includes(search.toLowerCase()),
  );

  const counts = {
    needsCuration: videos.filter((v) => v.status === 'ANNOTATED' || v.status === 'NORMALIZING').length,
    normalized: videos.filter((v) => v.status === 'NORMALIZED').length,
    approved: videos.filter((v) => v.status === 'READY_TO_EXPORT').length,
  };

  // ── Handlers ───────────────────────────────────────────────────────

  const handleNormalize = useCallback(async (videoId: string) => {
    setNormalizing(true);
    setVideos((prev) => prev.map((v) => (v.id === videoId ? { ...v, status: 'NORMALIZING' as CurationStatus } : v)));

    const targetVideo = videos.find((v) => v.id === videoId);
    if (!targetVideo) { setNormalizing(false); return; }

    try {
      // Use the new job-level endpoint
      const normalizedItems = await curationApi.autoNormalize(videoId);
      setVideos((prev) =>
        prev.map((v) =>
          v.id === videoId
            ? { ...v, status: 'NORMALIZED' as CurationStatus, segments: normalizedItems, segmentCount: normalizedItems.length }
            : v,
        ),
      );
      toast('Normalisasi Selesai', {
        description: `${normalizedItems.length} kalimat berhasil dinormalisasi.`,
      });
    } catch (err) {
      console.error('Normalization failed:', err);
      setVideos((prev) => prev.map((v) => (v.id === videoId ? { ...v, status: 'ANNOTATED' as CurationStatus } : v)));
      toast.error('Normalisasi Gagal', {
        description: 'Terjadi kesalahan saat memproses normalisasi teks.',
      });
    } finally {
      setNormalizing(false);
    }
  }, [videos]);

  const handleSegmentEdit = useCallback((videoId: string, segmentId: string, field: 'normalizedText' | 'normalizedGlosa', newText: string) => {
    setVideos((prev) =>
      prev.map((v) => {
        if (v.id !== videoId) return v;
        return {
          ...v,
          segments: v.segments.map((seg) =>
            seg.id === segmentId ? { ...seg, [field]: newText, isEdited: true } : seg,
          ),
        };
      }),
    );
  }, []);

  const handleApprove = useCallback(async (videoId: string) => {
    try {
      const video = videos.find((v) => v.id === videoId);
      if (!video) return;

      // Apply normalization overrides if any, or just persist the auto-normalized state
      if (video.segments.some(s => s.normalizedText !== undefined)) {
        await curationApi.applyNormalization(videoId, video.segments);
      }

      await curationApi.approveVideo(videoId);
      setVideos((prev) =>
        prev.map((v) =>
          v.id === videoId ? { ...v, status: 'READY_TO_EXPORT' as CurationStatus } : v,
        ),
      );
      setActiveVideoId(null);
      toast('Video Disetujui', {
        description: 'Dataset telah dikunci dan siap untuk di-export.',
      });
    } catch (err) {
      console.error('Failed to approve video:', err);
      toast.error('Gagal Menyetujui', {
        description: 'Terjadi kesalahan saat menyetujui video. Pastikan Anda memiliki akses curator/admin.',
      });
    }
  }, [videos]);

  // ── Loading State ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 size={32} className="text-teal-600 animate-spin mx-auto" />
          <p className="text-sm text-slate-500">Memuat video untuk kurasi...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <AlertTriangle size={32} className="text-red-400 mx-auto" />
          <p className="text-sm text-slate-600">{loadError}</p>
          <button
            onClick={fetchVideos}
            className="flex items-center gap-2 mx-auto px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <RefreshCw size={14} /> Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  // ── ListView ───────────────────────────────────────────────────────

  if (!activeVideo) {
    return (
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <CheckCircle className="text-teal-600" size={24} />
              Curation Hub
            </h1>
            <p className="text-sm text-slate-500 mt-1">Normalisasi teks transkripsi sebelum di-export sebagai dataset final.</p>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <div className="bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm">
              <AlertTriangle size={14} /> {counts.needsCuration} Perlu Kurasi
            </div>
            <div className="bg-teal-50 text-teal-700 border border-teal-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm">
              <Wand2 size={14} /> {counts.normalized} Normalized
            </div>
            <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm">
              <CheckCircle2 size={14} /> {counts.approved} Approved
            </div>
            <button
              onClick={fetchVideos}
              className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
              title="Refresh data"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              placeholder="Cari video atau sumber..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm transition-all"
            />
          </div>
        </div>

        {videos.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
            <CheckCircle2 size={40} className="mx-auto text-slate-300 mb-3" />
            <h3 className="text-lg font-semibold text-slate-700">Belum Ada Video untuk Kurasi</h3>
            <p className="text-sm text-slate-500 mt-1">
              Video akan muncul di sini setelah pipeline selesai dan semua review anotasi disetujui.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-base font-bold text-slate-800">Video untuk Kurasi ({filtered.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <Table className="w-full text-left">
                <TableHeader>
                  <TableRow className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <TableHead className="text-center w-12">#</TableHead>
                    <TableHead>Video</TableHead>
                    <TableHead className="w-32">Kategori</TableHead>
                    <TableHead className="w-28 text-center">Kalimat</TableHead>
                    <TableHead className="w-48 text-center">Status</TableHead>
                    <TableHead className="w-56 text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-sm">
                  {filtered.map((v, i) => (
                    <TableRow key={v.id} className={`transition-colors ${v.status === 'READY_TO_EXPORT' ? 'bg-emerald-50/30' : v.status === 'NORMALIZED' ? 'bg-teal-50/20' : ''}`}>
                      <TableCell className="text-center text-slate-400 font-medium">{i + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-slate-400 flex-shrink-0" />
                          <span className="font-semibold text-slate-700 truncate max-w-[300px]">{v.filename}</span>
                        </div>
                      </TableCell>
                      <TableCell><CategoryBadge category={v.category} /></TableCell>
                      <TableCell className="text-center font-mono text-slate-600">
                        {v.segmentCount > 0 ? v.segmentCount : '—'}
                      </TableCell>
                      <TableCell className="text-center"><CurationStatusBadge status={v.status} /></TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          {v.status === 'ANNOTATED' && (
                            <>
                              <button onClick={() => handleNormalize(v.id)} disabled={normalizing} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-teal-700 border border-teal-200 rounded-md hover:bg-teal-50 transition-colors disabled:opacity-50">
                                <Wand2 size={14} /> Auto-Norm
                              </button>
                              <button onClick={() => loadSegments(v.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-teal-600 text-white rounded-md hover:bg-teal-700 shadow-sm transition-colors">
                                <Pencil size={14} /> Kurasi
                              </button>
                            </>
                          )}
                          {v.status === 'NORMALIZING' && (
                            <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-teal-600">
                              <Loader2 size={14} className="animate-spin" /> Memproses...
                            </span>
                          )}
                          {v.status === 'NORMALIZED' && (
                            <button onClick={() => loadSegments(v.id)} className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-teal-600 text-white rounded-md hover:bg-teal-700 shadow-sm transition-colors w-full justify-center">
                              <Pencil size={14} /> Review & Approve
                            </button>
                          )}
                          {v.status === 'READY_TO_EXPORT' && (
                            <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-md w-full justify-center">
                              <CheckCircle2 size={14} /> Approved
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-slate-400 font-medium py-12">Tidak ada video yang cocok dengan pencarian.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Workspace View ─────────────────────────────────────────────────

  const hasNormalized = activeVideo.segments.some((s) => s.normalizedText?.length > 0 || s.normalizedGlosa?.length > 0);
  const isApproved = activeVideo.status === 'READY_TO_EXPORT';
  const emptyNormalizedCount = activeVideo.segments.filter((s) => (s.normalizedText === '' || s.normalizedGlosa === '') && hasNormalized).length;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white shadow-sm z-10 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => setActiveVideoId(null)} className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors">
            <ArrowLeft size={16} /> Kembali
          </button>
          <div className="w-px h-6 bg-slate-200"></div>
          <div>
            <h2 className="font-bold text-slate-800 text-base">{activeVideo.filename}</h2>
            <p className="text-[11px] font-medium text-slate-500">
              {activeVideo.category && <><CategoryBadge category={activeVideo.category} /> · </>}
              {activeVideo.segmentCount} kalimat
            </p>
          </div>
          <div className="ml-2"><CurationStatusBadge status={activeVideo.status} /></div>
        </div>
        <div className="flex items-center gap-3">
          {!isApproved && (
            <button
              onClick={() => handleNormalize(activeVideo.id)}
              disabled={normalizing}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-bold border rounded-lg transition-all ${normalizing ? 'text-slate-400 border-slate-200 bg-slate-50 cursor-not-allowed' : 'text-teal-700 border-teal-200 bg-white hover:bg-teal-50 shadow-sm'}`}
            >
              {normalizing ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
              {normalizing ? 'Memproses...' : 'Auto-Normalize'}
            </button>
          )}
          {hasNormalized && !isApproved && (
            <button onClick={() => handleApprove(activeVideo.id)} className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 rounded-lg font-bold text-sm shadow-sm transition-colors">
              <ShieldCheck size={18} /> Approve
            </button>
          )}
        </div>
      </div>

      {/* Empty segments warning */}
      {emptyNormalizedCount > 0 && hasNormalized && (
        <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
          <AlertTriangle size={14} className="text-amber-600 flex-shrink-0" />
          <p className="text-xs text-amber-700">
            <strong>{emptyNormalizedCount} kalimat</strong> menghasilkan teks kosong setelah normalisasi (kemungkinan hanya berisi filler words). Anda dapat mengedit manual sebelum approve.
          </p>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden bg-slate-100/50">
        {/* Left: Editor Table */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {activeVideo.segments.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-3">
                <Loader2 size={24} className="text-teal-600 animate-spin mx-auto" />
                <p className="text-sm text-slate-500">Memuat kalimat transkrip...</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <FileText size={18} className="text-teal-600" />
                  Perbandingan Teks — Before & After
                </h2>
                <p className="text-xs text-slate-500 mt-1">Kolom &quot;After&quot; bisa diedit manual jika hasil normalisasi bot kurang tepat.</p>
              </div>
              
              <div className="overflow-x-auto">
                <Table className="w-full text-left">
                  <TableHeader>
                    <TableRow className="bg-slate-50 text-xs font-bold uppercase tracking-wider">
                      <TableHead className="text-center w-12 text-slate-400">#</TableHead>
                      <TableHead className="w-[45%]">
                        <span className="flex items-center gap-1.5 text-slate-700"><FileText size={14} /> Ground Truth Transkrip</span>
                      </TableHead>
                      <TableHead className="w-[45%]">
                        <span className="flex items-center gap-1.5 text-slate-700"><Wand2 size={14} /> Glosa (Label Anotasi)</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-sm">
                    {activeVideo.segments.map((seg, i) => (
                      <TableRow key={seg.id} className={seg.isEdited ? 'bg-teal-50/10' : ''}>
                        <TableCell className="text-center text-slate-400 font-mono align-top pt-5">{i + 1}</TableCell>
                        
                        {/* Transcript Column */}
                        <TableCell className="align-top">
                          <div className="space-y-2">
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-sm text-slate-600 leading-relaxed">
                              <div className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><ArrowRight size={10} /> Asli</div>
                              {seg.originalText || <span className="text-slate-400 italic">Teks kosong</span>}
                            </div>
                            {hasNormalized && (
                              <div className="relative">
                                <div className="text-[10px] font-bold text-teal-600 uppercase mb-1 flex items-center gap-1"><CheckCircle2 size={10} /> Normalisasi</div>
                                <textarea
                                  value={seg.normalizedText}
                                  onChange={(e) => handleSegmentEdit(activeVideo.id, seg.id, 'normalizedText', e.target.value)}
                                  disabled={isApproved}
                                  className={`w-full min-h-[64px] p-3 text-sm leading-relaxed rounded-lg resize-none outline-none transition-all border ${
                                    seg.normalizedText === ''
                                      ? 'border-amber-300 bg-amber-50/30'
                                      : seg.isEdited
                                      ? 'border-teal-400 bg-teal-50/50 focus:ring-2 focus:ring-teal-500/30'
                                      : 'border-slate-200 bg-white focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20'
                                  } ${isApproved ? 'opacity-70 cursor-not-allowed bg-slate-100 text-slate-500' : 'text-slate-800'}`}
                                />
                              </div>
                            )}
                          </div>
                        </TableCell>

                        {/* Glosa Column */}
                        <TableCell className="align-top">
                          <div className="space-y-2">
                            <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-3.5 text-sm text-amber-800 leading-relaxed">
                              <div className="text-[10px] font-bold text-amber-600/70 uppercase mb-1 flex items-center gap-1"><ArrowRight size={10} /> Asli</div>
                              {seg.originalGlosa || <span className="text-amber-600/50 italic">Teks kosong</span>}
                            </div>
                            {hasNormalized && (
                              <div className="relative">
                                <div className="text-[10px] font-bold text-teal-600 uppercase mb-1 flex items-center gap-1"><CheckCircle2 size={10} /> Normalisasi (SIBI)</div>
                                <textarea
                                  value={seg.normalizedGlosa}
                                  onChange={(e) => handleSegmentEdit(activeVideo.id, seg.id, 'normalizedGlosa', e.target.value)}
                                  disabled={isApproved}
                                  className={`w-full min-h-[64px] p-3 text-sm leading-relaxed rounded-lg resize-none outline-none transition-all border ${
                                    seg.normalizedGlosa === ''
                                      ? 'border-amber-300 bg-amber-50/30'
                                      : seg.isEdited
                                      ? 'border-teal-400 bg-teal-50/50 focus:ring-2 focus:ring-teal-500/30'
                                      : 'border-slate-200 bg-white focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20'
                                  } ${isApproved ? 'opacity-70 cursor-not-allowed bg-slate-100 text-slate-500' : 'text-slate-800'}`}
                                />
                              </div>
                            )}
                          </div>
                        </TableCell>

                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        {/* Right: Slang Dictionary Sidebar */}
        <div className={`border-l border-slate-200 bg-white transition-all duration-300 flex flex-col flex-shrink-0 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.02)] ${dictOpen ? 'w-[320px]' : 'w-14'}`}>
          <button
            onClick={() => setDictOpen(!dictOpen)}
            className="flex items-center gap-3 px-4 py-4 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors border-b border-slate-100 outline-none"
          >
            <BookOpen size={18} className="text-teal-600 flex-shrink-0" />
            {dictOpen && <span className="flex-1 text-left whitespace-nowrap">Kamus Slang → Baku</span>}
            {dictOpen ? <ChevronDown size={16} className="text-slate-400"/> : <ChevronUp size={16} className="text-slate-400 mx-auto"/>}
          </button>

          {dictOpen && (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-slate-50/50">
              <div className="space-y-1.5">
                {SLANG_DICTIONARY.map((entry) => (
                  <div key={entry.slang} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white border border-slate-200 text-xs shadow-sm">
                    <span className="text-amber-600 font-mono font-medium line-through decoration-amber-600/40">{entry.slang}</span>
                    <ArrowRight size={12} className="text-slate-300 mx-2 flex-shrink-0" />
                    <span className="text-teal-700 font-mono font-bold">{entry.standard}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <p className="text-[10px] text-blue-700 font-medium leading-relaxed">
                  <span className="font-bold block mb-1 text-blue-800">Info:</span>
                  Normalisasi otomatis dilakukan oleh backend. Kamus ini hanyalah referensi visual.
                  Aturan tambahan diterapkan untuk kategori SIBI (pemetaan entitas, ejaan jari).
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────

/** Extract news source from video title (heuristic) */
function extractSource(title: string | null): string {
  if (!title) return 'Unknown';
  const lower = title.toLowerCase();
  if (lower.includes('inews')) return 'iNews';
  if (lower.includes('tvri')) return 'TVRI';
  if (lower.includes('metro')) return 'MetroTV';
  if (lower.includes('tvone') || lower.includes('tv one')) return 'TVOne';
  if (lower.includes('kompas')) return 'KompasTV';
  if (lower.includes('trans7')) return 'Trans7';
  if (lower.includes('trans')) return 'TransTV';
  if (lower.includes('sctv')) return 'SCTV';
  if (lower.includes('rcti')) return 'RCTI';
  if (lower.includes('antv')) return 'ANTV';
  return 'Berita';
}
