'use client';

/**
 * Protected Route Component
 *
 * Rules:
 * 1. If auth is loading → show loading spinner (never render children)
 * 2. If not authenticated → hard redirect to /login (never render empty shell)
 * 3. If no subscription and not trialing → redirect to subscription page
 * 4. NEVER return null or render children without a valid user + subscription check
 */

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
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
  const pathname = usePathname();

  // Pages that don't require subscription
  const publicPages = ['/contato', '/account/subscription'];
  const isPublicPage = publicPages.some(page => pathname?.startsWith(page));

  // Redirect effect
  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;

    // Not authenticated → hard redirect (window.location, not router.push)
    if (!isAuthenticated) {
      window.location.href = redirectTo;
      return;
    }

    // Wait for subscription to finish loading before checking sub status
    if (subLoading) return;

    // No subscription → redirect to subscription page
    if (!isPublicPage && !hasActiveSubscription && !isTrialing) {
      window.location.href = '/account/subscription';
      return;
    }
  }, [isAuthenticated, hasActiveSubscription, isTrialing, authLoading, subLoading, redirectTo, pathname, isPublicPage]);

  // RENDER GUARDS — these ALWAYS show something, never return null

  // Auth still loading
  if (authLoading) {
    return loadingComponent ? <>{loadingComponent}</> : <FullPageLoading message="Carregando..." />;
  }

  // Not authenticated — show loading while redirect happens
  if (!isAuthenticated) {
    return <FullPageLoading message="Redirecionando..." />;
  }

  // Auth OK but subscription still loading — show loading, DON'T render children yet
  // This prevents the flash of "no subscription" content
  if (subLoading) {
    return loadingComponent ? <>{loadingComponent}</> : <FullPageLoading message="Carregando dados..." />;
  }

  // No subscription — show loading while redirect happens
  if (!isPublicPage && !hasActiveSubscription && !isTrialing) {
    return <FullPageLoading message="Redirecionando..." />;
  }

  // All checks passed — render the page
  return <>{children}</>;
}
