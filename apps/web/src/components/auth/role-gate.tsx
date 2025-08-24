'use client';

import { useAuth } from '@/hooks/useAuth';
import { isAdmin } from '@/types/auth';

interface RoleGateProps {
  children: React.ReactNode;
  adminOnly?: boolean;
  fallback?: React.ReactNode;
}

/**
 * RoleGate component to conditionally render content based on user role
 * 
 * @param children - Content to render if user has required role
 * @param adminOnly - If true, only admins can see the content
 * @param fallback - Optional content to show when access is denied
 */
export function RoleGate({ children, adminOnly = false, fallback = null }: RoleGateProps) {
  const { user } = useAuth();

  // If adminOnly is true, check if user is admin
  if (adminOnly && !isAdmin(user)) {
    return <>{fallback}</>;
  }

  // User has required role, render children
  return <>{children}</>;
}