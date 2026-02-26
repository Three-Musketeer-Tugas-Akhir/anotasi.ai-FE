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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Merge, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface CurationGroup {
  id: string;
  target: string;
  variations: string[];
  masterTerm: string;
  merged: boolean;
}

const MOCK_GROUPS: CurationGroup[] = [
  {
    id: '1',
    target: 'Triliun Rupiah',
    variations: ['Rp15,23 triliun', '15.23 triliun rupiah', '15,23 T', 'Rp 15,23 T'],
    masterTerm: 'Rp15,23 triliun',
    merged: false,
  },
  {
    id: '2',
    target: 'Presiden Republik Indonesia',
    variations: ['Presiden RI', 'Presiden Joko Widodo', 'Pak Presiden', 'Kepala Negara'],
    masterTerm: 'Presiden RI',
    merged: false,
  },
  {
    id: '3',
    target: 'Kementerian Kesehatan',
    variations: ['Kemenkes', 'Kementrian Kesehatan', 'Kemkes RI', 'Kemenkes RI'],
    masterTerm: 'Kemenkes RI',
    merged: true,
  },
  {
    id: '4',
    target: 'Dewan Perwakilan Rakyat',
    variations: ['DPR', 'DPR RI', 'Dewan Perwakilan', 'DPR-RI'],
    masterTerm: 'DPR RI',
    merged: false,
  },
  {
    id: '5',
    target: 'Mahkamah Konstitusi',
    variations: ['MK', 'Mahkamah Konstitusi RI', 'MK RI'],
    masterTerm: 'MK RI',
    merged: false,
  },
];

export function CurationPage() {
  const [groups, setGroups] = useState(MOCK_GROUPS);
  const [search, setSearch] = useState('');

  const filtered = groups.filter((g) =>
    !search || g.target.toLowerCase().includes(search.toLowerCase()) ||
    g.variations.some((v) => v.toLowerCase().includes(search.toLowerCase()))
  );

  const handleMerge = (id: string) => {
    setGroups((prev) => prev.map((g) => g.id === id ? { ...g, merged: true } : g));
  };

  const handleMasterChange = (id: string, value: string) => {
    setGroups((prev) => prev.map((g) => g.id === id ? { ...g, masterTerm: value } : g));
  };

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
            Standarisasi variasi teks dalam dataset. Pilih master term dan merge variasi.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <AlertTriangle size={12} className="mr-1" />
            {groups.filter((g) => !g.merged).length} Perlu Kurasi
          </Badge>
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
            <CheckCircle2 size={12} className="mr-1" />
            {groups.filter((g) => g.merged).length} Selesai
          </Badge>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <Input
          placeholder="Cari term atau variasi..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Groups Table */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-800">
            Grup Variasi ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50">
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead className="w-56">Target Term</TableHead>
                <TableHead>Variasi Ditemukan</TableHead>
                <TableHead className="w-52">Master Term</TableHead>
                <TableHead className="w-32 text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((g, i) => (
                <TableRow key={g.id} className={g.merged ? 'bg-emerald-50/30' : ''}>
                  <TableCell className="text-center text-gray-400 text-xs">{i + 1}</TableCell>
                  <TableCell className="font-semibold text-gray-800 text-sm">{g.target}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {g.variations.map((v) => (
                        <Badge key={v} variant="outline" className="text-xs bg-gray-50 text-gray-600 font-normal">
                          {v}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select value={g.masterTerm} onValueChange={(val) => handleMasterChange(g.id, val)} disabled={g.merged}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {g.variations.map((v) => (
                          <SelectItem key={v} value={v} className="text-xs">{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-center">
                    {g.merged ? (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">
                        <CheckCircle2 size={12} className="mr-1" /> Merged
                      </Badge>
                    ) : (
                      <Button size="sm" onClick={() => handleMerge(g.id)} className="bg-teal-600 hover:bg-teal-700 h-8 text-xs">
                        <Merge size={12} className="mr-1" /> Merge
                      </Button>
                    )}
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
