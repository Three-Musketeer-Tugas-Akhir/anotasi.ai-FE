'use client';

import { useState, useCallback } from 'react';
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
} from 'lucide-react';
import type {
  CurationStatus,
  CurationVideo,
  CurationSegment,
  SlangEntry,
} from '../types';
import { curationApi } from '../curation-api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// ── Mock Data ─────────────────────────────────────────────────────

const MOCK_SLANG_DICTIONARY: SlangEntry[] = [
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

const createSegments = (
  pairs: [string, string][],
): CurationSegment[] =>
  pairs.map(([orig, norm], i) => ({
    id: `seg-${i + 1}`,
    originalText: orig,
    normalizedText: norm,
    isEdited: false,
  }));

const INITIAL_MOCK_VIDEOS: CurationVideo[] = [
  {
    id: 'cv-1',
    filename: '0_[FULL] 29 Korban Kapal Tenggelam.mp4',
    source: 'iNews',
    segmentCount: 4,
    status: 'ANNOTATED',
    segments: createSegments([
      ['Pukul 7 pagi, kapal mulai tenggelam.', ''],
      ['Korban berjumlah 1, 2, 3, 4, 5, 6, 7 orang.', ''],
      ['RP 10 titik 00 untuk biaya evakuasi.', ''],
      ['Enggak ada yang udah siap kayak gitu.', ''],
    ]),
  },
  {
    id: 'cv-2',
    filename: 'Sidang Kabinet Paripurna.mp4',
    source: 'TVRI',
    segmentCount: 3,
    status: 'ANNOTATED',
    segments: createSegments([
      ['Rapat dimulai Pukul 0.07.00 di Istana.', ''],
      ['Anggaran sebesar RP 10 titik 00 miliar.', ''],
      ['Presiden bilang, "Udah enggak bisa ditunda lagi."', ''],
    ]),
  },
  {
    id: 'cv-3',
    filename: 'Berita Utama Siang.mp4',
    source: 'MetroTV',
    segmentCount: 3,
    status: 'NORMALIZED',
    segments: createSegments([
      ['Cuaca Ekstrem melanda 5 provinsi.', 'cuaca ekstrem melanda 5 provinsi.'],
      ['Korban berjumlah 1, 2, 3 orang.', 'korban berjumlah 123 orang.'],
      ['Bantuan senilai RP 10 titik 00 juta.', 'bantuan senilai 10.000 juta rupiah.'],
    ]),
  },
  {
    id: 'cv-4',
    filename: 'Breaking News Gempa.mp4',
    source: 'TVOne',
    segmentCount: 2,
    status: 'READY_TO_EXPORT',
    segments: createSegments([
      ['gempa berkekuatan 5,6 magnitudo.', 'gempa berkekuatan 5,6 magnitudo.'],
      ['warga diminta tidak panik.', 'warga diminta tidak panik.'],
    ]),
  },
];

function CurationStatusBadge({ status }: { status: CurationStatus }) {
  const configs: Record<CurationStatus, { label: string; color: string; icon: React.ReactNode }> = {
    ANNOTATED: { label: 'Perlu Kurasi', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: <AlertTriangle size={12} /> },
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

export function CurationPage() {
  const [videos, setVideos] = useState<CurationVideo[]>(INITIAL_MOCK_VIDEOS);
  const [search, setSearch] = useState('');
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [dictOpen, setDictOpen] = useState(true);
  const [normalizing, setNormalizing] = useState(false);

  const activeVideo = videos.find((v) => v.id === activeVideoId) ?? null;
  const filtered = videos.filter(v => !search || v.filename.toLowerCase().includes(search.toLowerCase()) || v.source.toLowerCase().includes(search.toLowerCase()));

  const counts = {
    needsCuration: videos.filter((v) => v.status === 'ANNOTATED' || v.status === 'NORMALIZING').length,
    normalized: videos.filter((v) => v.status === 'NORMALIZED').length,
    approved: videos.filter((v) => v.status === 'READY_TO_EXPORT').length,
  };

  const handleNormalize = useCallback(async (videoId: string) => {
    setNormalizing(true);
    setVideos(prev => prev.map(v => (v.id === videoId ? { ...v, status: 'NORMALIZING' } : v)));
    
    const targetVideo = videos.find(v => v.id === videoId);
    if (!targetVideo) { setNormalizing(false); return; }

    try {
      // Intentionally using the API logic that was built
      const normalizedItems = await curationApi.normalizeSegments(targetVideo.segments);
      setVideos(prev => prev.map(v => v.id === videoId ? { ...v, status: 'NORMALIZED', segments: normalizedItems } : v));
    } catch (err) {
      setVideos(prev => prev.map(v => v.id === videoId ? { ...v, status: 'ANNOTATED' } : v));
    } finally {
      setNormalizing(false);
    }
  }, [videos]);

  const handleSegmentEdit = useCallback((videoId: string, segmentId: string, newText: string) => {
    setVideos(prev => prev.map(v => {
      if (v.id !== videoId) return v;
      return { ...v, segments: v.segments.map(seg => seg.id === segmentId ? { ...seg, normalizedText: newText, isEdited: true } : seg) };
    }));
  }, []);

  const handleApprove = useCallback(async (videoId: string) => {
    try {
      await curationApi.approveVideo(videoId);
      setVideos((prev) =>
        prev.map((v) =>
          v.id === videoId ? { ...v, status: 'READY_TO_EXPORT' as CurationStatus } : v,
        ),
      );
      setActiveVideoId(null);
    } catch (e) {
      console.error("Failed to approve video", e);
    }
  }, []);

  const handleApproveAll = useCallback(() => {
    setVideos(prev => prev.map(v => v.status === 'NORMALIZED' ? { ...v, status: 'READY_TO_EXPORT' } : v));
  }, []);

  // --- Curation ListView ---
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
          <div className="ml-auto">
            {counts.normalized > 0 && (
              <button onClick={handleApproveAll} className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-lg font-semibold text-sm shadow-sm transition-colors">
                <ShieldCheck size={16} /> Approve All ({counts.normalized})
              </button>
            )}
          </div>
        </div>

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
                  <TableHead className="w-32">Sumber</TableHead>
                  <TableHead className="w-28 text-center">Segmen</TableHead>
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
                    <TableCell><span className="bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-1 rounded text-xs font-semibold">{v.source}</span></TableCell>
                    <TableCell className="text-center font-mono text-slate-600">{v.segmentCount}</TableCell>
                    <TableCell className="text-center"><CurationStatusBadge status={v.status} /></TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        {v.status === 'ANNOTATED' && (
                          <>
                            <button onClick={() => handleNormalize(v.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-teal-700 border border-teal-200 rounded-md hover:bg-teal-50 transition-colors">
                              <Wand2 size={14} /> Auto-Norm
                            </button>
                            <button onClick={() => setActiveVideoId(v.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-teal-600 text-white rounded-md hover:bg-teal-700 shadow-sm transition-colors">
                              <Pencil size={14} /> Kurasi
                            </button>
                          </>
                        )}
                        {v.status === 'NORMALIZED' && (
                          <button onClick={() => setActiveVideoId(v.id)} className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-teal-600 text-white rounded-md hover:bg-teal-700 shadow-sm transition-colors w-full justify-center">
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
      </div>
    );
  }

  // --- Curation Workspace View ---
  const hasNormalized = activeVideo.segments.some((s) => s.normalizedText.length > 0);
  const isApproved = activeVideo.status === 'READY_TO_EXPORT';

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
            <p className="text-[11px] font-medium text-slate-500">{activeVideo.source} • {activeVideo.segmentCount} segmen</p>
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

      <div className="flex-1 flex overflow-hidden bg-slate-100/50">
        {/* Left: Editor Table */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <FileText size={18} className="text-teal-600" />
                Perbandingan Teks — Before & After
              </h2>
              <p className="text-xs text-slate-500 mt-1">Kolom "After" bisa diedit manual jika hasil normalisasi bot kurang tepat.</p>
            </div>
            
            <div className="overflow-x-auto">
              <Table className="w-full text-left">
                <TableHeader>
                  <TableRow className="bg-slate-50 text-xs font-bold uppercase tracking-wider">
                    <TableHead className="text-center w-12 text-slate-400">#</TableHead>
                    <TableHead className="w-[45%]">
                      <span className="flex items-center gap-1.5 text-amber-700"><FileText size={14} /> Before (Teks Asli)</span>
                    </TableHead>
                    <TableHead className="w-8 text-center"></TableHead>
                    <TableHead className="w-[45%]">
                      <span className="flex items-center gap-1.5 text-teal-700"><Wand2 size={14} /> After (Hasil Normalisasi)</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-sm">
                  {activeVideo.segments.map((seg, i) => (
                    <TableRow key={seg.id} className={seg.isEdited ? 'bg-teal-50/20' : ''}>
                      <TableCell className="text-center text-slate-400 font-mono align-top pt-5">{i + 1}</TableCell>
                      <TableCell className="align-top">
                        <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-3.5 text-sm text-slate-700 leading-relaxed">
                          {seg.originalText}
                        </div>
                      </TableCell>
                      <TableCell className="text-center align-top pt-8">
                        <ArrowRight size={18} className="text-slate-300 mx-auto" />
                      </TableCell>
                      <TableCell className="align-top">
                        {hasNormalized ? (
                          <div className="relative">
                            <textarea
                              value={seg.normalizedText}
                              onChange={(e) => handleSegmentEdit(activeVideo.id, seg.id, e.target.value)}
                              disabled={isApproved}
                              className={`w-full min-h-[72px] p-3.5 text-sm leading-relaxed rounded-lg resize-none outline-none transition-all border ${
                                seg.isEdited
                                  ? 'border-teal-400 bg-teal-50/50 focus:ring-2 focus:ring-teal-500/30'
                                  : 'border-slate-200 bg-slate-50 focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-500/20'
                              } ${isApproved ? 'opacity-70 cursor-not-allowed bg-slate-100 text-slate-500' : 'text-slate-800'}`}
                            />
                            {seg.isEdited && (
                              <span className="absolute -top-2.5 -right-2 bg-teal-100 text-teal-700 border border-teal-200 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm">
                                Diedit Manual
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="bg-slate-50 border border-slate-200 border-dashed rounded-lg p-3.5 text-sm text-slate-400 italic flex items-center justify-center h-[72px]">
                            Klik "Auto-Normalize" untuk memproses...
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
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
                {MOCK_SLANG_DICTIONARY.map((entry) => (
                  <div key={entry.slang} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white border border-slate-200 text-xs shadow-sm">
                    <span className="text-amber-600 font-mono font-medium line-through decoration-amber-600/40">{entry.slang}</span>
                    <ArrowRight size={12} className="text-slate-300 mx-2 flex-shrink-0" />
                    <span className="text-teal-700 font-mono font-bold">{entry.standard}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <p className="text-[10px] text-blue-700 font-medium leading-relaxed">
                  <span className="font-bold block mb-1 text-blue-800">Info Bot:</span>
                  Normalisasi menggunakan pola Regex <code>\bword\b</code> (exact boundary) agar tidak mengubah kata di dalam kata lain.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

