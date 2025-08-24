'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const ONBOARDING_STORAGE_KEY = 'maskwise_onboarding_completed';

interface OnboardingContextType {
  isOnboardingCompleted: boolean | null;
  showOnboarding: boolean;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  skipOnboarding: () => void;
  setShowOnboarding: (show: boolean) => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

interface OnboardingProviderProps {
  children: ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Check localStorage on client side only
    if (typeof window !== 'undefined') {
      const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true';
      setIsOnboardingCompleted(completed);
      
      // Show onboarding if not completed
      if (!completed) {
        // Small delay to ensure the page is loaded and user is authenticated
        const timer = setTimeout(() => {
          setShowOnboarding(true);
        }, 1000);
        
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const completeOnboarding = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
      setIsOnboardingCompleted(true);
      setShowOnboarding(false);
    }
  };

  const resetOnboarding = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ONBOARDING_STORAGE_KEY);
      setIsOnboardingCompleted(false);
      setShowOnboarding(true);
    }
  };

  const skipOnboarding = () => {
    completeOnboarding();
  };

  const value = {
    isOnboardingCompleted,
    showOnboarding,
    completeOnboarding,
    resetOnboarding,
    skipOnboarding,
    setShowOnboarding
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}