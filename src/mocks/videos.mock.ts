import { Video } from '@/features/classification/types/classification.types';

/**
 * Mock database for development.
 * Will be replaced by real API calls when the Go backend is ready.
 * Data sourced from real YouTube SIBI/JBI news broadcasts.
 */
export const MOCK_VIDEOS: Video[] = [
  {
    id: 'vid_001',
    videoUrl: '/videos/[FULL] Ricuh Eksekusi Rumah di Kelapa Gading iNews Siang 26 02.mp4_000315.mp4',
    title: 'FULL Wapres Gibran Kunjungi Posko Korban Kapal Tenggelam | iNews Siang',
    duration: '1:15:12',
    date: '17 Feb 2026',
    status: 'uncategorized',
  },
  {
    id: 'vid_002',
    videoUrl: '/videos/[FULL] Ricuh Eksekusi Rumah di Kelapa Gading iNews Siang 26 02.mp4_001139.mp4',
    title: '[FULL] Menteri Maman Pastikan Perjalanan Istrinya ke Eropa | iNews Siang',
    duration: '1:12:22',
    date: '17 Feb 2026',
    status: 'uncategorized',
  },
  {
    id: 'vid_003',
    videoUrl: '/videos/[FULL] Ricuh Eksekusi Rumah di Kelapa Gading iNews Siang 26 02.mp4_001522.mp4',
    title: '[FULL] 29 Korban Kapal Tenggelam Masih Hilang | iNews Siang',
    duration: '1:26:53',
    date: '16 Feb 2026',
    status: 'sibi',
  },
  {
    id: 'vid_004',
    videoUrl: '/videos/[FULL] Ricuh Eksekusi Rumah di Kelapa Gading iNews Siang 26 02.mp4_002817.mp4',
    title: '[FULL] KPK Geledah Rumah Mewah Anak Buah Bobby Nasution',
    duration: '1:21:43',
    date: '16 Feb 2026',
    status: 'bisindo',
  },
  {
    id: 'vid_005',
    videoUrl: '/videos/[FULL] Ricuh Eksekusi Rumah di Kelapa Gading iNews Siang 26 02.mp4_004113.mp4',
    title: '[FULL] Paiman Raharjo Bantah Bikin Ijazah Jokowi | iNews Siang',
    duration: '1:20:21',
    date: '15 Feb 2026',
    status: 'uncategorized',
  },
  {
    id: 'vid_006',
    videoUrl: '/videos/[FULL] Ricuh Eksekusi Rumah di Kelapa Gading iNews Siang 26 02.mp4_000315.mp4',
    title: 'Berita Siang TVRI - Segmen Khusus Pendidikan Inklusif',
    duration: '14:30',
    date: '15 Feb 2026',
    status: 'uncategorized',
  },
  {
    id: 'vid_007',
    videoUrl: '/videos/[FULL] Ricuh Eksekusi Rumah di Kelapa Gading iNews Siang 26 02.mp4_001139.mp4',
    title: 'Liputan Khusus: Perkembangan Bahasa Isyarat di Indonesia',
    duration: '08:45',
    date: '14 Feb 2026',
    status: 'uncategorized',
  },
  {
    id: 'vid_008',
    videoUrl: '/videos/[FULL] Ricuh Eksekusi Rumah di Kelapa Gading iNews Siang 26 02.mp4_001522.mp4',
    title: 'Warta Berita Sore - Update Banjir Jakarta',
    duration: '12:10',
    date: '14 Feb 2026',
    status: 'uncategorized',
  },
  {
    id: 'vid_009',
    videoUrl: '/videos/[FULL] Ricuh Eksekusi Rumah di Kelapa Gading iNews Siang 26 02.mp4_002817.mp4',
    title: 'Dialog Interaktif: Disabilitas dan Aksesibilitas',
    duration: '45:00',
    date: '13 Feb 2026',
    status: 'uncategorized',
  },
  {
    id: 'vid_010',
    videoUrl: '/videos/[FULL] Ricuh Eksekusi Rumah di Kelapa Gading iNews Siang 26 02.mp4_004113.mp4',
    title: 'Dokumenter Pendek: Komunitas Tuli',
    duration: '10:25',
    date: '13 Feb 2026',
    status: 'uncategorized',
  },
];
