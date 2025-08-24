'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  FolderOpen, 
  Database, 
  ArrowRight,
  CheckCircle,
  Zap,
  Shield,
  Target
} from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
}

export function WelcomeModal({ isOpen, onClose, userName }: WelcomeModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  // Reset to first step when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  // Handle ESC key press
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      return () => {
        document.removeEventListener('keydown', handleEscKey);
      };
    }
  }, [isOpen, onClose]);

  const steps = [
    {
      icon: <Sparkles className="h-8 w-8 text-blue-400" />,
      title: "Welcome to Maskwise!",
      description: `Hello ${userName || 'there'}! We've prepared everything you need to get started with PII detection and anonymization.`,
      content: "Your workspace is ready and we've set up some helpful resources for you."
    },
    {
      icon: <FolderOpen className="h-8 w-8 text-green-400" />,
      title: "Your First Project",
      description: "We've created 'My First Project' for you - a dedicated workspace to organize your datasets and analysis.",
      content: "Projects help you organize your work and collaborate with your team. You can rename it or create additional projects anytime."
    },
    {
      icon: <Database className="h-8 w-8 text-purple-400" />,
      title: "Sample Dataset Ready",
      description: "A demo dataset with sample PII data has been created and is being analyzed right now.",
      content: "Explore emails, SSNs, credit cards, and more to test Maskwise's detection capabilities."
    }
  ];

  const features = [
    {
      icon: <Shield className="h-5 w-5 text-blue-400" />,
      title: "Advanced PII Detection",
      description: "Detect 15+ types of sensitive data"
    },
    {
      icon: <Zap className="h-5 w-5 text-yellow-400" />,
      title: "Real-time Processing",
      description: "Fast analysis with live status updates"
    },
    {
      icon: <Target className="h-5 w-5 text-green-400" />,
      title: "Policy-Driven",
      description: "Customizable rules for different compliance needs"
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handleSkip = () => {
    onClose();
  };

  // Style C: Premium with Rich Colors and Patterns - Applied to all steps
  const currentStyle = {
    containerClass: "max-w-2xl p-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 border-purple-500/30 overflow-hidden",
    backgroundGradient: "absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-400/20 via-transparent to-blue-600/20",
    overlayClass: "absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%236366f1\" fill-opacity=\"0.05\"%3E%3Ccircle cx=\"30\" cy=\"30\" r=\"4\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]",
    headerBg: "p-3 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 rounded-xl shadow-xl",
    headerIcon: "h-6 w-6 text-white",
    titleClass: "text-xl font-semibold text-white",
    subtitleClass: "text-sm text-purple-200",
    contentTitleClass: "text-2xl font-bold text-white mb-3",
    contentDescClass: "text-purple-100 text-lg leading-relaxed max-w-lg mx-auto mb-2",
    contentSubClass: "text-purple-300 text-sm max-w-md mx-auto",
    progressClass: "bg-gradient-to-r from-purple-400 via-pink-500 to-purple-600 h-3 rounded-full shadow-lg transition-all duration-500",
    buttonClass: "bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 hover:from-purple-600 hover:via-pink-600 hover:to-purple-700 text-white px-6 shadow-xl border border-purple-400/30"
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className={currentStyle.containerClass}>
        <div className={currentStyle.backgroundGradient} />
        <div className={currentStyle.overlayClass} />
        
        <div className="relative z-10">
          {/* Header */}
          <div className="p-8 pb-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className={currentStyle.headerBg}>
                  <Sparkles className={currentStyle.headerIcon} />
                </div>
                <div>
                  <h1 className={currentStyle.titleClass}>Getting Started</h1>
                  <p className={currentStyle.subtitleClass}>Step {currentStep + 1} of {steps.length}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                onClick={handleSkip}
                className="text-gray-400 hover:text-white hover:bg-gray-800"
              >
                Skip tour
              </Button>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-700 rounded-full h-3 mb-6">
              <div 
                className={currentStyle.progressClass}
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Content */}
          <div className="px-8 pb-8">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-gradient-to-r from-purple-800 to-pink-800 shadow-xl rounded-2xl">
                  {steps[currentStep].icon}
                </div>
              </div>
              <h2 className={currentStyle.contentTitleClass}>
                {steps[currentStep].title}
              </h2>
              <p className={currentStyle.contentDescClass}>
                {steps[currentStep].description}
              </p>
              <p className={currentStyle.contentSubClass}>
                {steps[currentStep].content}
              </p>
            </div>



            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex space-x-2">
                {Array.from({ length: steps.length }, (_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      i <= currentStep 
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600' 
                        : 'bg-gray-600'
                    }`}
                  />
                ))}
              </div>

              <div className="flex space-x-3">
                {currentStep > 0 && (
                  <Button
                    variant="ghost"
                    onClick={() => setCurrentStep(currentStep - 1)}
                    className="text-gray-400 hover:text-white hover:bg-gray-800"
                  >
                    Back
                  </Button>
                )}
                <Button
                  onClick={handleNext}
                  className={currentStyle.buttonClass}
                >
                  {currentStep === steps.length - 1 ? (
                    <>
                      Get Started
                      <Sparkles className="h-4 w-4 ml-2" />
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}