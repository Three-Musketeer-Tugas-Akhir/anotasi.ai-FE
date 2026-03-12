'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Save, Eye, CheckCircle2 } from 'lucide-react';

interface ActionBarProps {
  onSave: () => void;
  onPreview: () => void;
  onFinish: () => void;
}

export function ActionBar({ onSave, onPreview, onFinish }: ActionBarProps) {
  return (
    <Card className="p-4 flex items-center justify-between shadow-sm border-gray-200 bg-white">
      <div className="text-sm text-gray-500">
        Pastikan semua anotasi sudah tersinkronisasi sebelum menyelesaikan.
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={onPreview} className="gap-2">
          <Eye size={16} /> Preview Video
        </Button>
        <Button variant="secondary" onClick={onSave} className="gap-2 bg-teal-50 text-teal-700 hover:bg-teal-100 border-teal-200">
          <Save size={16} /> Simpan Anotasi
        </Button>
        <Button onClick={onFinish} className="gap-2 bg-teal-600 hover:bg-teal-700 text-white">
          <CheckCircle2 size={16} /> Selesai
        </Button>
      </div>
    </Card>
  );
}
