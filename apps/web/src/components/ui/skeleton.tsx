import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  );
}

export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={cn('rounded-lg border bg-card p-6', className)}>
      <Skeleton className="h-4 w-1/4 mb-2" />
      <Skeleton className="h-8 w-1/2" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b p-4">
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="p-4 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PageSkeleton({ 
  title = true, 
  cards = 0, 
  table = false,
  className 
}: { 
  title?: boolean;
  cards?: number;
  table?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('space-y-6', className)}>
      {title && (
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
      )}
      
      {cards > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: cards }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}
      
      {table && <SkeletonTable />}
    </div>
  );
}

// Enhanced Chart Skeletons
export function SkeletonChart({ 
  type = 'line',
  className 
}: { 
  type?: 'line' | 'bar' | 'pie' | 'area';
  className?: string;
}) {
  return (
    <div className={cn('rounded-lg border bg-card', className)}>
      <div className="p-6">
        <Skeleton className="h-5 w-32 mb-2" />
        <Skeleton className="h-3 w-48 mb-6" />
        
        <div className="h-[300px] relative">
          {type === 'line' && <SkeletonLineChart />}
          {type === 'bar' && <SkeletonBarChart />}
          {type === 'pie' && <SkeletonPieChart />}
          {type === 'area' && <SkeletonAreaChart />}
        </div>
      </div>
    </div>
  );
}

function SkeletonLineChart() {
  return (
    <div className="h-full flex items-end justify-between px-4 pb-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center h-full justify-end">
          <div 
            className="w-2 bg-muted animate-pulse rounded-sm mb-2" 
            style={{ height: `${20 + Math.random() * 60}%` }}
          />
          <Skeleton className="h-2 w-6" />
        </div>
      ))}
      <div className="absolute inset-4">
        <svg className="w-full h-full">
          <path
            d="M 0,80 Q 50,60 100,70 T 200,50 T 300,80"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth="2"
            fill="none"
            className="animate-pulse"
            opacity="0.3"
          />
        </svg>
      </div>
    </div>
  );
}

function SkeletonBarChart() {
  return (
    <div className="h-full flex items-end justify-between px-4 pb-8">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center">
          <div 
            className="w-8 bg-muted animate-pulse rounded-t-sm mb-2"
            style={{ height: `${30 + Math.random() * 50}%` }}
          />
          <Skeleton className="h-3 w-8" />
        </div>
      ))}
    </div>
  );
}

function SkeletonPieChart() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="relative">
        <div className="w-40 h-40 rounded-full border-8 border-muted animate-pulse" />
        <div className="absolute inset-8 w-24 h-24 rounded-full border-4 border-muted/50" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <Skeleton className="h-6 w-16" />
        </div>
      </div>
      <div className="ml-8 space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-muted animate-pulse" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonAreaChart() {
  return (
    <div className="h-full relative px-4 pb-4">
      <div className="absolute inset-4">
        <svg className="w-full h-full">
          <defs>
            <linearGradient id="skeletonGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--muted))" stopOpacity="0.8" />
              <stop offset="100%" stopColor="hsl(var(--muted))" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          <path
            d="M 0,80 Q 50,40 100,50 T 200,30 T 300,60 L 300,100 L 0,100 Z"
            fill="url(#skeletonGradient)"
            className="animate-pulse"
          />
        </svg>
      </div>
    </div>
  );
}

// Form Skeletons
export function SkeletonForm({ fields = 3, className }: { fields?: number; className?: string }) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i}>
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <div className="flex gap-2 pt-4">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-16" />
      </div>
    </div>
  );
}

// Settings/Config Skeleton
export function SkeletonSettings({ sections = 3, className }: { sections?: number; className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      {Array.from({ length: sections }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-6">
          <Skeleton className="h-5 w-32 mb-2" />
          <Skeleton className="h-3 w-64 mb-4" />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-4 w-40 mb-1" />
                <Skeleton className="h-3 w-56" />
              </div>
              <Skeleton className="h-6 w-10 rounded-full" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// File Upload Skeleton
export function SkeletonUpload({ files = 2, className }: { files?: number; className?: string }) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="border-2 border-dashed border-muted rounded-lg p-8">
        <div className="text-center">
          <Skeleton className="h-8 w-8 rounded mx-auto mb-3" />
          <Skeleton className="h-4 w-48 mx-auto mb-2" />
          <Skeleton className="h-3 w-64 mx-auto" />
        </div>
      </div>
      
      {files > 0 && (
        <div className="space-y-2">
          {Array.from({ length: files }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
              <Skeleton className="h-8 w-8 rounded" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-1" />
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full animate-pulse"
                      style={{ width: `${20 + Math.random() * 60}%` }}
                    />
                  </div>
                  <Skeleton className="h-3 w-8" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}