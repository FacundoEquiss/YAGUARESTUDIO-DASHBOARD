import { Link, useLocation } from "wouter";
import { HeadphonesIcon, Settings } from "lucide-react";
import { UserCard } from "./user-card";
import { cn } from "@/lib/utils";

export function SidebarActions() {
  const [location] = useLocation();

  return (
    <div className="flex flex-col gap-0.5 w-full">
      <div className="px-3 mb-1">
        <span className="text-[10px] font-bold text-muted-foreground/60 tracking-widest uppercase">
          Soporte
        </span>
      </div>

      <Link
        href="/support"
        className={cn(
          "flex items-center gap-2.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
          location === "/support"
            ? "bg-primary/10 text-primary"
            : "text-foreground/70 hover:bg-black/5 dark:hover:bg-white/8 hover:text-foreground",
        )}
      >
        <HeadphonesIcon className="h-[16px] w-[16px] shrink-0" />
        <span>Ayuda</span>
      </Link>

      <Link
        href="/settings"
        className={cn(
          "flex items-center gap-2.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
          location === "/settings"
            ? "bg-primary/10 text-primary"
            : "text-foreground/70 hover:bg-black/5 dark:hover:bg-white/8 hover:text-foreground",
        )}
      >
        <Settings className="h-[16px] w-[16px] shrink-0" />
        <span>Configuracion</span>
      </Link>

      <div className="mt-1.5 pt-1.5 border-t border-black/8 dark:border-white/5">
        <UserCard />
      </div>
    </div>
  );
}
