import { TourConfig } from '@/shared/components/tour';

export const classificationTour: TourConfig = {
  id: 'classification_tour_v1',
  steps: [
    {
      targetId: '#tour-video-list',
      title: 'Daftar Video JBI',
      content: 'Di sini Anda dapat melihat semua video yang perlu dianotasi. Gunakan fitur pencarian atau filter untuk menyaring video berdasarkan status (Belum Dikategorikan, SIBI, atau BISINDO).',
    },
    {
      targetId: '#tour-video-player',
      title: 'Review Video',
      content: 'Tonton video di area ini untuk mengidentifikasi apakah Juru Bahasa Isyarat (JBI) menggunakan bahasa isyarat tipe SIBI atau BISINDO. Jika video error, Anda bisa membukanya langsung di YouTube.',
    },
    {
      targetId: '#tour-categorization-panel',
      title: 'Panel Kategorisasi',
      content: 'Setelah menonton, pilih klasifikasi yang tepat di sini. Tip Pro: Gunakan keyboard shortcut angka "1" untuk SIBI dan angka "2" untuk BISINDO agar proses anotasi lebih cepat!',
    }
  ]
};
