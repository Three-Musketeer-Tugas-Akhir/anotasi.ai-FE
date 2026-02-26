'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { PenTool, Save, ChevronRight, Play, SkipForward } from 'lucide-react';

interface AnnotationItem {
  id: string;
  referenceText: string;
  startTime: string;
  endTime: string;
  delay: number;
  glosa: string;
}

const MOCK_ITEMS: AnnotationItem[] = [
  { id: '1', referenceText: 'Nah, di situ langsung saya dikeroyok, Pak.', startTime: '4.00', endTime: '8.00', delay: 0, glosa: '' },
  { id: '2', referenceText: 'Mereka membawa senjata tajam, tongkat, dan batu.', startTime: '8.00', endTime: '12.00', delay: 0, glosa: '' },
  { id: '3', referenceText: 'Saya berusaha melarikan diri ke arah gang sempit.', startTime: '12.00', endTime: '16.00', delay: 0, glosa: '' },
];

export function AnnotationPage() {
  const [items, setItems] = useState(MOCK_ITEMS);
  const [currentIdx, setCurrentIdx] = useState(0);
  const current = items[currentIdx];

  const updateCurrent = (updates: Partial<AnnotationItem>) => {
    setItems((prev) => prev.map((item, i) => i === currentIdx ? { ...item, ...updates } : item));
  };

  const handleNext = () => {
    if (currentIdx < items.length - 1) {
      setCurrentIdx(currentIdx + 1);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <PenTool size={24} className="text-teal-600" />
            Annotation & Alignment
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Input Glosa SIBI dan sesuaikan alignment video untuk setiap kalimat.
          </p>
        </div>
        <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 text-sm">
          Kalimat {currentIdx + 1} / {items.length}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Video + Reference */}
        <div className="space-y-4">
          {/* Video Placeholder */}
          <Card className="border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gray-900 aspect-video flex items-center justify-center relative">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-3">
                  <Play size={28} className="text-white/80 ml-1" />
                </div>
                <p className="text-white/50 text-xs">Micro-video loop (4 detik)</p>
              </div>
              {/* Timestamp overlay */}
              <div className="absolute bottom-3 left-3 flex gap-2">
                <Badge className="bg-black/60 text-white text-[10px] border-0">
                  {current.startTime}s — {current.endTime}s
                </Badge>
              </div>
              <div className="absolute top-3 right-3">
                <Badge className="bg-teal-500/80 text-white text-[10px] border-0">
                  ▶ Looping
                </Badge>
              </div>
            </div>
          </Card>

          {/* Reference Text */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700">Teks Referensi (ASR Corrected)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base text-gray-800 font-medium bg-gray-50 rounded-lg p-4 border border-gray-100 leading-relaxed">
                &ldquo;{current.referenceText}&rdquo;
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Alignment + Glosa */}
        <div className="space-y-4">
          {/* Alignment Slider */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700">Alignment (Video Delay)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-gray-500">
                Geser slider untuk menyelaraskan posisi video dengan teks referensi.
              </p>
              <Slider
                value={[current.delay]}
                onValueChange={([val]) => updateCurrent({ delay: val })}
                min={-5}
                max={5}
                step={0.1}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>-5.0s</span>
                <span className="text-base font-bold text-teal-700">
                  {current.delay > 0 ? '+' : ''}{current.delay.toFixed(1)}s Delay
                </span>
                <span>+5.0s</span>
              </div>
            </CardContent>
          </Card>

          {/* Glosa Input */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700">Input Glosa SIBI</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-gray-500">
                Ketik representasi Glosa SIBI dalam huruf kapital. Pisahkan tiap tanda isyarat dengan spasi.
              </p>
              <Textarea
                placeholder="Contoh: NAH DI-SITU LANGSUNG SAYA DI-KEROYOK PAK"
                value={current.glosa}
                onChange={(e) => updateCurrent({ glosa: e.target.value.toUpperCase() })}
                className="min-h-[120px] font-mono text-sm uppercase tracking-wide"
              />
            </CardContent>
          </Card>

          <Separator />

          {/* Action Buttons */}
          <div className="flex justify-between items-center">
            <Button variant="outline" size="sm" disabled={currentIdx === 0} onClick={() => setCurrentIdx(currentIdx - 1)}>
              <SkipForward size={14} className="mr-1 rotate-180" /> Kalimat Sebelumnya
            </Button>
            <Button onClick={handleNext} className="bg-teal-600 hover:bg-teal-700" disabled={currentIdx === items.length - 1}>
              <Save size={14} className="mr-1.5" /> Simpan & Lanjut <ChevronRight size={14} className="ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
