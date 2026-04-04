import { useEffect, useState, type ReactNode } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

interface AuthLoadingBoundaryProps {
  isLoading: boolean;
  error: string | null;
  children: ReactNode;
  onRetry?: () => void;
}

export function AuthLoadingBoundary({
  isLoading,
  error,
  children,
  onRetry,
}: AuthLoadingBoundaryProps) {
  const [showTimeoutHint, setShowTimeoutHint] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setShowTimeoutHint(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setShowTimeoutHint(true);
    }, 15000);

    return () => window.clearTimeout(timer);
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[100dvh] w-full bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground text-center">Cargando tu sesion...</p>
          {showTimeoutHint && (
            <p className="text-xs text-amber-400 text-center max-w-xs">
              Esta tardando mas de lo esperado. Si no avanza, intenta nuevamente.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[100dvh] w-full bg-background px-4">
        <div className="flex flex-col items-center gap-4 max-w-sm">
          <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-400" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold text-foreground">No pudimos restaurar tu sesion</h2>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
          <div className="flex items-center gap-2">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Reintentar
              </button>
            )}
            <a
              href="/auth"
              className="px-4 py-2 rounded-lg border border-border text-muted-foreground text-sm font-semibold hover:bg-white/5 transition-colors"
            >
              Ir a login
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
