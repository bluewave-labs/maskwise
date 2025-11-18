'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangleIcon, 
  RefreshCwIcon, 
  HomeIcon, 
  BugIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: (props: ErrorFallbackProps) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'page' | 'section' | 'component';
  resetOnPropsChange?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  eventId: string | null;
  showDetails: boolean;
}

export interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  resetError: () => void;
  eventId: string | null;
  level: 'page' | 'section' | 'component';
}

/**
 * Enhanced Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in the child component tree and displays
 * a fallback UI with recovery options. Supports different error levels and
 * comprehensive error logging.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const eventId = this.logErrorToService(error, errorInfo);
    
    this.setState({
      errorInfo,
      eventId,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: Props) {
    const { resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    // Auto-reset error boundary when props change (useful for route changes)
    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetError();
    }
  }

  logErrorToService = (error: Error, errorInfo: ErrorInfo): string => {
    // Generate cryptographically secure random string
    const array = new Uint8Array(9);
    crypto.getRandomValues(array);
    const randomString = Array.from(array, byte => byte.toString(36)).join('').slice(0, 9);
    const eventId = `err_${Date.now()}_${randomString}`;

    const errorDetails = {
      eventId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      level: this.props.level || 'component',
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Error Boundary Caught Error [${eventId}]`);
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Full Details:', errorDetails);
      console.groupEnd();
    }

    // Here you would typically send to your error tracking service
    // Example: Sentry, LogRocket, Bugsnag, etc.
    // await errorTrackingService.captureException(error, errorDetails);

    return eventId;
  };

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null,
      showDetails: false,
    });
  };

  toggleDetails = () => {
    this.setState(prev => ({
      showDetails: !prev.showDetails
    }));
  };

  render() {
    const { hasError, error, errorInfo, eventId, showDetails } = this.state;
    const { children, fallback, level = 'component' } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback({
          error,
          errorInfo,
          resetError: this.resetError,
          eventId,
          level,
        });
      }

      // Default fallback UI based on level
      return (
        <DefaultErrorFallback
          error={error}
          errorInfo={errorInfo}
          resetError={this.resetError}
          eventId={eventId}
          level={level}
          showDetails={showDetails}
          toggleDetails={this.toggleDetails}
        />
      );
    }

    return children;
  }
}

interface DefaultErrorFallbackProps extends ErrorFallbackProps {
  showDetails: boolean;
  toggleDetails: () => void;
}

function DefaultErrorFallback({
  error,
  errorInfo,
  resetError,
  eventId,
  level,
  showDetails,
  toggleDetails,
}: DefaultErrorFallbackProps) {
  const isPageLevel = level === 'page';
  const isSectionLevel = level === 'section';

  return (
    <Card className={`${isPageLevel ? 'mx-auto max-w-2xl mt-12' : ''} ${isSectionLevel ? 'border-destructive/20' : ''}`}>
      <CardHeader className="text-center">
        <div className="flex items-center justify-center mb-4">
          <div className="rounded-full bg-destructive/10 p-3">
            <AlertTriangleIcon className="h-8 w-8 text-destructive" />
          </div>
        </div>
        
        <CardTitle className="text-[15px] font-bold flex items-center justify-center gap-2">
          {isPageLevel && 'Application Error'}
          {isSectionLevel && 'Section Error'}
          {level === 'component' && 'Component Error'}
          
          {eventId && (
            <Badge variant="outline" className="text-xs font-mono">
              {eventId}
            </Badge>
          )}
        </CardTitle>
        
        <p className="text-[13px] text-muted-foreground">
          {isPageLevel && 'The application encountered an unexpected error. We\'ve been notified and will fix this issue.'}
          {isSectionLevel && 'This section is temporarily unavailable. Other parts of the application should still work.'}
          {level === 'component' && 'This component failed to load. Please try refreshing or contact support.'}
        </p>
      </CardHeader>
      
      <CardContent className="text-center space-y-4">
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 justify-center">
          <Button onClick={resetError} size="sm" className="h-8">
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          
          {!isPageLevel && (
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8"
              onClick={() => window.location.reload()}
            >
              <RefreshCwIcon className="h-4 w-4 mr-2" />
              Reload Page
            </Button>
          )}
          
          {isPageLevel && (
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8"
              onClick={() => window.location.href = '/dashboard'}
            >
              <HomeIcon className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          )}
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8"
            onClick={toggleDetails}
          >
            <BugIcon className="h-4 w-4 mr-2" />
            {showDetails ? 'Hide' : 'Show'} Details
            {showDetails ? (
              <ChevronUpIcon className="h-4 w-4 ml-1" />
            ) : (
              <ChevronDownIcon className="h-4 w-4 ml-1" />
            )}
          </Button>
        </div>

        {/* Error Details (Collapsible) */}
        {showDetails && (
          <div className="mt-6 p-4 bg-muted/30 rounded-lg text-left">
            <h4 className="text-[13px] font-semibold mb-2">Error Details</h4>
            
            {error && (
              <div className="mb-3">
                <p className="text-[11px] font-medium text-muted-foreground mb-1">Message:</p>
                <p className="text-[11px] font-mono text-destructive bg-background p-2 rounded border">
                  {error.message}
                </p>
              </div>
            )}
            
            {error?.stack && (
              <div className="mb-3">
                <p className="text-[11px] font-medium text-muted-foreground mb-1">Stack Trace:</p>
                <pre className="text-[10px] font-mono text-muted-foreground bg-background p-2 rounded border overflow-x-auto max-h-32 overflow-y-auto">
                  {error.stack}
                </pre>
              </div>
            )}
            
            {errorInfo?.componentStack && (
              <div>
                <p className="text-[11px] font-medium text-muted-foreground mb-1">Component Stack:</p>
                <pre className="text-[10px] font-mono text-muted-foreground bg-background p-2 rounded border overflow-x-auto max-h-32 overflow-y-auto">
                  {errorInfo.componentStack}
                </pre>
              </div>
            )}
          </div>
        )}
        
        {/* Support Information */}
        <div className="mt-6 pt-4 border-t text-center">
          <p className="text-[11px] text-muted-foreground">
            If this problem persists, please contact support with error ID: <strong>{eventId}</strong>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Convenience wrapper for different error boundary levels
export function PageErrorBoundary({ children, ...props }: Omit<Props, 'level'>) {
  return (
    <ErrorBoundary level="page" resetOnPropsChange={true} {...props}>
      {children}
    </ErrorBoundary>
  );
}

export function SectionErrorBoundary({ children, ...props }: Omit<Props, 'level'>) {
  return (
    <ErrorBoundary level="section" {...props}>
      {children}
    </ErrorBoundary>
  );
}

export function ComponentErrorBoundary({ children, ...props }: Omit<Props, 'level'>) {
  return (
    <ErrorBoundary level="component" {...props}>
      {children}
    </ErrorBoundary>
  );
}