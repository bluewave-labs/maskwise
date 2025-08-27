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
    // Wait a bit for auth check to complete
    const timeout = setTimeout(() => {
      setInitialCheckDone(true);
    }, 1000); // 1 second to check auth status

    return () => clearTimeout(timeout);
  }, []);

  // Only show spinner during initial auth check
  if (!initialCheckDone && isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // If already authenticated, show a message with option to continue or logout
  if (isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md text-center">
          <h2 className="text-2xl font-bold mb-4">Already Logged In</h2>
          <p className="text-gray-600 mb-6">You are already authenticated.</p>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => {
                // Clear cookies and reload
                document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                document.cookie = 'refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                window.location.reload();
              }}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg"
            >
              Logout and Show Login Form
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show login form
  return <LoginForm />;
}