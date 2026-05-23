import { type ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";

export function AuthLoadingBoundary({ children }: { children: ReactNode }) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <span className="text-sm">Cargando…</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
