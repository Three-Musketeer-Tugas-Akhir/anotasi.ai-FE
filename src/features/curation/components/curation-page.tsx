'use client';

import { useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search,
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
  { slang: 'udah', standard: 'sudah' },
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

const MOCK_VIDEOS: CurationVideo[] = [
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

// ── Status helpers ─────────────────────────────────────────────────

const STATUS_CONFIG: Record<CurationStatus, { label: string; color: string; icon: React.ReactNode }> = {
  ANNOTATED: {
    label: 'Perlu Kurasi',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: <AlertTriangle size={12} />,
  },
  NORMALIZING: {
    label: 'Memproses...',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: <Loader2 size={12} className="animate-spin" />,
  },
  NORMALIZED: {
    label: 'Sudah Dinormalisasi',
    color: 'bg-teal-50 text-teal-700 border-teal-200',
    icon: <Wand2 size={12} />,
  },
  READY_TO_EXPORT: {
    label: 'Siap Export',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <CheckCircle2 size={12} />,
  },
};

function StatusBadge({ status }: { status: CurationStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={`${cfg.color} gap-1`}>
      {cfg.icon} {cfg.label}
    </Badge>
  );
}

// ── Main Component ─────────────────────────────────────────────────

export function CurationPage() {
  const [videos, setVideos] = useState<CurationVideo[]>(MOCK_VIDEOS);
  const [search, setSearch] = useState('');
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [dictOpen, setDictOpen] = useState(true);
  const [normalizing, setNormalizing] = useState(false);

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

  // ── Handlers ───────────────────────────────────────────────────

  const handleNormalize = useCallback(
    async (videoId: string) => {
      setNormalizing(true);
      // Update status to NORMALIZING
      setVideos((prev) =>
        prev.map((v) => (v.id === videoId ? { ...v, status: 'NORMALIZING' as CurationStatus } : v)),
      );

      const targetVideo = videos.find((v) => v.id === videoId);
      if (!targetVideo) {
        setNormalizing(false);
        return;
      }

      try {
        const normalizedItems = await curationApi.normalizeSegments(targetVideo.segments);
        setVideos((prev) =>
          prev.map((v) => {
            if (v.id !== videoId) return v;
            return {
              ...v,
              status: 'NORMALIZED' as CurationStatus,
              segments: normalizedItems,
            };
          }),
        );
      } catch (err) {
        console.error("Failed to normalize", err);
        // revert status on error
        setVideos((prev) =>
          prev.map((v) => (v.id === videoId ? { ...v, status: 'ANNOTATED' as CurationStatus } : v)),
        );
      } finally {
        setNormalizing(false);
      }
    },
    [videos],
  );

  const handleSegmentEdit = useCallback(
    (videoId: string, segmentId: string, newText: string) => {
      setVideos((prev) =>
        prev.map((v) => {
          if (v.id !== videoId) return v;
          return {
            ...v,
            segments: v.segments.map((seg) =>
              seg.id === segmentId ? { ...seg, normalizedText: newText, isEdited: true } : seg,
            ),
          };
        }),
      );
    },
    [],
  );

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
    setVideos((prev) =>
      prev.map((v) =>
        v.status === 'NORMALIZED' ? { ...v, status: 'READY_TO_EXPORT' as CurationStatus } : v,
      ),
    );
  }, []);

  // ── Render ─────────────────────────────────────────────────────

  if (activeVideo) {
    return (
      <WorkspaceView
        video={activeVideo}
        normalizing={normalizing}
        dictOpen={dictOpen}
        onToggleDict={() => setDictOpen((o) => !o)}
        onBack={() => setActiveVideoId(null)}
        onNormalize={() => handleNormalize(activeVideo.id)}
        onSegmentEdit={(segId, text) => handleSegmentEdit(activeVideo.id, segId, text)}
        onApprove={() => handleApprove(activeVideo.id)}
      />
    );
  }

  return <DashboardView
    videos={filtered}
    search={search}
    counts={counts}
    onSearch={setSearch}
    onSelect={setActiveVideoId}
    onNormalize={handleNormalize}
    onApproveAll={handleApproveAll}
  />;
}

// ── Dashboard View ─────────────────────────────────────────────────

