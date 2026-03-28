import { useMemo } from "react";
import { Link } from "wouter";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useUsage } from "@/hooks/use-usage";
import { useUsageEvents } from "@/hooks/use-usage-events";
import { useOrderStats } from "@/hooks/use-orders";
import { useTransactionSummary } from "@/hooks/use-transactions";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { TooltipProps } from "recharts";
import type { ValueType, NameType } from "recharts/types/component/DefaultTooltipContent";
import {
  Calculator,
  Shirt,
  ClipboardList,
  ArrowRight,
  Sparkles,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Clock,
  Crown,
} from "lucide-react";

function getDayLabel(date: Date): string {
  return date.toLocaleDateString("es-AR", { weekday: "short" }).replace(".", "");
}

function getDateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

const EVENT_LABELS: Record<string, string> = {
  dtf_quotes: "Cotización DTF",
  mockup_pngs: "Mockup PNG",
  pdf_exports: "Exportación PDF",
};

const EVENT_ICONS: Record<string, typeof Calculator> = {
  dtf_quotes: Calculator,
  mockup_pngs: Shirt,
  pdf_exports: FileText,
};

const EVENT_COLORS: Record<string, string> = {
  dtf_quotes: "text-orange-500 bg-orange-500/10",
  mockup_pngs: "text-blue-500 bg-blue-500/10",
  pdf_exports: "text-emerald-500 bg-emerald-500/10",
};

function CustomTooltip({ active, payload, label }: TooltipProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900/95 backdrop-blur border border-white/10 rounded-xl px-3 py-2 shadow-xl">
      <p className="text-xs text-muted-foreground font-medium capitalize">{String(label)}</p>
      {payload.map((p) => (
        <p key={String(p.dataKey)} className="text-sm font-bold" style={{ color: String(p.fill) }}>
          {String(p.value)} {p.dataKey === "quotes" ? "cotizaciones" : "mockups"}
        </p>
      ))}
    </div>
  );
}

