import { KalimatDetailPage } from '@/features/export/components/kalimat-detail-page';

interface PageProps {
  params: Promise<{
    jobId: string;
    segmentId: string;
    kalimatIndex: string;
  }>;
}

export default async function Route({ params }: PageProps) {
  const resolvedParams = await params;
  
  return (
    <KalimatDetailPage 
      jobId={resolvedParams.jobId} 
      segmentId={resolvedParams.segmentId} 
      kalimatIndex={parseInt(resolvedParams.kalimatIndex, 10)} 
    />
  );
}
