'use client';

import { RecentHighRiskFinding } from '@/types/reports';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangleIcon, FileTextIcon } from 'lucide-react';

interface RecentHighRiskFindingsProps {
  data: RecentHighRiskFinding[];
  onFindingClick?: (datasetId: string) => void;
}

const getRiskColor = (riskLevel: 'high' | 'medium' | 'low') => {
  switch (riskLevel) {
    case 'high':
      return 'destructive';
    case 'medium':
      return 'default';
    case 'low':
      return 'secondary';
  }
};

const getEntityTypeColor = (entityType: string) => {
  const highRisk = ['SSN', 'CREDIT_CARD', 'MEDICAL_LICENSE', 'US_PASSPORT', 'US_DRIVER_LICENSE'];
  const mediumRisk = ['EMAIL_ADDRESS', 'PHONE_NUMBER', 'IBAN', 'IP_ADDRESS'];
  
  if (highRisk.includes(entityType)) return 'destructive';
  if (mediumRisk.includes(entityType)) return 'default';
  return 'secondary';
};

export function RecentHighRiskFindings({ data, onFindingClick }: RecentHighRiskFindingsProps) {
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[15px] font-bold flex items-center gap-2">
          <AlertTriangleIcon className="h-5 w-5 text-red-500" />
          Recent High-Risk Findings
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangleIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No high-risk findings found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((finding) => (
              <div
                key={finding.id}
                className={`flex items-start justify-between p-3 rounded-lg border transition-colors ${
                  onFindingClick ? 'cursor-pointer hover:bg-muted/50' : ''
                }`}
                onClick={() => onFindingClick?.(finding.datasetId)}
              >
                <div className="flex items-start gap-3 flex-1">
                  <FileTextIcon className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-[13px] truncate">{finding.datasetName}</p>
                      <Badge variant={getRiskColor(finding.riskLevel)} className="text-xs">
                        {finding.riskLevel.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getEntityTypeColor(finding.entityType)} className="text-xs">
                        {finding.entityType.replace('_', ' ')}
                      </Badge>
                      <span className="text-[13px] text-muted-foreground">
                        {Math.round(finding.confidence * 100)}% confidence
                      </span>
                    </div>
                    <p className="text-[13px] text-muted-foreground">
                      Project: {finding.projectName}
                    </p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                  {formatRelativeTime(finding.createdAt)}
                </div>
              </div>
            ))}
          </div>
        )}
        {data.length > 0 && (
          <div className="mt-4 text-[13px] text-muted-foreground text-center">
            Showing recent {data.length} high-risk findings
          </div>
        )}
      </CardContent>
    </Card>
  );
}