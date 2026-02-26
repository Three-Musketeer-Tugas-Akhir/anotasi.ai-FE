import { AppLayout } from '@/shared/components/layout/app-layout';
import { CurationPage } from '@/features/curation';

export default function CurationRoute() {
  return (
    <AppLayout activePath="/curation">
      <CurationPage />
    </AppLayout>
  );
}
