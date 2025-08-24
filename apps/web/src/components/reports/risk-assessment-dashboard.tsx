'use client';

import { ComplianceRiskAssessment } from '@/types/compliance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  ShieldIcon,
  ShieldCheckIcon,
  ShieldAlertIcon,
  ShieldXIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  InfoIcon
} from 'lucide-react';

interface RiskAssessmentDashboardProps {
  data: ComplianceRiskAssessment;
}

const RISK_ICONS = {
  low: ShieldCheckIcon,
  medium: ShieldAlertIcon,
  high: ShieldAlertIcon,
  critical: ShieldXIcon,
};

const RISK_COLORS = {
  low: 'text-green-600',
  medium: 'text-yellow-600',
  high: 'text-orange-600',
  critical: 'text-red-600',
};

const RISK_BACKGROUNDS = {
  low: 'bg-green-50 border-green-200',
  medium: 'bg-yellow-50 border-yellow-200',
  high: 'bg-orange-50 border-orange-200',
  critical: 'bg-red-50 border-red-200',
};

const RISK_DESCRIPTIONS = {
  low: 'Your compliance posture is strong with minimal risk exposure. Continue current practices.',
  medium: 'Some areas need attention but overall compliance is acceptable. Monitor closely.',
  high: 'Significant compliance risks identified. Immediate action recommended.',
  critical: 'Critical compliance violations detected. Urgent intervention required.',
};

export function RiskAssessmentDashboard({ data }: RiskAssessmentDashboardProps) {
  const RiskIcon = RISK_ICONS[data.riskLevel];
  const riskColor = RISK_COLORS[data.riskLevel];
  const riskBackground = RISK_BACKGROUNDS[data.riskLevel];
  
  const getRiskBadgeVariant = (level: string) => {
    switch (level) {
      case 'low': return 'default';
      case 'medium': return 'secondary';
      case 'high': return 'secondary';
      case 'critical': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Risk Overview */}
      <Card className={`${riskBackground}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <RiskIcon className={`h-8 w-8 ${riskColor}`} />
              <div>
                <CardTitle className="text-[15px] font-bold flex items-center gap-2">
                  Overall Risk Assessment
                  <Badge variant={getRiskBadgeVariant(data.riskLevel)}>
                    {data.riskLevel.charAt(0).toUpperCase() + data.riskLevel.slice(1)} Risk
                  </Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {RISK_DESCRIPTIONS[data.riskLevel]}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold mb-1" style={{ color: RISK_COLORS[data.riskLevel] }}>
                {data.score}
              </div>
              <div className="text-sm text-muted-foreground">Risk Score</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress 
            value={data.score} 
            className="h-3"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>0 (Critical)</span>
            <span>50 (Medium)</span>
            <span>100 (Low Risk)</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Risk Factors */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px] font-bold">Risk Factor Analysis</CardTitle>
            <p className="text-[13px] text-muted-foreground">
              Weighted factors contributing to overall risk score
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {data.factors.map((factor, index) => {
                const factorScore = factor.score;
                let factorRisk: 'low' | 'medium' | 'high' | 'critical';
                
                if (factorScore >= 85) factorRisk = 'low';
                else if (factorScore >= 70) factorRisk = 'medium';
                else if (factorScore >= 50) factorRisk = 'high';
                else factorRisk = 'critical';
                
                const contribution = (factor.score * factor.weight);
                
                return (
                  <div key={index} className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{factor.name}</h4>
                          <Badge 
                            variant={getRiskBadgeVariant(factorRisk)}
                            className="text-xs"
                          >
                            {factorRisk}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {factor.description}
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <div className="font-bold text-lg">{factor.score}</div>
                        <div className="text-xs text-muted-foreground">
                          Weight: {(factor.weight * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Progress 
                        value={factor.score} 
                        className="h-2"
                      />
                      <div className="text-xs text-muted-foreground">
                        Contributes {contribution.toFixed(1)} points to overall score
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px] font-bold flex items-center gap-2">
              <InfoIcon className="h-5 w-5" />
              Recommendations
            </CardTitle>
            <p className="text-[13px] text-muted-foreground">
              Actionable steps to improve your compliance posture
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recommendations.map((recommendation, index) => {
                const isUrgent = recommendation.toLowerCase().includes('urgent') || 
                               recommendation.toLowerCase().includes('immediate');
                
                return (
                  <div 
                    key={index}
                    className={`p-4 rounded-lg border-l-4 ${
                      isUrgent 
                        ? 'bg-red-50 border-l-red-500 border border-red-200' 
                        : 'bg-blue-50 border-l-blue-500 border border-blue-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {isUrgent ? (
                        <AlertTriangleIcon className="h-5 w-5 text-red-600 mt-0.5" />
                      ) : (
                        <CheckCircleIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            Step {index + 1}
                          </span>
                          {isUrgent && (
                            <Badge variant="destructive" className="text-xs">
                              Urgent
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm">{recommendation}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}