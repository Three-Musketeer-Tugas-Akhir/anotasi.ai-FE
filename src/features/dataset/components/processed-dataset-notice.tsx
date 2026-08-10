'use client';

import { CheckCircle2 } from 'lucide-react';

interface ProcessedDatasetNoticeProps {
  /** Nama dataset aktif, ditampilkan sebagai konteks. */
  datasetName?: string;
  title: string;
  description: string;
  className?: string;
}

/**
 * Keterangan pengganti untuk area kerja yang dikunci karena dataset aktif
 * bukan iNews — isinya sudah melewati tahap pengolahan dataset.
 */
export function ProcessedDatasetNotice({
  datasetName,
  title,
  description,
  className = '',
}: ProcessedDatasetNoticeProps) {
  return (
    <div className={`h-full flex items-center justify-center p-8 bg-slate-50 ${className}`}>
      <div className="max-w-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={28} className="text-emerald-600" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">{title}</h2>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">{description}</p>
        {datasetName && (
          <span className="inline-flex items-center gap-1 mt-4 px-3 py-1 rounded-full bg-teal-100 text-teal-800 text-xs font-semibold border border-teal-200">
            Dataset aktif: {datasetName}
          </span>
        )}
      </div>
    </div>
  );
}
