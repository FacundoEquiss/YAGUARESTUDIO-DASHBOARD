import React from "react";
import { Link, useLocation } from "wouter";
import { Calculator, Clock, Settings, UserCircle, Shirt, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

const PAGE_TITLES: Record<string, string> = {
  "/app": "Cotizador",
  "/mockups": "Mockups",
  "/history": "Historial",
  "/settings": "Ajustes",
  "/profile": "Mi Perfil",
};

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { currentUser } = useAuth();

  const isMaster = currentUser?.role === "master";

  const navItems = [
    { href: "/app", label: "Cotizador", icon: Calculator },
    { href: "/mockups", label: "Mockups", icon: Shirt },
    { href: "/history", label: "Historial", icon: Clock },
    ...(isMaster ? [{ href: "/settings", label: "Ajustes", icon: Settings }] : []),
  ];

  const pageTitle = PAGE_TITLES[location] || "YAGUAR ESTUDIO";
  const isProfileActive = location === "/profile";

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
        <nav className="sticky top-0 z-50 backdrop-blur-xl bg-gray-950/60 border-b border-white/5">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-1 cursor-pointer" onClick={() => setLocation("/")}>
              <span className="text-lg font-display font-black text-primary">{pageTitle}</span>
              <span className="text-xs font-medium text-muted-foreground hidden sm:block ml-1">
                by <span className="font-black">YAGUAR</span> ESTUDIO
              </span>
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

            <Link
              href="/profile"
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all",
                isProfileActive
                  ? "bg-primary/12 text-primary font-bold"
                  : "text-muted-foreground hover:bg-white/8 hover:text-foreground"
              )}
            >
              <UserCircle className="w-5 h-5" strokeWidth={isProfileActive ? 2.5 : 2} />
              <span className="hidden sm:block truncate max-w-[120px]">
                {currentUser?.role === "guest"
                  ? "Invitado"
                  : currentUser?.name || currentUser?.email?.split("@")[0]}
              </span>
            </Link>
          </div>
        </nav>

        <main className="flex-1 overflow-y-auto custom-scrollbar pb-20 sm:pb-0">
          {children}
        </main>

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
          <Link
            href="/profile"
            className={cn(
              "flex flex-col items-center gap-1 min-w-[3.5rem] transition-all",
              isProfileActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div className={cn(
              "p-2 rounded-xl transition-colors",
              isProfileActive ? "bg-primary/10" : "bg-transparent"
            )}>
              <UserCircle className="w-5 h-5" strokeWidth={isProfileActive ? 2.5 : 2} />
            </div>
            <span className="text-[9px] font-medium">Perfil</span>
          </Link>
        </nav>
      </div>
    </div>
  );
}
