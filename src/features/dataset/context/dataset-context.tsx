'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { Dataset } from '@/features/dataset/types/dataset.types';

const STORAGE_KEY = 'anotasi_selected_dataset';

interface DatasetContextValue {
  selectedDataset: Dataset | null;
  setSelectedDataset: (dataset: Dataset | null) => void;
  isHydrated: boolean;
  /** True when user needs to pick a dataset (hydrated but nothing selected). */
  needsDatasetSelection: boolean;
}

const DatasetContext = createContext<DatasetContextValue | null>(null);

export function DatasetProvider({ children }: { children: ReactNode }) {
  const [selectedDataset, setSelectedDatasetState] = useState<Dataset | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Dataset;
        setSelectedDatasetState(parsed);
      }
    } catch {
      // ignore parse errors
    }
    setIsHydrated(true);
  }, []);

  const setSelectedDataset = useCallback((dataset: Dataset | null) => {
    setSelectedDatasetState(dataset);
    if (dataset) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataset));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const needsDatasetSelection = isHydrated && selectedDataset === null;

  return (
    <DatasetContext.Provider value={{ selectedDataset, setSelectedDataset, isHydrated, needsDatasetSelection }}>
      {children}
    </DatasetContext.Provider>
  );
}

export function useSelectedDataset() {
  const ctx = useContext(DatasetContext);
  if (!ctx) {
    throw new Error('useSelectedDataset must be used within a DatasetProvider');
  }
  return ctx;
}
