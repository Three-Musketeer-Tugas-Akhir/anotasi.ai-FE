import { Video } from '@/features/classification/types/classification.types';

/**
 * Mock database for development.
 * Will be replaced by real API calls when the Go backend is ready.
 * Data sourced from real YouTube SIBI/JBI news broadcasts.
 */
export const MOCK_VIDEOS: Video[] = [
  {
    id: 'vid_001',
    youtubeId: 'wILYlf-_pv8',
    title: 'FULL Wapres Gibran Kunjungi Posko Korban Kapal Tenggelam | iNews Siang',
    duration: '1:15:12',
    date: '17 Feb 2026',
    status: 'uncategorized',
  },
  {
    id: 'vid_002',
    youtubeId: 'A1k2SUQcoYE',
    title: '[FULL] Menteri Maman Pastikan Perjalanan Istrinya ke Eropa | iNews Siang',
    duration: '1:12:22',
    date: '17 Feb 2026',
    status: 'uncategorized',
  },
  {
    id: 'vid_003',
    youtubeId: 'D9rST4KNCts',
    title: '[FULL] 29 Korban Kapal Tenggelam Masih Hilang | iNews Siang',
    duration: '1:26:53',
    date: '16 Feb 2026',
    status: 'sibi',
  },
  {
    id: 'vid_004',
    youtubeId: 'xHWmCJhLJPE',
    title: '[FULL] KPK Geledah Rumah Mewah Anak Buah Bobby Nasution',
    duration: '1:21:43',
    date: '16 Feb 2026',
    status: 'bisindo',
  },
  {
    id: 'vid_005',
    youtubeId: 'qskREWrnOCA',
    title: '[FULL] Paiman Raharjo Bantah Bikin Ijazah Jokowi | iNews Siang',
    duration: '1:20:21',
    date: '15 Feb 2026',
    status: 'uncategorized',
  },
  {
    id: 'vid_006',
    youtubeId: 'wk6Qtf9zmP8',
    title: 'Berita Siang TVRI - Segmen Khusus Pendidikan Inklusif',
    duration: '14:30',
    date: '15 Feb 2026',
    status: 'uncategorized',
  },
  {
    id: 'vid_007',
    youtubeId: 'gU1yvtJNVqA',
    title: 'Liputan Khusus: Perkembangan Bahasa Isyarat di Indonesia',
    duration: '08:45',
    date: '14 Feb 2026',
    status: 'uncategorized',
  },
  {
    id: 'vid_008',
    youtubeId: 'CazX_ObQEGU',
    title: 'Warta Berita Sore - Update Banjir Jakarta',
    duration: '12:10',
    date: '14 Feb 2026',
    status: 'uncategorized',
  },
  {
    id: 'vid_009',
    youtubeId: 'tAXqaww6w5g',
    title: 'Dialog Interaktif: Disabilitas dan Aksesibilitas',
    duration: '45:00',
    date: '13 Feb 2026',
    status: 'uncategorized',
  },
  {
    id: 'vid_010',
    youtubeId: 'RTWZxRFdh2Q',
    title: 'Dokumenter Pendek: Komunitas Tuli',
    duration: '10:25',
    date: '13 Feb 2026',
    status: 'uncategorized',
  },
];
