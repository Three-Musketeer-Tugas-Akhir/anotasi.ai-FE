import { AppLayout } from '@/shared/components/layout/app-layout';
import { PipelinePage } from '@/features/pipeline';

export default function PipelineRoute() {
  return (
    <AppLayout activePath="/pipeline">
      <PipelinePage />
    </AppLayout>
  );
}
