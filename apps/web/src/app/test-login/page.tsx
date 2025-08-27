'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { api } from '@/lib/api';

export default function TestLoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await api.post('/auth/login', {
        email: 'admin@maskwise.com',
        password: 'admin123'
      });
      
      const { user, accessToken, refreshToken } = response.data;
      
      // Store tokens
      Cookies.set('access_token', accessToken, { expires: 1/24 });
      Cookies.set('refresh_token', refreshToken, { expires: 7 });
      
      // Redirect to dashboard
      router.push('/dashboard');
      
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearCookies = () => {
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
    setError('');
    alert('Cookies cleared! Try logging in now.');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center mb-8">Test Login</h1>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <div className="space-y-4">
          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50"
          >
            {isLoading ? 'Logging in...' : 'Login as Admin'}
          </button>
          
          <button
            onClick={handleClearCookies}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg"
          >
            Clear Cookies & Reset
          </button>
          
          <div className="text-sm text-gray-600 text-center">
            <p>Email: admin@maskwise.com</p>
            <p>Password: admin123</p>
          </div>
        </div>
        
        <div className="mt-8 pt-4 border-t text-center">
          <p className="text-sm text-gray-500">
            After login, you'll be redirected to the Dashboard
          </p>
        </div>
      </div>
    </div>
  );
}