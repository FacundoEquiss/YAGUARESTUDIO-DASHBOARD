import { useState } from "react";
import { useLocation } from "wouter";
import { Menu, Bell, Search } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { useAuth } from "@/hooks/use-auth";

const BREADCRUMB_LABELS: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/app": "Cotizador DTF",
  "/mockups": "Mockups",
  "/history": "Historial",
  "/settings": "Configuración",
  "/profile": "Mi Perfil",
  "/orders": "Pedidos",
  "/clients": "Clientes",
  "/suppliers": "Proveedores",
  "/finance": "Ingresos / Gastos",
  "/reports": "Reportes",
  "/accounts": "Cuentas Corrientes",
};

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location] = useLocation();
  const { currentUser } = useAuth();

  const pageLabel = BREADCRUMB_LABELS[location] || "Dashboard";
  const initials = currentUser?.name
    ? currentUser.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "YE";

  return (
    <div className="glass-app-root">
      <div className="auth-blobs" aria-hidden="true">
        <div className="auth-blob auth-blob-1" />
        <div className="auth-blob auth-blob-2" />
        <div className="auth-blob auth-blob-3" />
        <div className="auth-blob auth-blob-4" />
      </div>

      <svg className="auth-noise" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <filter id="dash-noise-f">
          <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#dash-noise-f)" />
      </svg>

      <div className="relative z-10 flex h-[100dvh]">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-40 h-12 shrink-0 flex items-center gap-3 px-4 sm:px-6 border-b border-border bg-background/95 backdrop-blur-md">
            <button
              type="button"
              aria-label="Abrir menú lateral"
              onClick={() => setSidebarOpen(true)}
              className="sm:hidden p-2 -ml-2 rounded-xl hover:bg-white/8 text-muted-foreground"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground hidden sm:inline">Panel</span>
              <span className="text-muted-foreground hidden sm:inline">/</span>
              <span className="font-semibold text-foreground">{pageLabel}</span>
            </div>

            <div className="flex-1" />

            <button type="button" aria-label="Buscar" className="p-2 rounded-xl hover:bg-white/8 text-muted-foreground transition-colors" title="Buscar">
              <Search className="w-[18px] h-[18px]" />
            </button>
            <button type="button" aria-label="Notificaciones" className="p-2 rounded-xl hover:bg-white/8 text-muted-foreground transition-colors relative" title="Notificaciones">
              <Bell className="w-[18px] h-[18px]" />
            </button>
            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary">
              {initials}
            </div>
          </header>

          <main className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth pb-8">
            <div key={location} className="animate-page-in min-h-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
