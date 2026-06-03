import type { CurationSegment } from './types';

// RawCurationJob
export const DUMMY_CURATION_JOBS: any[] = [
  {
    job_id: 'cur-dummy-1-annotated',
    status: 'READY_FOR_ANNOTATION',
    curation_status: 'ANNOTATED',
    video_title: '[FULL] 29 Korban Kapal Tenggelam Masih Hilang | iNews Siang | 04/07',
    category: 'BISINDO',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    job_id: 'cur-dummy-2-ready-norm',
    status: 'READY_FOR_ANNOTATION',
    curation_status: 'READY_TO_BE_NORMALIZED',
    video_title: '[FULL] Detik-Detik Sepeda Motor Terbakar Hebat Usai Isi BBM | iNews Siang | 24/04',
    category: 'BISINDO',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    job_id: 'cur-dummy-3-normalizing',
    status: 'READY_FOR_ANNOTATION',
    curation_status: 'NORMALIZING',
    video_title: '[FULL] HARI INI! Demo Ojol Tuntut Potongan Aplikasi | iNews Siang | 20/05',
    category: 'BISINDO',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    job_id: 'cur-dummy-4-normalized',
    status: 'READY_FOR_ANNOTATION',
    curation_status: 'NORMALIZED',
    video_title: '[FULL] KPK Geledah Rumah Mewah Anak Buah Bobby Nasution | iNews Siang | 03/07',
    category: 'BISINDO',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    job_id: 'cur-dummy-5-exported',
    status: 'READY_FOR_ANNOTATION',
    curation_status: 'READY_TO_EXPORT',
    video_title: '[FULL] Libur Panjang Tol Cipularang Ramai, Didominasi Kendaraan Pribadi| iNews Siang | 30/05',
    category: 'BISINDO',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    job_id: 'cur-dummy-6-annotated',
    status: 'READY_FOR_ANNOTATION',
    curation_status: 'ANNOTATED',
    video_title: '[FULL] Libur Panjang, Volume Kendaraan Menuju Jakarta Meningkat  | iNews Siang | 29/6',
    category: 'BISINDO',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

export const MOCK_CURATION_SEGMENTS_BEFORE: CurationSegment[] = [
  {
    id: 'seg-1-0',
    segmentId: 'seg-1',
    utteranceIndex: 0,
    originalText: 'halo selamat pagi pemirsa',
    normalizedText: '',
    originalGlosa: 'halo selamat pagi pemirsa',
    normalizedGlosa: '',
    start: 0,
    end: 2.5,
    isEdited: false,
  },
  {
    id: 'seg-2-0',
    segmentId: 'seg-2',
    utteranceIndex: 0,
    originalText: 'hari ini kita denger kabar baik banget',
    normalizedText: '',
    originalGlosa: 'hari ini kita dengar kabar baik sangat',
    normalizedGlosa: '',
    start: 2.5,
    end: 5.0,
    isEdited: false,
  },
  {
    id: 'seg-3-0',
    segmentId: 'seg-3',
    utteranceIndex: 0,
    originalText: 'ya udah kita langsung aja liat videonya',
    normalizedText: '',
    originalGlosa: 'ya sudah kita langsung saja lihat video',
    normalizedGlosa: '',
    start: 5.0,
    end: 8.0,
    isEdited: false,
  }
];

export const MOCK_CURATION_SEGMENTS_AFTER: CurationSegment[] = [
  {
    id: 'seg-1-0',
    segmentId: 'seg-1',
    utteranceIndex: 0,
    originalText: 'halo selamat pagi pemirsa',
    normalizedText: 'Halo selamat pagi pemirsa.',
    originalGlosa: 'halo selamat pagi pemirsa',
    normalizedGlosa: 'halo selamat pagi pemirsa',
    start: 0,
    end: 2.5,
    isEdited: false,
  },
  {
    id: 'seg-2-0',
    segmentId: 'seg-2',
    utteranceIndex: 0,
    originalText: 'hari ini kita denger kabar baik banget',
    normalizedText: 'Hari ini kita mendengar kabar yang sangat baik.',
    originalGlosa: 'hari ini kita dengar kabar baik sangat',
    normalizedGlosa: 'hari ini kita dengar kabar baik sangat',
    start: 2.5,
    end: 5.0,
    isEdited: false,
  },
  {
    id: 'seg-3-0',
    segmentId: 'seg-3',
    utteranceIndex: 0,
    originalText: 'ya udah kita langsung aja liat videonya',
    normalizedText: 'Mari kita langsung melihat videonya.',
    originalGlosa: 'ya sudah kita langsung saja lihat video',
    normalizedGlosa: 'ya sudah kita langsung saja lihat video itu',
    start: 5.0,
    end: 8.0,
    isEdited: false,
  },
  {
    id: 'seg-4-0',
    segmentId: 'seg-4',
    utteranceIndex: 0,
    originalText: 'eh emm',
    normalizedText: '',
    originalGlosa: 'eh emm',
    normalizedGlosa: '',
    start: 8.0,
    end: 9.5,
    isEdited: false,
  }
];

export function interceptCuratableJobs(realJobs: any[]): any[] {
  return [...DUMMY_CURATION_JOBS, ...realJobs];
}

export function interceptJobSegments(jobId: string, realData: Promise<CurationSegment[]>): Promise<CurationSegment[]> {
  if (jobId === 'cur-dummy-4-normalized' || jobId === 'cur-dummy-5-exported') {
    return Promise.resolve(JSON.parse(JSON.stringify(MOCK_CURATION_SEGMENTS_AFTER)));
  }
  if (jobId.startsWith('cur-dummy-')) {
    return Promise.resolve(JSON.parse(JSON.stringify(MOCK_CURATION_SEGMENTS_BEFORE)));
  }
  return realData;
}

export function interceptAutoNormalize(jobId: string, realData: Promise<CurationSegment[]>): Promise<CurationSegment[]> {
  if (jobId.startsWith('cur-dummy-')) {
    return new Promise(resolve => setTimeout(() => resolve(JSON.parse(JSON.stringify(MOCK_CURATION_SEGMENTS_AFTER))), 1000));
  }
  return realData;
}

export function interceptApplyNormalization(jobId: string, realData: Promise<any>): Promise<any> {
  if (jobId.startsWith('cur-dummy-')) {
    return Promise.resolve({
      job_id: jobId,
      utterances_updated: 3,
      curation_status: 'NORMALIZED'
    });
  }
  return realData;
}

export function interceptApproveVideo(videoId: string, realData: Promise<any>): Promise<any> {
  if (videoId.startsWith('cur-dummy-')) {
    return Promise.resolve({
      success: true,
      video_id: videoId,
      curation_status: 'READY_TO_EXPORT'
    });
  }
  return realData;
}
