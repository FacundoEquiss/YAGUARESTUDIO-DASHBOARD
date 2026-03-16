import React from "react";
import { Link, useLocation } from "wouter";
import { Calculator, Clock, Settings, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const { currentUser } = useAuth();

  const isMaster = currentUser?.role === "master";

  const navItems = [
    { href: "/", label: "Cotizador", icon: Calculator },
    { href: "/history", label: "Historial", icon: Clock },
    ...(isMaster ? [{ href: "/settings", label: "Ajustes", icon: Settings }] : []),
  ];

  return (
    <div className="flex flex-col min-h-[100dvh] w-full max-w-md mx-auto bg-background shadow-2xl overflow-hidden">
      <main className="flex-1 overflow-y-auto pb-24 custom-scrollbar">
        {children}
      </main>

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
      </nav>
    </div>
  );
}
