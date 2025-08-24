'use client';

import { ReactNode, useEffect, useState } from 'react';
import { Sidebar } from './sidebar';
import { NotificationIcon } from './notification-icon';
import { ErrorBoundary } from '@/components/error/error-boundary';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { usePageTooltip } from '@/hooks/usePageTooltip';
import { WelcomeModal } from '@/components/onboarding/welcome-modal';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useAuth } from '@/hooks/useAuth';

interface DashboardLayoutProps {
  children: ReactNode;
  pageTitle?: string;
  pageDescription?: string;
}

export function DashboardLayout({ children, pageTitle, pageDescription }: DashboardLayoutProps) {
  const { hasTooltip, tooltipContent } = usePageTooltip();
  const { user } = useAuth();
  const { showOnboarding, completeOnboarding } = useOnboarding();
  
  return (
    <ErrorBoundary>
      {/* Global Onboarding Modal */}
      <WelcomeModal 
        isOpen={showOnboarding}
        onClose={completeOnboarding}
        userName={user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email}
      />
      
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
            <div className="px-8 py-3 min-h-[60px] flex items-center justify-between border-b border-border">
              <div>
                <div className="flex items-center">
                  <h1 className="text-[15px] font-bold text-foreground">{pageTitle}</h1>
                  {hasTooltip && tooltipContent && (
                    <div className="ml-1">
                      <InfoTooltip
                        title={tooltipContent.title}
                        description={tooltipContent.description}
                        features={tooltipContent.features}
                      />
                    </div>
                  )}
                </div>
                {pageDescription && (
                  <p className="text-muted-foreground text-[13px] mt-1">
                    {pageDescription}
                  </p>
                )}
              </div>
              <NotificationIcon />
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