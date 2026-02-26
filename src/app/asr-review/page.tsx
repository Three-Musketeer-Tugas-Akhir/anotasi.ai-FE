import { AppLayout } from '@/shared/components/layout/app-layout';
import { AsrReviewPage } from '@/features/asr-review';

export default function AsrReviewRoute() {
  return (
    <AppLayout activePath="/asr-review">
      <AsrReviewPage />
    </AppLayout>
  );
}
