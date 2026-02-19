'use client';

import { cn } from '@/shared/utils/cn';
import { VideoStatus } from '@/features/classification/types/classification.types';

const statusConfig: Record<VideoStatus, { className: string; label: string }> = {
  uncategorized: {
    className: 'bg-gray-100 text-gray-600 border-gray-200',
    label: 'Belum Dikategorikan',
  },
  sibi: {
    className: 'bg-blue-100 text-blue-700 border-blue-200',
    label: 'SIBI',
  },
  bisindo: {
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    label: 'BISINDO',
  },
};

interface StatusBadgeProps {
  status: VideoStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'px-2 py-0.5 rounded-full text-xs font-medium border',
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
