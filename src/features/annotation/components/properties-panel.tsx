'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface AnnotationData {
  id: string;
  start: number;
  end: number;
  asrText: string;
  sibiText: string;
  issue: string;
  comment: string;
}

interface PropertiesPanelProps {
  selectedAnnotation: AnnotationData | null;
  onChange: (id: string, updates: Partial<AnnotationData>) => void;
}

export function PropertiesPanel({ selectedAnnotation, onChange }: PropertiesPanelProps) {
  if (!selectedAnnotation) {
    return (
      <Card className="h-full border-gray-200 flex flex-col items-center justify-center p-6 text-center text-gray-500">
        <div className="mb-2 text-3xl">👈</div>
        <p>Pilih blok anotasi pada timeline untuk mengedit detailnya.</p>
      </Card>
    );
  }

  const { id, start, end, asrText, sibiText, issue, comment } = selectedAnnotation;

  const handleChange = (field: keyof AnnotationData, value: string | number) => {
    onChange(id, { [field]: value });
  };

  return (
    <Card className="h-full border-gray-200 flex flex-col shadow-sm">
      <CardHeader className="py-4 border-b border-gray-100 bg-gray-50">
        <CardTitle className="text-sm font-semibold text-gray-800">Properties Panel</CardTitle>
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
            <span>Referensi ASR (Read-only)</span>
          </Label>
          <div className="p-2 border border-gray-200 rounded-md bg-gray-50 text-xs text-gray-600 min-h-[40px]">
            {asrText || '-'}
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-semibold text-teal-700">CB Sentence Manual (SIBI)</Label>
          <Textarea 
            placeholder="KETIK ISYARAT DI SINI" 
            value={sibiText}
            onChange={(e) => handleChange('sibiText', e.target.value.toUpperCase())}
            className="font-mono text-sm uppercase resize-none h-24 border-teal-200 focus-visible:ring-teal-500"
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
            className="text-sm resize-none h-20"
          />
        </div>
      </CardContent>
    </Card>
  );
}
