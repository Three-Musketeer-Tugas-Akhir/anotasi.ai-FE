'use client';

import { useState } from 'react';
import { Briefcase, ChevronDown, Plus, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useDatasets, useCreateDataset } from '@/features/dataset/hooks/use-dataset';
import { useSelectedDataset } from '@/features/dataset/context/dataset-context';
import type { Dataset } from '@/features/dataset/types/dataset.types';
import { toast } from 'sonner';

/**
 * DatasetSelector — Popover dropdown for selecting / switching project datasets.
 * Uses Radix Popover (portaled) so the dropdown escapes parent stacking contexts.
 */
export function DatasetSelector() {
  const { selectedDataset, setSelectedDataset, isHydrated } = useSelectedDataset();
  const { data, isLoading } = useDatasets();
  const datasets = data?.items || [];

  const [isOpen, setIsOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newDatasetName, setNewDatasetName] = useState('');
  const [newDatasetDesc, setNewDatasetDesc] = useState('');

  const { mutate: createDataset, isPending: isCreating } = useCreateDataset(() => {
    toast.success('Dataset berhasil dibuat');
    setIsCreateDialogOpen(false);
    setNewDatasetName('');
    setNewDatasetDesc('');
  });

  function handleSelect(dataset: Dataset) {
    setSelectedDataset(dataset);
    setIsOpen(false);
    toast.info(`Beralih ke dataset: ${dataset.name}`);
  }

  function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newDatasetName.trim()) return;
    createDataset({ name: newDatasetName.trim(), description: newDatasetDesc.trim() || undefined });
  }

  // Don't render until hydrated to avoid mismatch
  if (!isHydrated) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 animate-pulse h-9 w-40" />
    );
  }

  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors text-left min-w-[160px]"
          >
            <Briefcase size={16} className="text-teal-700 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-teal-900 truncate leading-tight">
                {selectedDataset?.name || 'Pilih Dataset'}
              </p>
              {selectedDataset && (
                <p className="text-[10px] text-teal-600 leading-tight">Project aktif</p>
              )}
            </div>
            <ChevronDown
              size={14}
              className={`text-teal-700 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          </button>
        </PopoverTrigger>

        <PopoverContent align="start" className="w-72 p-0 rounded-xl border-gray-200 shadow-lg">
          {/* Header */}
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Dataset / Project</p>
          </div>

          {/* List */}
          <div className="max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 size={18} className="animate-spin text-gray-400" />
              </div>
            ) : datasets.length === 0 ? (
              <div className="px-3 py-4 text-center">
                <p className="text-xs text-gray-400">Belum ada dataset</p>
              </div>
            ) : (
              datasets.map((ds) => (
                <button
                  key={ds.id}
                  onClick={() => handleSelect(ds)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors ${
                    selectedDataset?.id === ds.id ? 'bg-teal-50/60' : ''
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${
                      selectedDataset?.id === ds.id
                        ? 'bg-teal-600 text-white'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    <Briefcase size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{ds.name}</p>
                    {ds.description && (
                      <p className="text-[11px] text-gray-400 truncate">{ds.description}</p>
                    )}
                  </div>
                  {selectedDataset?.id === ds.id && (
                    <Check size={14} className="text-teal-600 flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Add new */}
          <div className="border-t border-gray-100 px-2 py-1.5">
            <button
              onClick={() => {
                setIsOpen(false);
                setIsCreateDialogOpen(true);
              }}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-sm text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
            >
              <Plus size={14} />
              <span>Buat Dataset Baru</span>
            </button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Create Dataset Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader>
              <DialogTitle>Buat Dataset Baru</DialogTitle>
              <DialogDescription>
                Dataset digunakan untuk mengelompokkan video-video dalam satu project (misal: iNews 2025, TVRI 2024).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="dataset-name">Nama Dataset</Label>
                <Input
                  id="dataset-name"
                  placeholder="Contoh: iNews 2025"
                  value={newDatasetName}
                  onChange={(e) => setNewDatasetName(e.target.value)}
                  className="mt-1"
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="dataset-desc">Deskripsi (opsional)</Label>
                <Input
                  id="dataset-desc"
                  placeholder="Deskripsi singkat project..."
                  value={newDatasetDesc}
                  onChange={(e) => setNewDatasetDesc(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                disabled={isCreating}
              >
                Batal
              </Button>
              <Button
                type="submit"
                className="bg-teal-600 hover:bg-teal-700 text-white"
                disabled={!newDatasetName.trim() || isCreating}
              >
                {isCreating ? 'Membuat...' : 'Buat Dataset'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
