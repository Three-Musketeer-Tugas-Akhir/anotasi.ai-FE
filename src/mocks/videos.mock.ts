import { ClassificationJob } from '@/features/classification/types/classification.types';

/**
 * Mock database for development.
 * Will be replaced by real API calls when jbi-service is connected.
 * Data sourced from real YouTube SIBI/JBI news broadcasts.
 */
export const MOCK_JOBS: ClassificationJob[] = [
  {
    job_id: 'vid_001',
    video_title: 'FULL Wapres Gibran Kunjungi Posko Korban Kapal Tenggelam | iNews Siang',
    status: 'READY_FOR_ANNOTATION',
    category: 'uncategorized',
    progress: null,
    error: null,
    created_at: '2026-02-17T00:00:00Z',
    updated_at: '2026-02-17T00:00:00Z',
  },
  {
    job_id: 'vid_002',
    video_title: '[FULL] Menteri Maman Pastikan Perjalanan Istrinya ke Eropa | iNews Siang',
    status: 'READY_FOR_ANNOTATION',
    category: 'uncategorized',
    progress: null,
    error: null,
    created_at: '2026-02-17T00:00:00Z',
    updated_at: '2026-02-17T00:00:00Z',
  },
  {
    job_id: 'vid_003',
    video_title: '[FULL] 29 Korban Kapal Tenggelam Masih Hilang | iNews Siang',
    status: 'READY_FOR_ANNOTATION',
    category: 'SIBI',
    progress: null,
    error: null,
    created_at: '2026-02-16T00:00:00Z',
    updated_at: '2026-02-16T00:00:00Z',
  },
  {
    job_id: 'vid_004',
    video_title: '[FULL] KPK Geledah Rumah Mewah Anak Buah Bobby Nasution',
    status: 'READY_FOR_ANNOTATION',
    category: 'BISINDO',
    progress: null,
    error: null,
    created_at: '2026-02-16T00:00:00Z',
    updated_at: '2026-02-16T00:00:00Z',
  },
];
