'use client';

import { AssignAnnotationsPage } from '@/features/admin/components/assign-annotations-page';
import { AppLayout } from '@/shared/components/layout/app-layout';

export default function AssignJbiPage() {
  return (
    <AppLayout activePath="/admin/assign-jbi">
      <AssignAnnotationsPage />
    </AppLayout>
  );
}
