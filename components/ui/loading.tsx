/**
 * Loading Components - Built on ShadCN primitives
 * Reusable loading states for consistent UX
 */

import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12',
  };

  return (
    <Loader2 className={`animate-spin ${sizeClasses[size]} ${className}`} />
  );
}

interface LoadingProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Loading({ message = 'Carregando...', size = 'md' }: LoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <LoadingSpinner size={size === 'sm' ? 'md' : size === 'lg' ? 'xl' : 'lg'} />
      <p className="mt-4 text-muted-foreground text-sm">{message}</p>
    </div>
  );
}

export function FullPageLoading({ message = 'Carregando...' }: { message?: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-accent/40 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-20 w-20 animate-spin rounded-full border-8 border-solid border-blue-600 dark:border-blue-400 border-r-transparent mb-6"></div>
        <p className="text-2xl font-semibold text-foreground">{message}</p>
      </div>
    </div>
  );
}

export function InlineLoading({ message }: { message?: string }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <LoadingSpinner size="sm" />
      {message && <span className="text-sm">{message}</span>}
    </div>
  );
}

/**
 * Card Skeleton - for loading document cards
 */
export function CardSkeleton() {
  return (
    <div className="bg-card border rounded-lg p-4 space-y-3">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-full" />
      <div className="flex gap-2 mt-4">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
}

/**
 * Table Skeleton - for loading table rows
 */
export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

export default Loading;
