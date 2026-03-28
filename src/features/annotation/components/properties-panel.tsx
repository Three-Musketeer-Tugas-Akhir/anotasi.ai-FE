'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface VideoTrimData {
  start: number;
  end: number;
  asrText: string;
  sibiText: string;
  alignment: string;
  issue: string;
  comment: string;
}

interface PropertiesPanelProps {
  data: VideoTrimData;
  onChange: (updates: Partial<VideoTrimData>) => void;
}

export function PropertiesPanel({ data, onChange }: PropertiesPanelProps) {
  const { start, end, asrText, sibiText, alignment, issue, comment } = data;

  const handleChange = (field: keyof VideoTrimData, value: string | number) => {
    onChange({ [field]: value });
  };

  return (
    <Card className="h-full border-gray-200 flex flex-col shadow-sm">
      <CardHeader className="py-4 border-b border-gray-100 bg-gray-50">
        <CardTitle className="text-sm font-semibold text-gray-800">Video Merger & Trimmer</CardTitle>
      </CardHeader>
      
      <CardContent className="p-4 space-y-4 flex-1 overflow-y-auto">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">Mulai (detik)</Label>
            <Input 
              type="number" 
              step="0.01" 
              value={start.toFixed(2)} 
              onChange={(e) => handleChange('start', parseFloat(e.target.value) || 0)} 
              className="h-8 text-sm font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">Berakhir (detik)</Label>
            <Input 
              type="number" 
              step="0.01" 
              value={end.toFixed(2)} 
              onChange={(e) => handleChange('end', parseFloat(e.target.value) || 0)} 
              className="h-8 text-sm font-mono"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-gray-500 flex justify-between">
            <span>Transkrip Audio Otomatis (Referensi)</span>
          </Label>
          <div className="p-2 border border-blue-200 rounded-md bg-blue-50 text-xs text-blue-900 min-h-[40px] leading-relaxed">
            {asrText || '-'}
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-semibold text-teal-700">SIBI Sentence (Manual)</Label>
          <Textarea 
            placeholder="KETIK ISYARAT DI SINI" 
            value={sibiText}
            onChange={(e) => handleChange('sibiText', e.target.value.toUpperCase())}
            className="font-mono text-sm uppercase resize-none h-20 border-teal-200 focus-visible:ring-teal-500"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-gray-500">Alignment Teks</Label>
          <Textarea 
            placeholder="Mapping teks..." 
            value={alignment}
            onChange={(e) => handleChange('alignment', e.target.value)}
            className="text-sm resize-none h-16"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-gray-500">Potensi Masalah</Label>
          <Select value={issue} onValueChange={(val) => handleChange('issue', val)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Pilih potensi masalah..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Tidak ada masalah</SelectItem>
              <SelectItem value="blur">Gerakan Blur / Cepat</SelectItem>
              <SelectItem value="cut">Terpotong Jeda Video</SelectItem>
              <SelectItem value="unclear">Isyarat Tidak Jelas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-gray-500">Komentar</Label>
          <Textarea 
            placeholder="Tambahkan catatan khusus..." 
            value={comment}
            onChange={(e) => handleChange('comment', e.target.value)}
            className="text-sm resize-none h-16"
          />
        </div>
      </CardContent>
    </Card>
  );
}
