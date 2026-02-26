import { AppLayout } from '@/shared/components/layout/app-layout';
import { ExportPage } from '@/features/export';

export default function ExportRoute() {
  return (
    <AppLayout activePath="/export">
      <ExportPage />
    </AppLayout>
  );
}