export function DashboardPage() {
  const { currentUser, subscription } = useAuth();
  const { usage, limits } = useUsage();
  const { events } = useUsageEvents(7);
  const orderStats = useOrderStats();
  const { summary: financeSummary } = useTransactionSummary();

  const isMaster = currentUser?.role === "master";
  const isGuest = currentUser?.role === "guest";

  const greeting = currentUser?.name
    ? `Hola, ${currentUser.name.split(" ")[0]}`
    : "Bienvenido";

  const chartData = useMemo(() => {
    const now = new Date();
    const days: { label: string; dateKey: string; quotes: number; mockups: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days.push({
        label: i === 0 ? "Hoy" : i === 1 ? "Ayer" : getDayLabel(d),
        dateKey: getDateKey(d),
        quotes: 0,
        mockups: 0,
      });
    }
    for (const ev of events) {
      const d = new Date(ev.createdAt);
      const key = getDateKey(d);
      const day = days.find((dd) => dd.dateKey === key);
      if (day) {
        if (ev.eventType === "dtf_quotes") day.quotes++;
        if (ev.eventType === "mockup_pngs") day.mockups++;
      }
    }
    return days;
  }, [events]);

  const totalWeeklyActivity = chartData.reduce((sum, d) => sum + d.quotes + d.mockups, 0);

  const recentEvents = useMemo(() => {
    return events.slice(0, 8);
  }, [events]);

  const metrics = [
    {
      id: "quotes",
      label: "Cotizaciones",
      sublabel: "este mes",
      value: usage.dtfQuotes,
      icon: Calculator,
      color: "from-orange-500 to-amber-500",
    },
    {
      id: "mockups",
      label: "Mockups",
      sublabel: "este mes",
      value: usage.mockupPngs,
      icon: Shirt,
      color: "from-blue-500 to-indigo-500",
    },
    {
      id: "income-month",
      label: "Ingresos",
      sublabel: "este mes",
      value: formatCurrency(Number(financeSummary?.monthIncome || 0)),
      icon: TrendingUp,
      color: "from-emerald-500 to-teal-500",
    },
    {
      id: "expenses-month",
      label: "Gastos",
      sublabel: "este mes",
      value: formatCurrency(Number(financeSummary?.monthExpenses || 0)),
      icon: TrendingDown,
      color: "from-red-500 to-rose-500",
    },
  ];

  const quickActions = [
    { href: "/app", label: "Nueva Cotización", desc: "Cotizador DTF", icon: Calculator, color: "from-orange-500 to-amber-500" },
    { href: "/mockups", label: "Crear Mockup", desc: "Generador de mockups", icon: Shirt, color: "from-blue-500 to-indigo-500" },
    { href: "/history", label: "Ver Historial", desc: "Cotizaciones guardadas", icon: FileText, color: "from-emerald-500 to-teal-500" },
  ];

  const showUsageBars = !isMaster && !isGuest && limits.dtfQuotes !== -1;

  return (
    <div className="px-4 py-5 sm:px-8 sm:py-8 space-y-6 max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
            {greeting}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Resumen de tu negocio textil
          </p>
        </div>
        {!isMaster && !isGuest && subscription && (
          <div className="shrink-0 flex items-center gap-2 bg-primary/8 px-3 py-1.5 rounded-xl">
            <Crown className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-bold text-primary">{subscription.planName}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.id}
              className="relative bg-card/60 backdrop-blur rounded-2xl p-4 border border-border overflow-hidden group hover:border-white/10 transition-colors"
            >
              <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${m.color} opacity-[0.06] rounded-full -mr-8 -mt-8 group-hover:opacity-[0.10] transition-opacity`} />
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${m.color} flex items-center justify-center mb-3 shadow-lg`}>
                <Icon className="w-[18px] h-[18px] text-white" />
              </div>
              <p className="text-2xl font-display font-black text-foreground leading-none">
                {m.value}
              </p>
              <p className="text-[11px] text-muted-foreground font-medium mt-1">
                {m.label} · {m.sublabel}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5">
        <div className="lg:col-span-3 bg-card/60 backdrop-blur rounded-2xl p-5 border border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-display font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Actividad semanal
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {totalWeeklyActivity} acción{totalWeeklyActivity !== 1 ? "es" : ""} en los últimos 7 días
              </p>
            </div>
          </div>
          <div className="h-[200px] sm:h-[220px]">
            {totalWeeklyActivity > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#888", fontSize: 11, fontWeight: 500 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#666", fontSize: 11 }}
                    width={24}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                  <Bar dataKey="quotes" fill="#f97316" radius={[6, 6, 0, 0]} maxBarSize={36} name="Cotizaciones" />
                  <Bar dataKey="mockups" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={36} name="Mockups" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <TrendingUp className="w-10 h-10 text-muted-foreground/20 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Sin actividad esta semana</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Creá tu primera cotización para ver el gráfico
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-card/60 backdrop-blur rounded-2xl p-5 border border-border flex flex-col">
          <h2 className="text-base font-display font-bold text-foreground flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-primary" />
            Actividad reciente
          </h2>
          {recentEvents.length > 0 ? (
            <div className="flex-1 space-y-2.5 overflow-y-auto custom-scrollbar">
              {recentEvents.map((ev) => {
                const Icon = EVENT_ICONS[ev.eventType] ?? FileText;
                const colorClass = EVENT_COLORS[ev.eventType] ?? "text-gray-500 bg-gray-500/10";
                const [textColor, bgColor] = colorClass.split(" ");
                const date = new Date(ev.createdAt);
                const isToday = getDateKey(date) === getDateKey(new Date());
                const timeStr = isToday
                  ? `Hoy ${date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`
                  : date.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
                return (
                  <div
                    key={ev.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors"
                  >
                    <div className={`w-8 h-8 rounded-lg ${bgColor} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-4 h-4 ${textColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {EVENT_LABELS[ev.eventType] ?? ev.eventType}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground/70 font-medium shrink-0">
                      {timeStr}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
              <FileText className="w-8 h-8 text-muted-foreground/20 mb-2" />
              <p className="text-sm text-muted-foreground">Sin actividad aún</p>
              <Link
                href="/app"
                className="text-xs text-primary font-semibold mt-2 hover:underline"
              >
                Crear primera cotización
              </Link>
            </div>
          )}
        </div>
      </div>

      {showUsageBars && (
        <div className="bg-card/60 backdrop-blur rounded-2xl p-5 border border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-display font-bold text-foreground flex items-center gap-2">
              <Crown className="w-4 h-4 text-primary" />
              Uso del plan
            </h2>
            <Link href="/profile" className="text-xs text-primary font-semibold hover:underline">
              Ver plan
            </Link>
          </div>
          <div className="space-y-4">
            {[
              { label: "Cotizaciones DTF", used: usage.dtfQuotes, limit: limits.dtfQuotes, color: "#f97316" },
              { label: "Mockups PNG", used: usage.mockupPngs, limit: limits.mockupPngs, color: "#6366f1" },
              { label: "Exportaciones PDF", used: usage.pdfExports, limit: limits.pdfExports, color: "#10b981" },
            ].map((bar) => {
              const pct = bar.limit > 0 ? Math.min(100, (bar.used / bar.limit) * 100) : 0;
              const isNearLimit = pct >= 80;
              return (
                <div key={bar.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-foreground">{bar.label}</span>
                    <span className={`text-xs font-bold ${isNearLimit ? "text-red-400" : "text-muted-foreground"}`}>
                      {bar.used} / {bar.limit}
                    </span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: isNearLimit ? "#ef4444" : bar.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-base font-display font-bold text-foreground mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Acciones rápidas
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                  <p className="text-xs text-muted-foreground">{action.desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </Link>
            );
          })}
        </div>
      </div>

      <div className="bg-card/60 backdrop-blur rounded-2xl p-5 border border-border">
        <h2 className="text-base font-display font-bold text-foreground mb-2">
          Próximamente
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Estamos construyendo un sistema completo de gestión para tu negocio textil: pedidos, clientes, proveedores, finanzas, reportes y más. Todo integrado en esta misma plataforma.
        </p>
      </div>
    </div>
  );
}