function DashboardView({
  videos,
  search,
  counts,
  onSearch,
  onSelect,
  onNormalize,
  onApproveAll,
}: {
  videos: CurationVideo[];
  search: string;
  counts: { needsCuration: number; normalized: number; approved: number };
  onSearch: (v: string) => void;
  onSelect: (id: string) => void;
  onNormalize: (id: string) => Promise<void>;
  onApproveAll: () => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Search size={24} className="text-teal-600" />
            Curation Hub
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Normalisasi teks transkripsi sebelum di-export sebagai dataset final.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1">
            <AlertTriangle size={12} /> {counts.needsCuration} Perlu Kurasi
          </Badge>
          <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 gap-1">
            <Wand2 size={12} /> {counts.normalized} Normalized
          </Badge>
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
            <CheckCircle2 size={12} /> {counts.approved} Approved
          </Badge>
        </div>
      </div>

      {/* Search + Actions */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <Input
            placeholder="Cari video atau sumber..."
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="ml-auto flex gap-2">
          {counts.normalized > 0 && (
            <Button
              onClick={onApproveAll}
              className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
            >
              <ShieldCheck size={16} />
              Approve All ({counts.normalized})
            </Button>
          )}
        </div>
      </div>

      {/* Videos Table */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-800">
            Video untuk Kurasi ({videos.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50">
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead>Video</TableHead>
                <TableHead className="w-28">Sumber</TableHead>
                <TableHead className="w-28 text-center">Segmen</TableHead>
                <TableHead className="w-44 text-center">Status</TableHead>
                <TableHead className="w-52 text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {videos.map((v, i) => (
                <TableRow
                  key={v.id}
                  className={
                    v.status === 'READY_TO_EXPORT'
                      ? 'bg-emerald-50/30'
                      : v.status === 'NORMALIZED'
                        ? 'bg-teal-50/20'
                        : ''
                  }
                >
                  <TableCell className="text-center text-gray-400 text-xs">{i + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-gray-400 flex-shrink-0" />
                      <span className="font-medium text-gray-800 text-sm truncate max-w-[300px]">
                        {v.filename}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{v.source}</Badge>
                  </TableCell>
                  <TableCell className="text-center text-sm text-gray-600">
                    {v.segmentCount}
                  </TableCell>
                  <TableCell className="text-center">
                    <StatusBadge status={v.status} />
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      {v.status === 'ANNOTATED' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onNormalize(v.id)}
                            className="h-8 text-xs gap-1 border-teal-200 text-teal-700 hover:bg-teal-50"
                          >
                            <Wand2 size={12} /> Auto-Normalize
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => onSelect(v.id)}
                            className="bg-teal-600 hover:bg-teal-700 h-8 text-xs gap-1"
                          >
                            <Pencil size={12} /> Kurasi
                          </Button>
                        </>
                      )}
                      {v.status === 'NORMALIZED' && (
                        <Button
                          size="sm"
                          onClick={() => onSelect(v.id)}
                          className="bg-teal-600 hover:bg-teal-700 h-8 text-xs gap-1"
                        >
                          <Pencil size={12} /> Review & Approve
                        </Button>
                      )}
                      {v.status === 'READY_TO_EXPORT' && (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 gap-1">
                          <CheckCircle2 size={12} /> Approved
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {videos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-gray-400">
                    Tidak ada video yang cocok dengan pencarian.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Workspace View ─────────────────────────────────────────────────

function WorkspaceView({
  video,
  normalizing,
  dictOpen,
  onToggleDict,
  onBack,
  onNormalize,
  onSegmentEdit,
  onApprove,
}: {
  video: CurationVideo;
  normalizing: boolean;
  dictOpen: boolean;
  onToggleDict: () => void;
  onBack: () => void;
  onNormalize: () => void;
  onSegmentEdit: (segId: string, text: string) => void;
  onApprove: () => void;
}) {
  const hasNormalized = video.segments.some((s) => s.normalizedText.length > 0);
  const isApproved = video.status === 'READY_TO_EXPORT';

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 text-gray-600">
            <ArrowLeft size={16} /> Kembali
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <div>
            <h2 className="font-semibold text-gray-900 text-sm">{video.filename}</h2>
            <p className="text-xs text-gray-500">{video.source} · {video.segmentCount} segmen</p>
          </div>
          <StatusBadge status={video.status} />
        </div>
        <div className="flex items-center gap-2">
          {!isApproved && (
            <Button
              onClick={onNormalize}
              disabled={normalizing}
              variant="outline"
              className="gap-1.5 border-teal-200 text-teal-700 hover:bg-teal-50"
            >
              {normalizing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Wand2 size={16} />
              )}
              {normalizing ? 'Memproses...' : 'Auto-Normalize'}
            </Button>
          )}
          {hasNormalized && !isApproved && (
            <Button
              onClick={onApprove}
              className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
            >
              <ShieldCheck size={16} /> Approve
            </Button>
          )}
        </div>
      </div>

      {/* Content: Comparison + Dictionary */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Comparison Panel */}
        <div className="flex-1 overflow-y-auto p-6">
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <FileText size={18} className="text-teal-600" />
                Perbandingan Teks — Before &amp; After
              </CardTitle>
              <p className="text-xs text-gray-500 mt-1">
                Kolom &quot;After&quot; bisa diedit manual jika hasil normalisasi bot kurang tepat.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead className="w-[45%]">
                      <span className="flex items-center gap-1.5 text-amber-700">
                        <FileText size={14} /> Before (Teks Asli)
                      </span>
                    </TableHead>
                    <TableHead className="w-8 text-center"></TableHead>
                    <TableHead className="w-[45%]">
                      <span className="flex items-center gap-1.5 text-teal-700">
                        <Wand2 size={14} /> After (Hasil Normalisasi)
                      </span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {video.segments.map((seg, i) => (
                    <TableRow key={seg.id} className={seg.isEdited ? 'bg-blue-50/30' : ''}>
                      <TableCell className="text-center text-gray-400 text-xs align-top pt-4">
                        {i + 1}
                      </TableCell>
                      <TableCell className="align-top py-3">
                        <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-3 text-sm text-gray-700 leading-relaxed">
                          {seg.originalText}
                        </div>
                      </TableCell>
                      <TableCell className="text-center align-top pt-4">
                        <ArrowRight size={16} className="text-gray-300 mx-auto" />
                      </TableCell>
                      <TableCell className="align-top py-3">
                        {hasNormalized ? (
                          <div className="relative">
                            <Textarea
                              value={seg.normalizedText}
                              onChange={(e) => onSegmentEdit(seg.id, e.target.value)}
                              disabled={isApproved}
                              className={`min-h-[60px] text-sm leading-relaxed resize-none ${
                                seg.isEdited
                                  ? 'border-blue-300 bg-blue-50/30 focus:border-blue-400'
                                  : 'border-teal-200 bg-teal-50/30 focus:border-teal-400'
                              } ${isApproved ? 'opacity-70 cursor-not-allowed' : ''}`}
                            />
                            {seg.isEdited && (
                              <Badge
                                variant="outline"
                                className="absolute -top-2 -right-2 bg-blue-100 text-blue-700 border-blue-200 text-[10px] px-1.5"
                              >
                                Diedit Manual
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-sm text-gray-400 italic">
                            Klik &quot;Auto-Normalize&quot; untuk memproses...
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Slang Dictionary Sidebar */}
        <div
          className={`border-l border-gray-200 bg-gray-50/50 transition-all duration-300 flex flex-col ${
            dictOpen ? 'w-80' : 'w-12'
          }`}
        >
          <button
            onClick={onToggleDict}
            className="flex items-center gap-2 px-3 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors border-b border-gray-200"
          >
            <BookOpen size={16} className="text-teal-600 flex-shrink-0" />
            {dictOpen && <span className="flex-1 text-left">Kamus Slang → Baku</span>}
            {dictOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>

          {dictOpen && (
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-1">
                {MOCK_SLANG_DICTIONARY.map((entry) => (
                  <div
                    key={entry.slang}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-white border border-gray-100 text-xs"
                  >
                    <span className="text-red-600 font-mono line-through">{entry.slang}</span>
                    <ArrowRight size={12} className="text-gray-300 mx-2 flex-shrink-0" />
                    <span className="text-emerald-700 font-mono font-semibold">{entry.standard}</span>
                  </div>
                ))}
              </div>
              <div className="p-3 pt-0">
                <p className="text-[10px] text-gray-400 text-center">
                  Pencocokan menggunakan &quot;\bword\b&quot; (exact word boundary)
                </p>
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    </div>
  );
}
