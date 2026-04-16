import { AppLayout } from '@/shared/components/layout/app-layout';
import { ChatPage } from '@/features/chat';

export default function ChatRoute() {
  return (
    <AppLayout activePath="/chat">
      <ChatPage />
    </AppLayout>
  );
}
