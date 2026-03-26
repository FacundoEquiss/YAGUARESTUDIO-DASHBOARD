import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Home,
  Calculator,
  Shirt,
  Scissors,
  Wrench,
  CreditCard,
  Users,
  UserCircle,
  LogOut,
  Settings,
  BookOpen,
  ChevronDown,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

interface NavbarProps {
  isLanding?: boolean;
  onScrollTo?: (id: string) => void;
}

const TOOLS = [
  { href: "/app", label: "Cotizador DTF", icon: Calculator, ready: true },
  { href: "/mockups", label: "Generador de Mockups", icon: Shirt, ready: true },
  { href: "#", label: "Removedor de Fondos", icon: Scissors, ready: false },
];

export function Navbar({ isLanding = false, onScrollTo }: NavbarProps) {
  const [location, setLocation] = useLocation();
  const { currentUser, logout } = useAuth();
  const [toolsOpen, setToolsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const isMaster = currentUser?.role === "master";
  const isGuest = currentUser?.role === "guest";
  const isLoggedIn = !!currentUser && !isGuest;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setToolsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLogout = async () => {
    setProfileOpen(false);
    await logout();
    setLocation("/");
  };

  const isToolPage = ["/app", "/mockups", "/history", "/settings", "/profile"].includes(location);

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl bg-gray-950/60 border-b border-white/5">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div
          className="flex items-center gap-1 cursor-pointer shrink-0"
          onClick={() => {
            if (isLanding && onScrollTo) onScrollTo("top");
            else setLocation("/");
          }}
        >
          <span className="text-lg font-display font-black text-primary">YAGUAR</span>
          <span className="text-lg font-display font-light text-foreground">ESTUDIO</span>
        </div>

        <div className="hidden sm:flex items-center gap-1">
          <Link
            href="/"
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all",
              location === "/" && !isToolPage
                ? "bg-primary/12 text-primary font-bold"
                : "text-muted-foreground hover:bg-white/8 hover:text-foreground"
            )}
          >
            <Home className="w-4 h-4" />
            Inicio
          </Link>

          <div ref={toolsRef} className="relative">
            <button
              onClick={() => setToolsOpen((v) => !v)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all",
                isToolPage && location !== "/profile"
                  ? "bg-primary/12 text-primary font-bold"
                  : "text-muted-foreground hover:bg-white/8 hover:text-foreground"
              )}
            >
              <Wrench className="w-4 h-4" />
              Herramientas
              <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", toolsOpen && "rotate-180")} />
            </button>
            {toolsOpen && (
              <div className="absolute left-0 top-full mt-2 w-56 glass-panel rounded-2xl p-2 border border-border shadow-2xl z-50">
                {TOOLS.map((tool) => {
                  const Icon = tool.icon;
                  const isActive = location === tool.href;
                  return (
                    <button
                      key={tool.href}
                      onClick={() => {
                        setToolsOpen(false);
                        if (tool.ready) setLocation(tool.href);
                      }}
                      disabled={!tool.ready}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left",
                        !tool.ready
                          ? "opacity-40 cursor-not-allowed"
                          : isActive
                            ? "bg-primary/12 text-primary font-bold"
                            : "text-foreground hover:bg-white/8"
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="flex-1">{tool.label}</span>
                      {!tool.ready && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/5 text-muted-foreground">Pronto</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <Link
            href="/blog"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-white/8 hover:text-foreground transition-all opacity-50 cursor-not-allowed pointer-events-none"
          >
            <BookOpen className="w-4 h-4" />
            Blog
          </Link>

          {isLanding && (
            <>
              <button
                onClick={() => onScrollTo?.("planes")}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-white/8 hover:text-foreground transition-all"
              >
                <CreditCard className="w-4 h-4" />
                Planes
              </button>
              <button
                onClick={() => onScrollTo?.("nosotros")}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-white/8 hover:text-foreground transition-all"
              >
                <Users className="w-4 h-4" />
                Nosotros
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isMaster && (
            <Link
              href="/settings"
              className={cn(
                "hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all",
                location === "/settings"
                  ? "bg-primary/12 text-primary font-bold"
                  : "text-muted-foreground hover:bg-white/8 hover:text-foreground"
              )}
            >
              <Settings className="w-4 h-4" />
            </Link>
          )}

          {currentUser ? (
            <div ref={profileRef} className="relative">
              <button
                onClick={() => setProfileOpen((v) => !v)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all",
                  profileOpen || location === "/profile"
                    ? "bg-primary/12 text-primary font-bold"
                    : "text-muted-foreground hover:bg-white/8 hover:text-foreground"
                )}
              >
                <UserCircle className="w-5 h-5" />
                <span className="hidden sm:block truncate max-w-[120px]">
                  {isGuest
                    ? "Invitado"
                    : currentUser.name || currentUser.email?.split("@")[0]}
                </span>
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 glass-panel rounded-2xl p-2 border border-border shadow-2xl z-50">
                  <Link
                    href="/profile"
                    onClick={() => setProfileOpen(false)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-white/8 transition-all"
                  >
                    <UserCircle className="w-4 h-4 text-primary" />
                    Mi Perfil
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                    Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <button
                onClick={() => setLocation("/auth")}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-white/8 hover:text-foreground transition-all"
              >
                <UserCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Iniciar Sesión</span>
              </button>
              <button
                onClick={() => setLocation("/auth?tab=register")}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/12 text-primary text-sm font-bold hover:bg-primary/20 transition-all"
              >
                Crear Cuenta
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mobile bottom nav */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 glass-panel border-t border-border px-2 py-3 flex items-center justify-around z-50">
        <Link
          href="/"
          className={cn(
            "flex flex-col items-center gap-1 min-w-[3.5rem] transition-all",
            location === "/" ? "text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <div className={cn("p-2 rounded-xl transition-colors", location === "/" ? "bg-primary/10" : "bg-transparent")}>
            <Home className="w-5 h-5" />
          </div>
          <span className="text-[9px] font-medium">Inicio</span>
        </Link>

        <button
          onClick={() => setToolsOpen((v) => !v)}
          className={cn(
            "flex flex-col items-center gap-1 min-w-[3.5rem] transition-all",
            isToolPage && location !== "/profile" ? "text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <div className={cn("p-2 rounded-xl transition-colors", isToolPage && location !== "/profile" ? "bg-primary/10" : "bg-transparent")}>
            <Wrench className="w-5 h-5" />
          </div>
          <span className="text-[9px] font-medium">Herramientas</span>
        </button>

        <Link
          href="/blog"
          className="flex flex-col items-center gap-1 min-w-[3.5rem] text-muted-foreground opacity-50 pointer-events-none"
        >
          <div className="p-2 rounded-xl bg-transparent">
            <BookOpen className="w-5 h-5" />
          </div>
          <span className="text-[9px] font-medium">Blog</span>
        </Link>

        <button
          onClick={() => setProfileOpen((v) => !v)}
          className={cn(
            "flex flex-col items-center gap-1 min-w-[3.5rem] transition-all",
            profileOpen || location === "/profile" ? "text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <div className={cn(
            "p-2 rounded-xl transition-colors",
            profileOpen || location === "/profile" ? "bg-primary/10" : "bg-transparent"
          )}>
            <UserCircle className="w-5 h-5" />
          </div>
          <span className="text-[9px] font-medium">Perfil</span>
        </button>
      </div>

      {/* Mobile tools popup */}
      {toolsOpen && (
        <div className="sm:hidden fixed inset-0 z-[60]" onClick={() => setToolsOpen(false)}>
          <div
            className="absolute bottom-20 left-4 right-4 glass-panel rounded-2xl p-3 border border-border shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2 px-2">
              <span className="text-sm font-bold text-foreground">Herramientas</span>
              <button onClick={() => setToolsOpen(false)} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            {TOOLS.map((tool) => {
              const Icon = tool.icon;
              const isActive = location === tool.href;
              return (
                <button
                  key={tool.href}
                  onClick={() => {
                    setToolsOpen(false);
                    if (tool.ready) setLocation(tool.href);
                  }}
                  disabled={!tool.ready}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all text-left",
                    !tool.ready
                      ? "opacity-40 cursor-not-allowed"
                      : isActive
                        ? "bg-primary/12 text-primary font-bold"
                        : "text-foreground hover:bg-white/8"
                  )}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className="flex-1">{tool.label}</span>
                  {!tool.ready && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/5 text-muted-foreground">Pronto</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Mobile profile popup */}
      {profileOpen && (
        <div className="sm:hidden fixed inset-0 z-[60]" onClick={() => setProfileOpen(false)}>
          <div
            className="absolute bottom-20 left-4 right-4 glass-panel rounded-2xl p-3 border border-border shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2 px-2">
              <span className="text-sm font-bold text-foreground">
                {isGuest ? "Invitado" : currentUser?.name || "Cuenta"}
              </span>
              <button onClick={() => setProfileOpen(false)} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            {currentUser ? (
              <>
                <Link
                  href="/profile"
                  onClick={() => setProfileOpen(false)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-foreground hover:bg-white/8 transition-all"
                >
                  <UserCircle className="w-5 h-5 text-primary" />
                  Mi Perfil
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-all"
                >
                  <LogOut className="w-5 h-5" />
                  Cerrar Sesión
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => { setProfileOpen(false); setLocation("/auth"); }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-foreground hover:bg-white/8 transition-all"
                >
                  <UserCircle className="w-5 h-5 text-primary" />
                  Iniciar Sesión
                </button>
                <button
                  onClick={() => { setProfileOpen(false); setLocation("/auth?tab=register"); }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-primary hover:bg-primary/10 transition-all"
                >
                  <UserCircle className="w-5 h-5" />
                  Crear Cuenta
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
