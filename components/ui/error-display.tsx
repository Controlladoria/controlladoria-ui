/**
 * Error Display Component - Built on ShadCN Alert
 * Reusable component for displaying errors in a consistent format
 */

import { AlertCircle, XCircle, AlertTriangle, Info, Terminal } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface ErrorDisplayProps {
  error: string | Error | null | undefined;
  variant?: 'destructive' | 'default';
  title?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function ErrorDisplay({
  error,
  variant = 'destructive',
  title,
  onRetry,
  onDismiss,
  className = '',
}: ErrorDisplayProps) {
  if (!error) return null;

  const errorMessage = typeof error === 'string' ? error : error.message;

  return (
    <Alert variant={variant} className={className}>
      <AlertCircle className="h-4 w-4" />
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription>
        {errorMessage}
        {(onRetry || onDismiss) && (
          <div className="mt-3 flex gap-2">
            {onRetry && (
              <Button onClick={onRetry} size="sm" variant="default">
                Tentar Novamente
              </Button>
            )}
            {onDismiss && (
              <Button onClick={onDismiss} size="sm" variant="outline">
                Dispensar
              </Button>
            )}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}

/**
 * Inline Error Display (smaller, for form fields)
 */
export function InlineError({ error }: { error?: string | null }) {
  if (!error) return null;

  return (
    <div className="flex items-center gap-1.5 mt-1 text-destructive">
      <AlertCircle className="h-4 w-4 flex-shrink-0" />
      <span className="text-sm">{error}</span>
    </div>
  );
}

/**
 * Full Page Error Display
 */
export function FullPageError({
  error,
  onRetry,
}: {
  error: string | Error;
  onRetry?: () => void;
}) {
  const errorMessage = typeof error === 'string' ? error : error.message;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Erro ao Carregar
        </h1>
        <p className="text-muted-foreground mb-6">{errorMessage}</p>
        {onRetry && (
          <Button onClick={onRetry} size="lg">
            Tentar Novamente
          </Button>
        )}
      </div>
    </div>
  );
}

export default ErrorDisplay;
