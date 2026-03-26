import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { Calculator, Clock, Settings, Moon, Sun, UserCircle, LogOut, X, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";
import { useUsage } from "@/hooks/use-usage";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const { currentUser, subscription, logout } = useAuth();
  const { usage, limits } = useUsage();
  const [showUserPanel, setShowUserPanel] = useState(false);

  const isMaster = currentUser?.role === "master";
  const isGuest = currentUser?.role === "guest";

  const navItems = [
    { href: "/app", label: "Cotizador", icon: Calculator },
    { href: "/history", label: "Historial", icon: Clock },
    ...(isMaster ? [{ href: "/settings", label: "Ajustes", icon: Settings }] : []),
  ];

  const userLabel = isGuest ? "Invitado" : currentUser?.email ?? "";
  const userRole = isGuest ? "Sin cuenta" : isMaster ? "Administrador" : "Cliente";

  return (
    <div className="glass-app-root">
      {/* Animated mesh gradient blobs */}
      <div className="auth-blobs" aria-hidden="true">
        <div className="auth-blob auth-blob-1" />
        <div className="auth-blob auth-blob-2" />
        <div className="auth-blob auth-blob-3" />
        <div className="auth-blob auth-blob-4" />
      </div>

      {/* Noise texture overlay */}
      <svg className="auth-noise" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <filter id="layout-noise-f">
          <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#layout-noise-f)" />
      </svg>

      {/* ─── DESKTOP layout ────────────────────────────── */}
      <div className="hidden md:flex min-h-[100dvh] relative z-10">

        {/* Sidebar */}
        <aside className="fixed top-0 left-0 h-full w-[220px] flex flex-col z-40 desktop-sidebar">
          {/* Brand */}
          <div className="px-6 pt-7 pb-5 border-b border-white/10">
            <p className="text-xl font-display font-black text-primary leading-none">Cotizador</p>
            <p className="text-xs font-medium text-muted-foreground mt-0.5">
              by <span className="font-black">YAGUAR</span> ESTUDIO
            </p>
          </div>

          {/* Nav links */}
          <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary/12 text-primary font-bold"
                      : "text-muted-foreground hover:bg-white/8 hover:text-foreground"
                  )}
                >
                  <Icon className="w-5 h-5 shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Bottom: theme + user */}
          <div className="px-3 pb-5 space-y-1 border-t border-white/10 pt-3">
            <button
              onClick={toggleTheme}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-white/8 hover:text-foreground transition-all duration-200"
            >
              {isDark
                ? <Sun className="w-5 h-5 shrink-0" strokeWidth={2} />
                : <Moon className="w-5 h-5 shrink-0" strokeWidth={2} />}
              {isDark ? "Modo claro" : "Modo oscuro"}
            </button>

            {/* User button */}
            <button
              onClick={() => setShowUserPanel(v => !v)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                showUserPanel ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-white/8 hover:text-foreground"
              )}
            >
              <UserCircle className="w-5 h-5 shrink-0" strokeWidth={showUserPanel ? 2.5 : 2} />
              <span className="truncate">{isGuest ? "Invitado" : currentUser?.name || currentUser?.email}</span>
            </button>

            {/* User dropdown */}
            {showUserPanel && (
              <div className="mx-1 mt-1 glass-panel rounded-xl p-3 border border-border shadow-lg">
                <p className="text-xs font-bold text-foreground truncate">{userLabel}</p>
                <p className="text-xs text-muted-foreground mb-1">{userRole}</p>
                {subscription && !isMaster && !isGuest && (
                  <div className="mb-2 px-2 py-1.5 rounded-lg bg-primary/5 border border-primary/10">
                    <div className="flex items-center gap-1 mb-1">
                      <Crown className="w-3 h-3 text-primary" />
                      <span className="text-[10px] font-bold text-primary">{subscription.planName}</span>
                    </div>
                    {limits.dtfQuotes !== -1 && (
                      <p className="text-[10px] text-muted-foreground">
                        Cotizaciones: {usage.dtfQuotes}/{limits.dtfQuotes}
                      </p>
                    )}
                  </div>
                )}
                <button
                  onClick={() => { logout(); setShowUserPanel(false); }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors text-xs font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Main content */}
        <main className="ml-[220px] flex-1 overflow-y-auto h-[100dvh] custom-scrollbar glass-app-shell-desktop">
          {children}
        </main>
      </div>

      {/* ─── MOBILE layout ─────────────────────────────── */}
      <div className="md:hidden relative z-10">
        <div className="flex flex-col min-h-[100dvh] w-full max-w-md mx-auto shadow-2xl overflow-hidden glass-app-shell">
          <main className="flex-1 overflow-y-auto pb-24 custom-scrollbar">
            {children}
          </main>
        </div>

        {/* Mobile user panel overlay */}
        {showUserPanel && (
          <div className="fixed inset-0 z-50" onClick={() => setShowUserPanel(false)}>
            <div
              className="absolute bottom-24 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm glass-panel rounded-2xl p-4 shadow-2xl border border-border"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserCircle className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-foreground">{userLabel}</p>
                    <p className="text-xs text-muted-foreground capitalize">{userRole}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowUserPanel(false)}
                  className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
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
                      Cotizaciones: {usage.dtfQuotes} de {limits.dtfQuotes} usadas
                    </p>
                  )}
                </div>
              )}
              <button
                onClick={() => { logout(); setShowUserPanel(false); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors text-sm font-medium"
              >
                <LogOut className="w-4 h-4" />
                Cerrar sesión
              </button>
            </div>
          </div>
        )}

        {/* Mobile bottom nav */}
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md glass-panel border-t border-border rounded-t-[2rem] px-4 py-4 flex items-center justify-between z-50">
          {navItems.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1.5 min-w-[4rem] transition-all duration-300",
                  isActive ? "text-primary scale-105" : "text-muted-foreground hover:text-foreground hover:scale-100"
                )}
              >
                <div className={cn(
                  "p-3 rounded-2xl transition-colors duration-300",
                  isActive ? "bg-primary/10" : "bg-transparent"
                )}>
                  <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={cn(
                  "text-[10px] font-medium transition-all duration-300",
                  isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1 absolute bottom-1"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          <button
            onClick={toggleTheme}
            className="flex flex-col items-center justify-center gap-1.5 min-w-[4rem] text-muted-foreground hover:text-foreground transition-all duration-300"
            aria-label="Cambiar tema"
          >
            <div className="p-3 rounded-2xl transition-colors duration-300 hover:bg-secondary">
              {isDark ? <Sun className="w-6 h-6" strokeWidth={2} /> : <Moon className="w-6 h-6" strokeWidth={2} />}
            </div>
            <span className="text-[10px] font-medium opacity-0 absolute bottom-1">Tema</span>
          </button>

          <button
            onClick={() => setShowUserPanel(v => !v)}
            className={cn(
              "flex flex-col items-center justify-center gap-1.5 min-w-[4rem] transition-all duration-300",
              showUserPanel ? "text-primary scale-105" : "text-muted-foreground hover:text-foreground"
            )}
            aria-label="Perfil"
          >
            <div className={cn(
              "p-3 rounded-2xl transition-colors duration-300",
              showUserPanel ? "bg-primary/10" : "hover:bg-secondary"
            )}>
              <UserCircle className="w-6 h-6" strokeWidth={showUserPanel ? 2.5 : 2} />
            </div>
            <span className={cn(
              "text-[10px] font-medium transition-all duration-300",
              showUserPanel ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1 absolute bottom-1"
            )}>
              Perfil
            </span>
          </button>
        </nav>
      </div>
    </div>
  );
}
