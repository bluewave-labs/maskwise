'use client';

import { SimpleAnimatedTabs } from '@/components/ui/simple-animated-tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestTabsPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Animated Tabs Test</h1>
      
      <SimpleAnimatedTabs 
        tabs={[
          { label: 'First Tab', value: 'tab1' },
          { label: 'Second Tab', value: 'tab2' },
          { label: 'Third Tab', value: 'tab3' },
          { label: 'Fourth Tab', value: 'tab4' }
        ]}
        defaultTab="tab1"
        className="mb-6"
      />

      <Card>
        <CardHeader>
          <CardTitle>Test Content</CardTitle>
        </CardHeader>
        <CardContent>
          <p>This is test content to verify the animated tabs are working correctly.</p>
        </CardContent>
      </Card>
    </div>
  );
}