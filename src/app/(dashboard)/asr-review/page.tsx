import { Suspense } from 'react';
import { AsrReviewPage } from '@/features/asr-review';

export default function AsrReviewRoute() {
  return (
    
      <Suspense fallback={<div className="flex-1 flex items-center justify-center"><span className="text-sm text-gray-400">Memuat...</span></div>}>
        <AsrReviewPage />
      </Suspense>
    
  );
}
