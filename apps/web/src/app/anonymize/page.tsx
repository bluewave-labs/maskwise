'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { AnonymizationWorkflow } from '@/components/datasets/anonymization-workflow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  FileText, 
  ArrowRight, 
  CheckCircle2,
  Info,
  Sparkles
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function AnonymizePage() {
  const router = useRouter();
  const [showWorkflow, setShowWorkflow] = useState(false);
  const [workflowCompleted, setWorkflowCompleted] = useState(false);

  const handleStartWorkflow = () => {
    setShowWorkflow(true);
    setWorkflowCompleted(false);
  };

  const handleWorkflowComplete = () => {
    setWorkflowCompleted(true);
    setTimeout(() => {
      router.push('/datasets');
    }, 3000);
  };

  const handleRestartWorkflow = () => {
    setWorkflowCompleted(false);
    setShowWorkflow(true);
  };

  if (workflowCompleted) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[600px]">
          <div className="text-center space-y-6 max-w-md">
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Anonymization Complete!</h2>
              <p className="text-muted-foreground">
                Your file has been successfully anonymized. You can view the results in the datasets page.
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => router.push('/datasets')}>
                View Datasets
              </Button>
              <Button onClick={handleRestartWorkflow} variant="outline">
                Anonymize Another File
              </Button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (showWorkflow) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Anonymization Workflow</h1>
            <p className="text-muted-foreground mt-1">
              Follow the guided steps to detect and anonymize PII in your files
            </p>
          </div>

          <AnonymizationWorkflow 
            onComplete={handleWorkflowComplete}
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Data Anonymization</h1>
          <p className="text-muted-foreground mt-1">
            Protect sensitive information with our guided anonymization workflow
          </p>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Guided Workflow</AlertTitle>
          <AlertDescription>
            Our step-by-step process will help you upload files, detect PII, review findings, 
            and apply anonymization policies to protect sensitive data.
          </AlertDescription>
        </Alert>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Feature Cards */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Shield className="h-5 w-5 text-blue-600" />
                </div>
                <CardTitle className="text-base">PII Detection</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Automatically identify 15+ types of sensitive information including names, 
                emails, phone numbers, SSNs, and credit cards.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FileText className="h-5 w-5 text-green-600" />
                </div>
                <CardTitle className="text-base">Policy-Based Rules</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Apply pre-configured policies like GDPR, HIPAA, or Financial Services 
                to ensure compliance with regulations.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                </div>
                <CardTitle className="text-base">Smart Anonymization</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Choose from multiple anonymization techniques including redaction, 
                masking, replacement, and encryption.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Workflow Steps Preview */}
        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
            <CardDescription>
              Complete the anonymization process in 6 simple steps
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <Badge variant="outline" className="w-8 h-8 rounded-full p-0 flex items-center justify-center">
                    1
                  </Badge>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Setup</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select your project and anonymization policy
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <Badge variant="outline" className="w-8 h-8 rounded-full p-0 flex items-center justify-center">
                    2
                  </Badge>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Upload</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload files for PII analysis
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <Badge variant="outline" className="w-8 h-8 rounded-full p-0 flex items-center justify-center">
                    3
                  </Badge>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Detect</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Automatically identify sensitive data
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <Badge variant="outline" className="w-8 h-8 rounded-full p-0 flex items-center justify-center">
                    4
                  </Badge>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Review</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Review detected PII findings
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <Badge variant="outline" className="w-8 h-8 rounded-full p-0 flex items-center justify-center">
                    5
                  </Badge>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Anonymize</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Apply anonymization techniques
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <Badge variant="outline" className="w-8 h-8 rounded-full p-0 flex items-center justify-center">
                    6
                  </Badge>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Download</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Export anonymized results
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Start Button */}
        <div className="flex justify-center pt-6">
          <Button 
            size="lg" 
            onClick={handleStartWorkflow}
            className="gap-2"
          >
            <Shield className="h-5 w-5" />
            Start Anonymization Workflow
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}