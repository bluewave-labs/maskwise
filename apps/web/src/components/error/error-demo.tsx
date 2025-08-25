'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BugIcon, AlertTriangleIcon } from 'lucide-react';

/**
 * Error Demo Component
 * 
 * This component is used to test error boundaries in development.
 * It provides buttons to trigger different types of errors.
 * Remove this component in production builds.
 */

interface ErrorDemoProps {
  level?: 'component' | 'section' | 'page';
}

export function ErrorDemo({ level = 'component' }: ErrorDemoProps) {
  const [errorType, setErrorType] = useState<string | null>(null);

  // Only show in development
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const triggerError = (type: string) => {
    setErrorType(type);
    
    switch (type) {
      case 'render':
        // This will cause a render error
        throw new Error(`Render error triggered in ${level} level error boundary test`);
      
      case 'async':
        // Async errors won't be caught by error boundaries, but we can simulate
        setTimeout(() => {
          throw new Error(`Async error triggered in ${level} level - this won't be caught by error boundary`);
        }, 100);
        break;
        
      case 'null-reference':
        // Null reference error
        const nullObj: any = null;
        return nullObj.someProperty.nestedProperty;
        
      case 'type-error':
        // Type error
        const someString: any = "Hello";
        return someString.push('world');
        
      default:
        throw new Error('Unknown error type');
    }
  };

  const ErrorTrigger = ({ type, label, description }: { type: string; label: string; description: string }) => (
    <div className="p-3 border rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-[13px] font-medium">{label}</h4>
        <Button
          size="sm"
          variant="destructive"
          className="h-7 text-xs"
          onClick={() => triggerError(type)}
        >
          <BugIcon className="h-3 w-3 mr-1" />
          Trigger
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">{description}</p>
    </div>
  );

  return (
    <Card className="border-orange-200 bg-orange-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-[15px] font-bold flex items-center gap-2">
          <AlertTriangleIcon className="h-4 w-4 text-orange-600" />
          Error Boundary Demo
          <Badge variant="outline" className="text-xs">
            {level.toUpperCase()}
          </Badge>
        </CardTitle>
        <p className="text-[13px] text-muted-foreground">
          Test error boundary behavior by triggering different types of errors.
          <br />
          <strong>Development only</strong> - This component is hidden in production.
        </p>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <ErrorTrigger
          type="render"
          label="Render Error"
          description="Throws an error during component render phase (caught by error boundary)"
        />
        
        <ErrorTrigger
          type="null-reference"
          label="Null Reference Error"
          description="Attempts to access property of null object (caught by error boundary)"
        />
        
        <ErrorTrigger
          type="type-error"
          label="Type Error"
          description="Calls method that doesn't exist on string (caught by error boundary)"
        />
        
        <ErrorTrigger
          type="async"
          label="Async Error"
          description="Throws error in setTimeout (NOT caught by error boundary - check console)"
        />
        
        <div className="mt-4 p-2 bg-blue-50 border border-blue-200 rounded text-[11px] text-blue-700">
          <strong>Note:</strong> Only synchronous errors in render, lifecycle methods, 
          and constructors are caught by React Error Boundaries. Async errors, 
          event handlers, and errors in useEffect are not caught.
        </div>
      </CardContent>
    </Card>
  );
}

// Helper component that always throws an error for testing
export function AlwaysErrorComponent({ message = "This component always throws an error for testing" }: { message?: string }) {
  if (process.env.NODE_ENV === 'production') {
    return <div className="p-4 text-center text-muted-foreground">Error demo hidden in production</div>;
  }
  
  throw new Error(message);
}