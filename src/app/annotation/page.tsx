import { AppLayout } from '@/shared/components/layout/app-layout';
import { AnnotationPage } from '@/features/annotation';

export default function AnnotationRoute() {
  return (
    <AppLayout activePath="/annotation">
      <AnnotationPage />
    </AppLayout>
  );
}
