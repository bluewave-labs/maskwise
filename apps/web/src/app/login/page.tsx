'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { LoginForm } from '@/components/auth/login-form';
import { Spinner } from '@/components/ui/spinner';

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  useEffect(() => {
    // If authenticated, redirect directly to dashboard
    if (isAuthenticated && !isLoading) {
      router.push('/dashboard');
      return;
    }

    // Wait a bit for auth check to complete
    const timeout = setTimeout(() => {
      setInitialCheckDone(true);
    }, 1000); // 1 second to check auth status

    return () => clearTimeout(timeout);
  }, [isAuthenticated, isLoading, router]);

  // Only show spinner during initial auth check
  if (!initialCheckDone && isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // If authenticated, show spinner while redirecting
  if (isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Show login form
  return <LoginForm />;
}