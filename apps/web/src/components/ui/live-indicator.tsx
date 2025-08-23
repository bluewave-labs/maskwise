import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Activity, Clock, WifiOff } from 'lucide-react';

interface LiveIndicatorProps {
  /**
   * Whether polling is currently active (fast polling)
   */
  isActive: boolean;
  
  /**
   * Whether currently executing a poll request
   */
  isPolling?: boolean;
  
  /**
   * Whether polling is paused (e.g., page hidden)
   */
  isPaused?: boolean;
  
  /**
   * Number of consecutive errors
   */
  errorCount?: number;
  
  /**
   * Time until next poll in milliseconds
   */
  nextPollIn?: number;
  
  /**
   * Current polling interval in milliseconds
   */
  interval?: number;
  
  /**
   * Show detailed status information
   */
  showDetails?: boolean;
  
  /**
   * Custom className
   */
  className?: string;
}

export function LiveIndicator({
  isActive,
  isPolling = false,
  isPaused = false,
  errorCount = 0,
  nextPollIn = 0,
  interval = 0,
  showDetails = false,
  className = ''
}: LiveIndicatorProps) {
  // Determine status and appearance
  const getStatusInfo = () => {
    if (errorCount > 0) {
      return {
        label: 'Connection Issues',
        variant: 'destructive' as const,
        icon: WifiOff,
        pulse: false
      };
    }
    
    if (isPaused) {
      return {
        label: 'Paused',
        variant: 'secondary' as const,
        icon: Clock,
        pulse: false
      };
    }
    
    if (isActive) {
      return {
        label: isPolling ? 'Updating...' : 'Live',
        variant: 'default' as const,
        icon: Activity,
        pulse: true
      };
    }
    
    return {
      label: 'Idle',
      variant: 'secondary' as const,
      icon: Clock,
      pulse: false
    };
  };

  const { label, variant, icon: Icon, pulse } = getStatusInfo();

  const formatTime = (ms: number): string => {
    if (ms <= 0) return '0s';
    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Badge variant={variant} className="flex items-center space-x-1">
        <Icon className={`h-3 w-3 ${pulse ? 'animate-pulse' : ''}`} />
        <span className="text-[13px]">{label}</span>
      </Badge>
      
      {showDetails && (
        <div className="text-[13px] text-muted-foreground">
          {isActive ? (
            <span>Every {formatTime(interval)}</span>
          ) : (
            <span>Next: {formatTime(nextPollIn)}</span>
          )}
          {errorCount > 0 && (
            <span className="text-red-500 ml-2">
              {errorCount} error{errorCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Simplified version for common use cases
export function SimpleLiveIndicator({ 
  isActive, 
  isPolling = false,
  className = ''
}: Pick<LiveIndicatorProps, 'isActive' | 'isPolling' | 'className'>) {
  return (
    <LiveIndicator
      isActive={isActive}
      isPolling={isPolling}
      className={className}
    />
  );
}