import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Calculator, ChevronDown, Home, LogIn, Shirt, User, Wrench, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavbarProps {
  isLanding?: boolean;
  onScrollTo?: (id: string) => void;
}

const TOOLS = [
  { href: "/app", label: "Cotizador DTF", icon: Calculator, ready: true },
  { href: "/mockups", label: "Generador de Mockups", icon: Shirt, ready: true },
];

export function Navbar({ isLanding = false, onScrollTo }: NavbarProps) {
  const [location, setLocation] = useLocation();
  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);
  const { currentUser, logout } = useAuth();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setToolsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const isToolPage = ["/app", "/mockups", "/settings"].includes(location);

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
                : "text-muted-foreground hover:bg-white/8 hover:text-foreground",
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
                isToolPage
                  ? "bg-primary/12 text-primary font-bold"
                  : "text-muted-foreground hover:bg-white/8 hover:text-foreground",
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
                            : "text-foreground hover:bg-white/8",
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
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <ThemeToggle />
          {currentUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-foreground hover:bg-white/8 transition-all">
                  <div className="h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center text-[11px] font-bold text-primary">
                    {(currentUser.displayName || currentUser.email || "Y").slice(0, 1).toUpperCase()}
                  </div>
                  <span className="max-w-[140px] truncate">
                    {currentUser.displayName || currentUser.email?.split("@")[0] || "Mi cuenta"}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[180px]">
                <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setLocation("/profile")} className="cursor-pointer">
                  <User className="w-4 h-4 mr-2" />
                  Perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/app")} className="cursor-pointer">
                  <Calculator className="w-4 h-4 mr-2" />
                  Cotizador
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await logout();
                    setLocation("/");
                  }}
                  className="text-destructive cursor-pointer focus:bg-destructive focus:text-destructive-foreground"
                >
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              onClick={() => setLocation("/auth")}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all"
            >
              <LogIn className="w-4 h-4" />
              Ingresar
            </button>
          )}
        </div>
      </div>

      {/* Mobile bottom nav */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 glass-panel border-t border-border px-2 py-3 flex items-center justify-around z-50">
        <Link
          href="/"
          className={cn(
            "flex flex-col items-center gap-1 min-w-[3.5rem] transition-all",
            location === "/" ? "text-primary" : "text-muted-foreground hover:text-foreground",
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
            isToolPage ? "text-primary" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <div className={cn("p-2 rounded-xl transition-colors", isToolPage ? "bg-primary/10" : "bg-transparent")}>
            <Wrench className="w-5 h-5" />
          </div>
          <span className="text-[9px] font-medium">Herramientas</span>
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
              <button
                onClick={() => setToolsOpen(false)}
                className="p-1 rounded-lg hover:bg-secondary text-muted-foreground"
              >
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
                        : "text-foreground hover:bg-white/8",
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
    </nav>
  );
}
