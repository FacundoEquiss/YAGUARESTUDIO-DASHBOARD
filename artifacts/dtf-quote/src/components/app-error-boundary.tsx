import { Component, type ErrorInfo, type ReactNode } from "react";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("App runtime error", { error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[100dvh] bg-background flex items-center justify-center px-4">
          <div className="max-w-md w-full rounded-2xl border border-border bg-card/70 p-6 text-center space-y-3">
            <h2 className="text-lg font-bold text-foreground">Ocurrio un error inesperado</h2>
            <p className="text-sm text-muted-foreground">
              La app se recuperara al recargar. Si vuelve a pasar, inicia sesion nuevamente.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"
              >
                Recargar
              </button>
              <a
                href="/auth"
                className="px-4 py-2 rounded-lg border border-border text-sm font-semibold text-muted-foreground hover:bg-white/5"
              >
                Ir a login
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
