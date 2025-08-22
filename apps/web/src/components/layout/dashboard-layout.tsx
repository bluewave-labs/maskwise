'use client';

import { ReactNode } from 'react';
import { Sidebar } from './sidebar';
import { ErrorBoundary } from '@/components/error/error-boundary';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-background">
        <Sidebar className="flex-shrink-0" />
        <main className="flex-1 overflow-auto">
          <ErrorBoundary
            fallback={(error, retry) => (
              <div className="flex items-center justify-center h-full">
                <div className="text-center p-8">
                  <h2 className="text-xl font-semibold mb-2">Content Error</h2>
                  <p className="text-muted-foreground mb-4">
                    {error.message}
                  </p>
                  <button 
                    onClick={retry}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}
          >
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </ErrorBoundary>
  );
}