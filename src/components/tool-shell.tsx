import { type ReactNode } from "react";
import { useLocation } from "wouter";
import { Sparkles, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/app-shell";
import { DashboardLayout } from "@/components/dashboard-layout";

/**
 * Wraps a tool page. Logged-in users get the full dashboard (sidebar).
 * Visitors get a lightweight shell with a banner inviting them to sign up —
 * the tool works in "demo" mode but nothing is saved to their account.
 */
export function ToolShell({ children }: { children: ReactNode }) {
  const { currentUser, loading } = useAuth();
  const [, setLocation] = useLocation();

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  if (currentUser) {
    return <DashboardLayout>{children}</DashboardLayout>;
  }

  return (
    <AppShell>
      <div className="px-4 sm:px-6 pt-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
          <div className="flex items-center gap-2 flex-1 text-sm">
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
            <span className="text-foreground/90">
              Estás probando en <strong>modo demo</strong>. Creá tu cuenta gratis para guardar tu
              trabajo y desbloquear todas las herramientas.
            </span>
          </div>
          <button
            onClick={() => setLocation("/auth")}
            className="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all"
          >
            Crear cuenta gratis
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      {children}
    </AppShell>
  );
}
