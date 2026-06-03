import {
  JobListDetailedResponse,
  JobStatusDetailResponse,
  Stage1ResultsResponse,
  Stage2ResultsResponse,
  Stage3ResultsResponse,
  JOB_STATUS
} from './types';

const now = new Date().toISOString();

export const DUMMY_JOBS: JobStatusDetailResponse[] = [
  {
    id: 'dummy-1-success',
    original_filename: '[FULL] 29 Korban Kapal Tenggelam Masih Hilang | iNews Siang | 04/07',
    status: JOB_STATUS.READY_FOR_ANNOTATION,
    current_stage: null,
    category: 'SIBI',
    progress: 100,
    created_at: now,
    updated_at: now,
    error_message: null,
    total_segments: 3,
    completed_segments: 3,
    created_by: 'user-1',
  },
  {
    id: 'dummy-2-cv2-running',
    original_filename: '[FULL] Detik-Detik Sepeda Motor Terbakar Hebat Usai Isi BBM | iNews Siang | 24/04',
    status: JOB_STATUS.CROPPING,
    current_stage: 'cropping',
    category: 'BISINDO',
    progress: 45,
    created_at: now,
    updated_at: now,
    error_message: null,
    total_segments: 4,
    completed_segments: 2,
    created_by: 'user-1',
  },
  {
    id: 'dummy-3-cv2-failed',
    original_filename: '[FULL] HARI INI! Demo Ojol Tuntut Potongan Aplikasi | iNews Siang | 20/05',
    status: JOB_STATUS.CROPPING_FAILED,
    current_stage: 'cropping',
    category: 'SIBI',
    progress: 0,
    created_at: now,
    updated_at: now,
    error_message: 'Out of memory during video rendering',
    total_segments: 2,
    completed_segments: 0,
    created_by: 'user-1',
  },
  {
    id: 'dummy-4-retry',
    original_filename: '[FULL] KPK Geledah Rumah Mewah Anak Buah Bobby Nasution | iNews Siang | 03/07',
    status: JOB_STATUS.TRANSCRIBING,
    current_stage: 'asr',
    category: 'BISINDO',
    progress: 20,
    created_at: now,
    updated_at: now,
    error_message: null,
    total_segments: 5,
    completed_segments: 1,
    created_by: 'user-1',
  },
  {
    id: 'dummy-5-asr-running',
    original_filename: '[FULL] Libur Panjang Tol Cipularang Ramai, Didominasi Kendaraan Pribadi| iNews Siang | 30/05',
    status: JOB_STATUS.TRANSCRIBING,
    current_stage: 'asr',
    category: 'SIBI',
    progress: 60,
    created_at: now,
    updated_at: now,
    error_message: null,
    total_segments: 3,
    completed_segments: 1,
    created_by: 'user-1',
  },
  {
    id: 'dummy-6-cv1-running',
    original_filename: '[FULL] Libur Panjang, Volume Kendaraan Menuju Jakarta Meningkat  | iNews Siang | 29/6',
    status: JOB_STATUS.DETECTING,
    current_stage: 'detection',
    category: 'BISINDO',
    progress: 30,
    created_at: now,
    updated_at: now,
    error_message: null,
    total_segments: 0,
    completed_segments: 0,
    created_by: 'user-1',
  },
];

export const MOCK_STAGE1: Stage1ResultsResponse = {
  id: '',
  results: [
    {
      id: 'seg-1',
      segment_index: 0,
      bbox_data: { x_min: 0.1, y_min: 0.1, width: 0.5, height: 0.5 },
      url: 'https://www.w3schools.com/html/mov_bbb.mp4',
    },
    {
      id: 'seg-2',
      segment_index: 1,
      bbox_data: { x_min: 0.2, y_min: 0.2, width: 0.5, height: 0.5 },
      url: 'https://www.w3schools.com/html/mov_bbb.mp4',
    }
  ]
};

export const MOCK_STAGE2: Stage2ResultsResponse = {
  id: '',
  results: [
    {
      segment_id: 'seg-1',
      asr_review_flag: false,
      utterances: [
        {
          id: 'utt-1',
          utterance_index: 0,
          text: 'Halo semuanya',
          start: 0,
          end: 2,
          confidence: 0.95,
          url: null,
          audio_url: null,
          status: 'pending',
        }
      ]
    },
    {
      segment_id: 'seg-2',
      asr_review_flag: true,
      utterances: [
        {
          id: 'utt-2',
          utterance_index: 0,
          text: 'selamat datang di Ainus',
          start: 0,
          end: 3,
          confidence: 0.65,
          url: null,
          audio_url: null,
          status: 'pending',
        }
      ]
    }
  ]
};

export const MOCK_STAGE3: Stage3ResultsResponse = {
  id: '',
  summary: { total_utterances: 2, cropped: 2, failed: 0, pending: 0 },
  results: [
    {
      segment_id: 'seg-1',
      asr_review_flag: false,
      utterances: [
        {
          id: 'utt-1',
          utterance_index: 0,
          text: 'Halo semuanya',
          start: 0,
          end: 2,
          confidence: 0.95,
          url: 'https://www.w3schools.com/html/mov_bbb.mp4',
          status: 'cropped',
        }
      ]
    },
    {
      segment_id: 'seg-2',
      asr_review_flag: true,
      utterances: [
        {
          id: 'utt-2',
          utterance_index: 0,
          text: 'selamat datang di Ainus',
          start: 0,
          end: 3,
          confidence: 0.65,
          url: 'https://www.w3schools.com/html/mov_bbb.mp4',
          status: 'cropped',
        }
      ]
    }
  ]
};

export function interceptListJobs(realData: JobListDetailedResponse): JobListDetailedResponse {
  return {
    ...realData,
    items: [...DUMMY_JOBS, ...realData.items],
    total: realData.total + DUMMY_JOBS.length,
  };
}

export function interceptGetJob(jobId: string, realData: Promise<JobStatusDetailResponse>): Promise<JobStatusDetailResponse> {
  const dummy = DUMMY_JOBS.find(j => j.id === jobId);
  if (dummy) return Promise.resolve(dummy);
  return realData;
}

export function interceptStage1(jobId: string, realData: Promise<Stage1ResultsResponse>): Promise<Stage1ResultsResponse> {
  if (jobId.startsWith('dummy-')) return Promise.resolve({ ...MOCK_STAGE1, id: jobId });
  return realData;
}

export function interceptStage2(jobId: string, realData: Promise<Stage2ResultsResponse>): Promise<Stage2ResultsResponse> {
  if (jobId.startsWith('dummy-')) return Promise.resolve({ ...MOCK_STAGE2, id: jobId });
  return realData;
}

export function interceptStage3(jobId: string, realData: Promise<Stage3ResultsResponse>): Promise<Stage3ResultsResponse> {
  if (jobId.startsWith('dummy-')) return Promise.resolve({ ...MOCK_STAGE3, id: jobId });
  return realData;
}
