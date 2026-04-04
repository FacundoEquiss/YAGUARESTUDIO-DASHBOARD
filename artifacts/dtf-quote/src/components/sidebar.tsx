import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Truck,
  Package2,
  Calculator,
  Shirt,
  Scissors,
  BookOpen,
  DollarSign,
  BarChart3,
  Landmark,
  MessageCircle,
  Settings,
  UserCircle,
  LogOut,
  X,
  Send,
  FileText,
  Sun,
  Moon,
  Wrench,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { SidebarActions } from "./sidebar-actions";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  ready?: boolean;
  external?: boolean;
}

const SHOW_COMING_SOON_IN_SIDEBAR = false;

const MAIN_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, ready: true },
  { href: "/orders", label: "Pedidos", icon: ClipboardList, ready: true },
  { href: "/clients", label: "Clientes", icon: Users, ready: true },
  { href: "/suppliers", label: "Proveedores", icon: Truck, ready: true },
  { href: "/products", label: "Productos / Stock", icon: Package2, ready: true },
  { href: "/services", label: "Servicios", icon: Wrench, ready: true },
];

const TOOLS_NAV: NavItem[] = [
  { href: "/app", label: "Cotizador DTF", icon: Calculator, ready: true },
  { href: "/mockups", label: "Mockups", icon: Shirt, ready: true },
  { href: "/history", label: "Historial", icon: FileText, ready: true },
  { href: "/bg-remover", label: "Quita Fondos", icon: Scissors, ready: false },
  { href: "/blog", label: "Blog", icon: BookOpen, ready: false },
].filter((item) => item.ready || SHOW_COMING_SOON_IN_SIDEBAR);

const FINANCE_NAV: NavItem[] = [
  { href: "/finance", label: "Ingresos / Gastos", icon: DollarSign, ready: true },
  { href: "/reports", label: "Reportes", icon: BarChart3, ready: true },
  { href: "/accounts", label: "Cuentas Corrientes", icon: Landmark, ready: true },
];

const TELEGRAM_LINK = "https://t.me/+IhEEsOPYZ-MzZDYx";

function NavSection({ title, items, location, onNavigate }: {
  title: string;
  items: NavItem[];
  location: string;
  onNavigate: () => void;
}) {
  return (
    <div>
      <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
        {title}
      </p>
      <div className="space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.ready ? item.href : "#"}
              onClick={(e) => {
                if (!item.ready) { e.preventDefault(); return; }
                onNavigate();
              }}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all",
                !item.ready && "opacity-35 cursor-not-allowed pointer-events-none",
                isActive
                  ? "bg-primary/12 text-primary font-bold"
                  : "text-foreground/80 hover:bg-white/8 hover:text-foreground"
              )}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {!item.ready && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/5 text-muted-foreground font-semibold">
                  Pronto
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const { currentUser, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const handleLogout = async () => {
    onClose();
    await logout();
    setLocation("/");
  };

  const handleNavigate = () => {
    onClose();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 h-14 shrink-0">
        <Link
          href="/dashboard"
          onClick={handleNavigate}
          className="flex flex-col items-start leading-none cursor-pointer"
        >
          <span className="text-lg font-display font-black text-primary">TRAZO</span>
          <span className="text-[11px] font-medium text-muted-foreground mt-1">by Yaguar Estudio</span>
        </Link>
        <button
          type="button"
          aria-label="Cerrar menú lateral"
          onClick={onClose}
          className="sm:hidden p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-2.5 py-3 space-y-5">
        <NavSection title="Principal" items={MAIN_NAV} location={location} onNavigate={handleNavigate} />
        <NavSection title="Herramientas" items={TOOLS_NAV} location={location} onNavigate={handleNavigate} />
        <NavSection title="Finanzas" items={FINANCE_NAV} location={location} onNavigate={handleNavigate} />

        <div>
          <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            Comunidad
          </p>
          <a
            href={TELEGRAM_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-foreground/80 hover:bg-white/8 hover:text-foreground transition-all"
          >
            <Send className="w-[18px] h-[18px] shrink-0 text-[#229ED9]" />
            <span className="flex-1">Telegram</span>
            <MessageCircle className="w-3.5 h-3.5 text-muted-foreground/50" />
          </a>
        </div>
      </div>

      <div className="shrink-0 border-t border-black/8 dark:border-white/5 px-2.5 pt-2 pb-2">
        {/* iPhone-style toggle row */}
        <div className="flex items-center justify-between px-3 py-1.5 mb-1">
          <div className="flex items-center gap-2">
            {theme === "dark" ? <Moon className="w-3.5 h-3.5 text-muted-foreground" /> : <Sun className="w-3.5 h-3.5 text-muted-foreground" />}
            <span className="text-xs font-medium text-muted-foreground">{theme === "dark" ? "Modo oscuro" : "Modo claro"}</span>
          </div>
          {/* iPhone switch */}
          <button
            type="button"
            role="switch"
            aria-checked={theme === "dark"}
            aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className={cn(
              "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
              theme === "dark" ? "bg-primary" : "bg-gray-300"
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                theme === "dark" ? "translate-x-4" : "translate-x-0"
              )}
            />
          </button>
        </div>
        <SidebarActions />
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden sm:flex desktop-sidebar w-[240px] shrink-0 flex-col h-full">
        {sidebarContent}
      </aside>

      {open && (
        <div className="sm:hidden fixed inset-0 z-[70]">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <aside className="absolute left-0 top-0 bottom-0 w-[280px] desktop-sidebar flex flex-col animate-slide-in-left">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
