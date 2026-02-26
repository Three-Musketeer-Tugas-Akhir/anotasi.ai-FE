import { TourConfig } from '@/shared/components/tour';

export const asrReviewTour: TourConfig = {
  id: 'asr_review_tour_v1',
  steps: [
    {
      targetId: '#tour-asr-file-tabs',
      title: 'Pilih File Transkripsi',
      content: 'Setiap kartu mewakili satu file .txt hasil deteksi suara. File ini berkorespondensi dengan video chunk dari CV-1. Klik kartu untuk berpindah antar file.',
    },
    {
      targetId: '#tour-asr-segments',
      title: 'Segmen Deteksi Suara',
      content: 'Panel utama ini menampilkan seluruh segmen teks yang terdeteksi oleh ASR, lengkap dengan timestamp. Klik segmen untuk melompat ke bagian video yang sesuai.',
    },
    {
      targetId: '#tour-asr-video',
      title: 'Preview Video',
      content: 'Video sumber ditampilkan di sini. Ketika Anda mengklik segmen, video otomatis meloncat ke timestamp segmen tersebut. Teks segmen juga ditampilkan sebagai subtitle.',
    },
  ],
};
