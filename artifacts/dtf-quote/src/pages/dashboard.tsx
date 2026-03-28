import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useUsage } from "@/hooks/use-usage";
import {
  Calculator,
  Shirt,
  ClipboardList,
  DollarSign,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export function DashboardPage() {
  const { currentUser } = useAuth();
  const { usage } = useUsage();

  const greeting = currentUser?.name
    ? `Hola, ${currentUser.name.split(" ")[0]}`
    : "Bienvenido";

  const quotesUsed = usage.dtfQuotes;
  const mockupsUsed = usage.mockupPngs;

  const metrics = [
    {
      label: "Cotizaciones",
      value: quotesUsed >= 0 ? quotesUsed : 0,
      icon: Calculator,
      color: "from-orange-500 to-amber-500",
    },
    {
      label: "Mockups",
      value: mockupsUsed >= 0 ? mockupsUsed : 0,
      icon: Shirt,
      color: "from-blue-500 to-indigo-500",
    },
    {
      label: "Pedidos",
      value: 0,
      icon: ClipboardList,
      color: "from-emerald-500 to-teal-500",
      soon: true,
    },
    {
      label: "Ingresos",
      value: "$0",
      icon: DollarSign,
      color: "from-purple-500 to-violet-500",
      soon: true,
    },
  ];

  const quickActions = [
    { href: "/app", label: "Nueva Cotización", icon: Calculator, color: "from-orange-500 to-amber-500" },
    { href: "/mockups", label: "Crear Mockup", icon: Shirt, color: "from-blue-500 to-indigo-500" },
  ];

  return (
    <div className="px-5 py-6 sm:px-8 sm:py-8 space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
          {greeting}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Resumen de tu negocio textil
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.label}
              className="relative bg-card/60 backdrop-blur rounded-2xl p-4 border border-border overflow-hidden"
            >
              <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${m.color} opacity-[0.07] rounded-full -mr-6 -mt-6`} />
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${m.color} flex items-center justify-center mb-3 shadow-lg`}>
                <Icon className="w-[18px] h-[18px] text-white" />
              </div>
              <p className="text-2xl font-display font-black text-foreground">
                {m.soon ? "—" : m.value}
              </p>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                {m.label}
                {m.soon && " · Próximamente"}
              </p>
            </div>
          );
        })}
      </div>

      <div>
        <h2 className="text-lg font-display font-bold text-foreground mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Acciones rápidas
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="group flex items-center gap-4 bg-card/60 backdrop-blur rounded-2xl p-4 border border-border hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all"
              >
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-lg shrink-0`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground text-sm">{action.label}</p>
                  <p className="text-xs text-muted-foreground">Iniciar herramienta</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </Link>
            );
          })}
        </div>
      </div>

      <div className="bg-card/60 backdrop-blur rounded-2xl p-5 border border-border">
        <h2 className="text-lg font-display font-bold text-foreground mb-2">
          Próximamente
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Estamos construyendo un sistema completo de gestión para tu negocio textil: pedidos, clientes, proveedores, finanzas, reportes y más. Todo integrado en esta misma plataforma.
        </p>
      </div>
    </div>
  );
}
