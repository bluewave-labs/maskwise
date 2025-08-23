'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorId: string;
}

/**
 * Global Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in the child component tree and displays
 * a fallback UI with recovery options. Provides error reporting and retry mechanisms.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Generate unique error ID for tracking
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console for development
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, you would send this to your error reporting service
    this.logErrorToService(error, errorInfo);
  }

  private logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // Mock error reporting - in production, send to service like Sentry
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // For now, just log to console
    console.error('Error Report:', errorReport);

    // In production, send to error tracking service:
    // fetch('/api/errors', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(errorReport)
    // });
  };

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorId: ''
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  private handleReportBug = () => {
    const subject = encodeURIComponent(`Bug Report: ${this.state.error?.message || 'Unknown Error'}`);
    const body = encodeURIComponent(`
Error ID: ${this.state.errorId}
Error Message: ${this.state.error?.message}
Stack: ${this.state.error?.stack}
Timestamp: ${new Date().toISOString()}
URL: ${window.location.href}
User Agent: ${navigator.userAgent}

Please describe what you were doing when this error occurred:
[Your description here]
    `);
    
    // Open email client with pre-filled bug report
    window.location.href = `mailto:support@maskwise.com?subject=${subject}&body=${body}`;
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error!, this.handleRetry);
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-lg w-full p-8 text-center">
            <div className="mb-6">
              <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Something went wrong
              </h1>
              <p className="text-muted-foreground mb-4">
                We apologize for the inconvenience. An unexpected error occurred while loading this page.
              </p>
              
              {this.state.error && (
                <details className="text-left mb-4">
                  <summary className="cursor-pointer text-[13px] text-muted-foreground hover:text-foreground">
                    Technical Details
                  </summary>
                  <div className="mt-2 p-3 bg-muted rounded-md text-[13px] font-mono break-all">
                    <div className="mb-2">
                      <strong>Error ID:</strong> {this.state.errorId}
                    </div>
                    <div className="mb-2">
                      <strong>Message:</strong> {this.state.error.message}
                    </div>
                    {this.state.error.stack && (
                      <div>
                        <strong>Stack:</strong>
                        <pre className="mt-1 whitespace-pre-wrap">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex gap-2 justify-center">
                <Button
                  onClick={this.handleRetry}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
                
                <Button
                  variant="outline"
                  onClick={this.handleReload}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reload Page
                </Button>
              </div>

              <div className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  onClick={this.handleGoHome}
                  className="flex items-center gap-2"
                >
                  <Home className="h-4 w-4" />
                  Go to Dashboard
                </Button>
                
                <Button
                  variant="outline"
                  onClick={this.handleReportBug}
                  className="flex items-center gap-2"
                >
                  <Bug className="h-4 w-4" />
                  Report Bug
                </Button>
              </div>
            </div>

            <div className="mt-6 text-[13px] text-muted-foreground">
              <p>Error ID: {this.state.errorId}</p>
              <p>If this problem persists, please contact support with the error ID.</p>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}