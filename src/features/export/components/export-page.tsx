'use client';

import { useState } from 'react';
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
import { Combobox } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Package, Download, Loader2, CheckCircle2, FileDown, Calendar, Filter } from 'lucide-react';

interface ExportTuple {
  id: string;
  videoFile: string;
  referenceText: string;
  glosa: string;
  delay: string;
  source: string;
}

const PREVIEW_DATA: ExportTuple[] = [
  { id: '1', videoFile: 'chunk_001_004.mp4', referenceText: 'Nah di situ langsung saya dikeroyok Pak', glosa: 'NAH DI-SITU LANGSUNG SAYA DI-KEROYOK PAK', delay: '+2.5s', source: 'TVRI' },
  { id: '2', videoFile: 'chunk_001_005.mp4', referenceText: 'Mereka membawa senjata tajam tongkat dan batu', glosa: 'MEREKA BAWA SENJATA TAJAM TONGKAT DAN BATU', delay: '+1.2s', source: 'TVRI' },
  { id: '3', videoFile: 'chunk_002_001.mp4', referenceText: 'Presiden RI membuka sidang kabinet', glosa: 'PRESIDEN RI BUKA SIDANG KABINET', delay: '0.0s', source: 'MetroTV' },
  { id: '4', videoFile: 'chunk_002_002.mp4', referenceText: 'Menteri Keuangan memaparkan APBN', glosa: 'MENTERI KEUANGAN PAPAR APBN', delay: '-0.5s', source: 'MetroTV' },
  { id: '5', videoFile: 'chunk_003_001.mp4', referenceText: 'Korban banjir dievakuasi ke posko', glosa: 'KORBAN BANJIR EVAKUASI KE POSKO', delay: '+0.8s', source: 'TVOne' },
];

export function ExportPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [source, setSource] = useState('all');
  const [dateFrom, setDateFrom] = useState('2025-10-01');
  const [dateTo, setDateTo] = useState('2025-10-31');

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setIsGenerated(true);
    }, 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Package size={24} className="text-teal-600" />
          Dataset Export
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Download dataset tuple (video, teks referensi, glosa SIBI) yang sudah siap.
        </p>
      </div>

      {/* Filters */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Filter size={16} /> Filter Dataset
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500">Sumber</label>
              <Combobox
                options={[
                  { value: "all", label: "Semua Sumber" },
                  { value: "tvri", label: "TVRI" },
                  { value: "metrotv", label: "MetroTV" },
                  { value: "tvone", label: "TVOne" },
                  { value: "kompastv", label: "KompasTV" }
                ]}
                value={source || ''}
                onChange={(v) => setSource(v)}
                placeholder="Pilih sumber"
                className="w-full"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                <Calendar size={12} /> Dari Tanggal
              </label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                <Calendar size={12} /> Sampai Tanggal
              </label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats + Generate */}
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex gap-4">
                <div>
                  <p className="text-xs text-gray-500">Total Tuple</p>
                  <p className="text-2xl font-bold text-gray-900">15,120</p>
                </div>
                <Separator orientation="vertical" className="h-12" />
                <div>
                  <p className="text-xs text-gray-500">Ukuran Estimasi</p>
                  <p className="text-2xl font-bold text-gray-900">48.3 GB</p>
                </div>
                <Separator orientation="vertical" className="h-12" />
                <div>
                  <p className="text-xs text-gray-500">Format</p>
                  <p className="text-2xl font-bold text-gray-900">CSV + MP4</p>
                </div>
              </div>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              size="lg"
              className="bg-teal-600 hover:bg-teal-700 h-14 px-8 text-base"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={20} className="mr-2 animate-spin" /> Generating...
                </>
              ) : isGenerated ? (
                <>
                  <Download size={20} className="mr-2" /> Download Dataset
                </>
              ) : (
                <>
                  <FileDown size={20} className="mr-2" /> Generate & Download
                </>
              )}
            </Button>
          </div>
          {isGenerated && (
            <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span className="text-sm text-emerald-700 font-medium">
                Dataset berhasil di-generate! Klik &quot;Download Dataset&quot; untuk mengunduh.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Table */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-800">
            Preview Dataset (5 sample teratas)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50">
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead className="w-40">Video File</TableHead>
                <TableHead>Teks Referensi</TableHead>
                <TableHead>Glosa SIBI</TableHead>
                <TableHead className="w-20 text-center">Delay</TableHead>
                <TableHead className="w-20 text-center">Sumber</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {PREVIEW_DATA.map((row, i) => (
                <TableRow key={row.id}>
                  <TableCell className="text-center text-gray-400 text-xs">{i + 1}</TableCell>
                  <TableCell className="font-mono text-xs text-gray-700">{row.videoFile}</TableCell>
                  <TableCell className="text-sm text-gray-700">{row.referenceText}</TableCell>
                  <TableCell className="font-mono text-xs text-teal-700 uppercase">{row.glosa}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-xs font-mono">{row.delay}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-xs">{row.source}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
