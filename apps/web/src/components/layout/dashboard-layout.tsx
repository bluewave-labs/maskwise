'use client';

import { ReactNode, useEffect, useState } from 'react';
import { Sidebar } from './sidebar';
import { NotificationIcon } from './notification-icon';
import { SectionErrorBoundary, ComponentErrorBoundary } from '@/components/error/error-boundary';
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
    <SectionErrorBoundary>
      {/* Global Onboarding Modal */}
      <ComponentErrorBoundary>
        <WelcomeModal 
          isOpen={showOnboarding}
          onClose={completeOnboarding}
          userName={user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email}
        />
      </ComponentErrorBoundary>
      
      <div className="flex h-screen bg-background">
        <ComponentErrorBoundary>
          <Sidebar className="flex-shrink-0" />
        </ComponentErrorBoundary>
        
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
            <ComponentErrorBoundary>
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
            </ComponentErrorBoundary>
          )}
          
          <div className="p-8">
            <SectionErrorBoundary>
              {children}
            </SectionErrorBoundary>
          </div>
        </main>
      </div>
    </SectionErrorBoundary>
  );
}