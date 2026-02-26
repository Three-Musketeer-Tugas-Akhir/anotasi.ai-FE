import { AppLayout } from '@/shared/components/layout/app-layout';
import { ClassificationPage } from '@/features/classification/components/classification-page';

export default function ClassificationRoute() {
  return (
    <AppLayout activePath="/classification">
      <ClassificationPage />
    </AppLayout>
  );
}
