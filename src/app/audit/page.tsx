import { AppLayout } from '@/shared/components/layout/app-layout';
import { AuditPage } from '@/features/audit';

export default function AuditRoute() {
  return (
    <AppLayout activePath="/audit">
      <AuditPage />
    </AppLayout>
  );
}
