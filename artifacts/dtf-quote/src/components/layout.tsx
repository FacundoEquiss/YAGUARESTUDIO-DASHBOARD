import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { Calculator, Clock, Settings, UserCircle, LogOut, X, Crown, Shirt, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useUsage } from "@/hooks/use-usage";

const PAGE_TITLES: Record<string, string> = {
  "/app": "Cotizador",
  "/mockups": "Mockups",
  "/history": "Historial",
  "/settings": "Ajustes",
};

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { currentUser, subscription, logout } = useAuth();
  const { usage, limits } = useUsage();
  const [showUserPanel, setShowUserPanel] = useState(false);

  const isMaster = currentUser?.role === "master";
  const isGuest = currentUser?.role === "guest";

  const navItems = [
    { href: "/app", label: "Cotizador", icon: Calculator },
    { href: "/mockups", label: "Mockups", icon: Shirt },
    { href: "/history", label: "Historial", icon: Clock },
    ...(isMaster ? [{ href: "/settings", label: "Ajustes", icon: Settings }] : []),
  ];

  const userLabel = isGuest ? "Invitado" : currentUser?.email ?? "";
  const userRole = isGuest ? "Sin cuenta" : isMaster ? "Administrador" : "Cliente";
  const pageTitle = PAGE_TITLES[location] || "YAGUAR ESTUDIO";

  const handleLogout = () => {
    logout();
    setShowUserPanel(false);
    setLocation("/");
  };

  return (
    <div className="glass-app-root">
      <div className="auth-blobs" aria-hidden="true">
        <div className="auth-blob auth-blob-1" />
        <div className="auth-blob auth-blob-2" />
        <div className="auth-blob auth-blob-3" />
        <div className="auth-blob auth-blob-4" />
      </div>

      <svg className="auth-noise" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <filter id="layout-noise-f">
          <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#layout-noise-f)" />
      </svg>

      <div className="relative z-10 flex flex-col min-h-[100dvh]">
        <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/60 dark:bg-gray-950/60 border-b border-white/20 dark:border-white/5">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 cursor-pointer" onClick={() => setLocation("/")}>
                <span className="text-lg font-display font-black text-primary">{pageTitle}</span>
                <span className="text-xs font-medium text-muted-foreground hidden sm:block ml-1">
                  by <span className="font-black">YAGUAR</span> ESTUDIO
                </span>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-1">
              <Link
                href="/"
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-white/8 hover:text-foreground transition-all"
              >
                <Home className="w-4 h-4" />
                Inicio
              </Link>
              {navItems.map((item) => {
                const isActive = location === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all",
                      isActive
                        ? "bg-primary/12 text-primary font-bold"
                        : "text-muted-foreground hover:bg-white/8 hover:text-foreground"
                    )}
                  >
                    <Icon className="w-4 h-4" strokeWidth={isActive ? 2.5 : 2} />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setShowUserPanel((v) => !v)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all",
                    showUserPanel ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-white/8 hover:text-foreground"
                  )}
                >
                  <UserCircle className="w-5 h-5" strokeWidth={showUserPanel ? 2.5 : 2} />
                  <span className="hidden sm:block truncate max-w-[120px]">
                    {isGuest ? "Invitado" : currentUser?.name || currentUser?.email?.split("@")[0]}
                  </span>
                </button>

                {showUserPanel && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowUserPanel(false)} />
                    <div className="absolute right-0 top-full mt-2 w-72 glass-panel rounded-2xl p-4 border border-border shadow-2xl z-50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                            <UserCircle className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-foreground truncate">{userLabel}</p>
                            <p className="text-xs text-muted-foreground">{userRole}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowUserPanel(false)}
                          className="p-1 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      {subscription && !isMaster && !isGuest && (
                        <div className="mb-3 px-3 py-2 rounded-xl bg-primary/5 border border-primary/10">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Crown className="w-3.5 h-3.5 text-primary" />
                            <span className="text-xs font-bold text-primary">Plan {subscription.planName}</span>
                          </div>
                          {limits.dtfQuotes !== -1 && (
                            <p className="text-xs text-muted-foreground">
                              Cotizaciones: {usage.dtfQuotes} de {limits.dtfQuotes}
                            </p>
                          )}
                          {limits.mockupPngs !== -1 && (
                            <p className="text-xs text-muted-foreground">
                              Mockups: {usage.mockupPngs} de {limits.mockupPngs}
                            </p>
                          )}
                        </div>
                      )}
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors text-sm font-medium"
                      >
                        <LogOut className="w-4 h-4" />
                        Cerrar sesión
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </nav>

        <main className="flex-1 overflow-y-auto custom-scrollbar pb-20 sm:pb-0">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 glass-panel border-t border-border px-2 py-3 flex items-center justify-around z-50">
          <Link
            href="/"
            className="flex flex-col items-center gap-1 min-w-[3.5rem] text-muted-foreground hover:text-foreground transition-all"
          >
            <Home className="w-5 h-5" strokeWidth={2} />
            <span className="text-[9px] font-medium">Inicio</span>
          </Link>
          {navItems.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 min-w-[3.5rem] transition-all",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className={cn(
                  "p-2 rounded-xl transition-colors",
                  isActive ? "bg-primary/10" : "bg-transparent"
                )}>
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className="text-[9px] font-medium">{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setShowUserPanel((v) => !v)}
            className={cn(
              "flex flex-col items-center gap-1 min-w-[3.5rem] transition-all",
              showUserPanel ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div className={cn(
              "p-2 rounded-xl transition-colors",
              showUserPanel ? "bg-primary/10" : "bg-transparent"
            )}>
              <UserCircle className="w-5 h-5" strokeWidth={showUserPanel ? 2.5 : 2} />
            </div>
            <span className="text-[9px] font-medium">Perfil</span>
          </button>
        </nav>

        {/* Mobile user panel */}
        {showUserPanel && (
          <div className="sm:hidden fixed inset-0 z-[60]" onClick={() => setShowUserPanel(false)}>
            <div
              className="absolute bottom-20 left-4 right-4 glass-panel rounded-2xl p-4 border border-border shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserCircle className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-foreground">{userLabel}</p>
                    <p className="text-xs text-muted-foreground">{userRole}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowUserPanel(false)}
                  className="p-1 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {subscription && !isMaster && !isGuest && (
                <div className="mb-3 px-3 py-2 rounded-xl bg-primary/5 border border-primary/10">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Crown className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-bold text-primary">Plan {subscription.planName}</span>
                  </div>
                  {limits.dtfQuotes !== -1 && (
                    <p className="text-xs text-muted-foreground">
                      Cotizaciones: {usage.dtfQuotes} de {limits.dtfQuotes}
                    </p>
                  )}
                </div>
              )}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors text-sm font-medium"
              >
                <LogOut className="w-4 h-4" />
                Cerrar sesión
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
