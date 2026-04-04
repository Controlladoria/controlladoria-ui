'use client';

/**
 * Protected Route Component
 * Redirects to login if user is not authenticated
 * Redirects to subscription page if user has no active subscription
 */

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { FullPageLoading } from '@/components/ui/loading';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  loadingComponent?: React.ReactNode;
}

export default function ProtectedRoute({
  children,
  redirectTo = '/login',
  loadingComponent,
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { hasActiveSubscription, isTrialing, isLoading: subLoading } = useSubscription();
  const router = useRouter();
  const pathname = usePathname();

  // Pages that don't require subscription
  const publicPages = ['/contato', '/account/subscription'];
  const isPublicPage = publicPages.some(page => pathname?.startsWith(page));

  useEffect(() => {
    if (authLoading || subLoading) return;

    // First check: user must be authenticated
    if (!isAuthenticated) {
      // Hard redirect — client-side router.push can fail if auth state is corrupted
      window.location.href = redirectTo;
      return;
    }

    // Second check: user must have active subscription or be in trial (unless on public page)
    if (!isPublicPage && !hasActiveSubscription && !isTrialing) {
      router.push('/account/subscription');
      return;
    }
  }, [isAuthenticated, hasActiveSubscription, isTrialing, authLoading, subLoading, router, redirectTo, pathname, isPublicPage]);

  if (authLoading || subLoading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }

    return <FullPageLoading message="Carregando dados..." />;
  }

  if (!isAuthenticated) {
    // Show loading while redirect happens — never show empty page
    return <FullPageLoading message="Redirecionando..." />;
  }

  // Block access if no subscription (unless on public page)
  if (!isPublicPage && !hasActiveSubscription && !isTrialing) {
    return <FullPageLoading message="Redirecionando..." />;
  }

  return <>{children}</>;
}
