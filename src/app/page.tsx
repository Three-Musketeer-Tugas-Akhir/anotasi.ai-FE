import { AppLayout } from '@/shared/components/layout/app-layout';
import { DashboardPage } from '@/features/dashboard';

export default function Home() {
  return (
    <AppLayout activePath="/">
      <DashboardPage />
    </AppLayout>
  );
}
