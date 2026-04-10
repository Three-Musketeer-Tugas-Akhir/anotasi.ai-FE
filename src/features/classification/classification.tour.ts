import { TourConfig } from '@/shared/components/tour';

export const classificationTour: TourConfig = {
  id: 'classification_tour_v3', // Incremented to trigger a clean version without sidebar
  steps: [
    {
      targetId: '#tour-video-list',
      title: 'Daftar Video JBI',
      content: 'Di sini Anda dapat melihat semua video yang perlu diklasifikasikan. Gunakan fitur pencarian atau filter untuk menyaring video berdasarkan status (Belum Dikategorikan, SIBI, atau BISINDO).',
    },
    {
      targetId: '#tour-video-area',
      title: 'Review & Klasifikasi',
      content: 'Tonton video di area ini, lalu pilih bahasa isyarat yang digunakan (SIBI atau BISINDO). Tip Pro: Gunakan keyboard shortcut angka "1" untuk SIBI dan angka "2" untuk BISINDO agar proses lebih efisien!',
    }
  ]
};
