'use client';

import { AnonymizationResultsViewer } from '@/components/datasets/anonymization-results-viewer';
import { useRouter } from 'next/navigation';

interface AnonymizedPageProps {
  params: {
    id: string;
  };
}

export default function AnonymizedPage({ params }: AnonymizedPageProps) {
  const router = useRouter();

  const handleBack = () => {
    router.push('/datasets');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <AnonymizationResultsViewer 
        datasetId={params.id}
        onBack={handleBack}
      />
    </div>
  );
}