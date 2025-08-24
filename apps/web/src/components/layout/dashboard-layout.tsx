'use client';

import { ReactNode, useEffect, useState } from 'react';
import { Sidebar } from './sidebar';
import { ErrorBoundary } from '@/components/error/error-boundary';

interface DashboardLayoutProps {
  children: ReactNode;
  pageTitle?: string;
  pageDescription?: string;
}

export function DashboardLayout({ children, pageTitle, pageDescription }: DashboardLayoutProps) {
  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-background">
        <Sidebar className="flex-shrink-0" />
        <main className="flex-1 overflow-auto" style={{ 
          background: `
            linear-gradient(
              135deg,
              #FDFDFC 0%,
              #F8F9FA 50%,
              #FDFDFC 100%
            )
          `
        }}>
          {pageTitle && (
            <div className="px-8 py-3 min-h-[60px] flex items-center border-b border-border">
              <div>
                <h1 className="text-[15px] font-bold text-foreground">{pageTitle}</h1>
                {pageDescription && (
                  <p className="text-muted-foreground text-[13px] mt-1">
                    {pageDescription}
                  </p>
                )}
              </div>
            </div>
          )}
          <div className="p-8">
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
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
}