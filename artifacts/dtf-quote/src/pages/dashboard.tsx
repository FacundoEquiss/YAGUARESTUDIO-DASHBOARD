import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { formatCurrency } from "@/lib/utils";
import { getStorage, setStorage } from "@/lib/storage";
import { useAuth } from "@/hooks/use-auth";
import { useUsage } from "@/hooks/use-usage";
import { useUsageEvents } from "@/hooks/use-usage-events";
import { useOrderStats, useAllOrders } from "@/hooks/use-orders";
import { useTransactionSummary } from "@/hooks/use-transactions";
import { useProducts } from "@/hooks/use-products";
import { useAllServices } from "@/hooks/use-services";
import { HelpTooltip } from "@/components/help-tooltip";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import type { TooltipProps } from "recharts";
import type { ValueType, NameType } from "recharts/types/component/DefaultTooltipContent";
import {
  AlertCircle,
  Banknote,
  BarChart3,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Crown,
  Disc3,
  DollarSign,
  FileText,
  GripVertical,
  Radio,
  Rocket,
  Shirt,
  Sparkles,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Zap,
} from "lucide-react";

type CalendarItem = {
  id: string;
  type: "order_due" | "activity";
  title: string;
  subtitle: string;
  date: Date;
};

type DashboardPeriod = "7d" | "30d" | "month" | "90d";
type DashboardMode = "general" | "ventas" | "produccion" | "finanzas";
type WidgetId = "stock" | "activity" | "actions";

const PERIOD_OPTIONS: Array<{ id: DashboardPeriod; label: string; hint: string }> = [
  { id: "7d", label: "7 dias", hint: "Ultima semana" },
  { id: "30d", label: "30 dias", hint: "Ultimo mes" },
  { id: "month", label: "Mes actual", hint: "Desde inicio de mes" },
  { id: "90d", label: "90 dias", hint: "Ultimo trimestre" },
];

const MODE_OPTIONS: Array<{ id: DashboardMode; label: string; icon: any; color: string }> = [
  { id: "general", label: "General", icon: BarChart3, color: "from-blue-500 to-cyan-500" },
  { id: "ventas", label: "Ventas", icon: TrendingUp, color: "from-emerald-500 to-green-600" },
  { id: "produccion", label: "Produccion", icon: Radio, color: "from-amber-500 to-orange-500" },
  { id: "finanzas", label: "Finanzas", icon: Banknote, color: "from-purple-500 to-fuchsia-500" },
];

const DEFAULT_WIDGET_ORDER: WidgetId[] = ["stock", "activity", "actions"];

const EMPTY_STATE_TIPS: Record<DashboardMode, string> = {
  general: "Comienza por crear una cotizacion o un pedido para ver actividad.",
  ventas: "Crea nuevas cotizaciones y pedidos para ver metricas de ventas.",
  produccion: "Monitoea el stock y los pedidos activos en tiempo real.",
  finanzas: "Revisa ingresos y gastos para mantener control financiero.",
};

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthLabel(date: Date): string {
  return date.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
}

function weekdayLabel(date: Date): string {
  return date.toLocaleDateString("es-AR", { weekday: "short" }).replace(".", "");
}

function buildMonthGrid(monthDate: Date): Date[] {
  const firstDay = startOfMonth(monthDate);
  const startWeekDay = firstDay.getDay();
  const offset = startWeekDay === 0 ? 6 : startWeekDay - 1;
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - offset);

  const days: Date[] = [];
  for (let i = 0; i < 42; i += 1) {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + i);
    days.push(day);
  }
  return days;
}

function getPeriodStart(period: DashboardPeriod): Date {
  const now = new Date();
  if (period === "month") {
    return startOfMonth(now);
  }
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - (days - 1));
  return from;
}

function periodToUsageDays(period: DashboardPeriod): number {
  if (period === "7d") return 14;
  if (period === "30d") return 45;
  if (period === "month") return 45;
  return 120;
}

function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
  const copy = items.slice();
  const [moved] = copy.splice(from, 1);
  copy.splice(to, 0, moved);
  return copy;
}

function ActivityTooltip({ active, payload, label }: TooltipProps<ValueType, NameType>) {
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

function FinanceTooltip({ active, payload, label }: TooltipProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900/95 backdrop-blur border border-white/10 rounded-xl px-3 py-2 shadow-xl">
      <p className="text-xs text-muted-foreground font-medium">{String(label)}</p>
      {payload.map((p) => (
        <p key={String(p.dataKey)} className="text-sm font-bold" style={{ color: String(p.color || p.fill) }}>
          {String(p.name)}: {formatCurrency(Number(p.value || 0))}
        </p>
      ))}
    </div>
  );
}

export function DashboardPage() {
  const { currentUser, subscription } = useAuth();
  const [period, setPeriod] = useState<DashboardPeriod>("30d");
  const [mode, setMode] = useState<DashboardMode>("general");
  const [widgetOrder, setWidgetOrder] = useState<WidgetId[]>(DEFAULT_WIDGET_ORDER);
  const [draggingWidget, setDraggingWidget] = useState<WidgetId | null>(null);

  const { usage, limits } = useUsage();
  const { events } = useUsageEvents(periodToUsageDays(period));
  const { activeOrders, monthOrders } = useOrderStats();
  const { orders } = useAllOrders();
  const { summary: financeSummary } = useTransactionSummary();
  const { products: lowStockProducts } = useProducts({ lowStock: true });
  const { services } = useAllServices();

  const [showUpgrade, setShowUpgrade] = useState(false);
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()));
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()));

  const isMaster = currentUser?.role === "master";
  const isGuest = currentUser?.role === "guest";

  const greeting = currentUser?.name ? `Hola, ${currentUser.name.split(" ")[0]}` : "Dashboard";

  const dashboardStorageKey = useMemo(() => {
    if (!currentUser) return null;
    return `dtf:dashboard-prefs:${currentUser.id}`;
  }, [currentUser]);

  useEffect(() => {
    if (!dashboardStorageKey) return;
    const saved = getStorage<{ mode?: DashboardMode; period?: DashboardPeriod; widgetOrder?: WidgetId[] } | null>(dashboardStorageKey, null);
    if (saved?.mode) {
      setMode(saved.mode);
    }
    if (saved?.period) {
      setPeriod(saved.period);
    }
    if (saved?.widgetOrder && saved.widgetOrder.length === DEFAULT_WIDGET_ORDER.length) {
      setWidgetOrder(saved.widgetOrder);
    }
  }, [dashboardStorageKey]);

  useEffect(() => {
    if (!dashboardStorageKey) return;
    setStorage(dashboardStorageKey, { mode, period, widgetOrder });
  }, [dashboardStorageKey, mode, period, widgetOrder]);

  const periodStart = useMemo(() => getPeriodStart(period), [period]);

  const filteredEvents = useMemo(() => {
    return (events || []).filter((ev) => new Date(ev.createdAt) >= periodStart);
  }, [events, periodStart]);

  const filteredOrders = useMemo(() => {
    return (orders || []).filter((o) => {
      const created = new Date(o.createdAt);
      return created >= periodStart;
    });
  }, [orders, periodStart]);

  const quotesInPeriod = useMemo(() => filteredEvents.filter((ev) => ev.eventType === "dtf_quotes").length, [filteredEvents]);
  const mockupsInPeriod = useMemo(() => filteredEvents.filter((ev) => ev.eventType === "mockup_pngs").length, [filteredEvents]);

  const activityChart = useMemo(() => {
    const now = new Date();
    const chartDays = period === "7d" ? 7 : 14;
    const rows: { label: string; dateKey: string; quotes: number; mockups: number }[] = [];

    for (let i = chartDays - 1; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      rows.push({
        label: i === 0 ? "Hoy" : weekdayLabel(d),
        dateKey: toDateKey(d),
        quotes: 0,
        mockups: 0,
      });
    }

    for (const ev of filteredEvents) {
      const key = toDateKey(new Date(ev.createdAt));
      const row = rows.find((r) => r.dateKey === key);
      if (!row) continue;
      if (ev.eventType === "dtf_quotes") row.quotes += 1;
      if (ev.eventType === "mockup_pngs") row.mockups += 1;
    }

    return rows;
  }, [filteredEvents, period]);

  const financeChart = useMemo(() => {
    return (financeSummary?.monthlyChart || []).map((row) => ({
      month: row.month,
      income: Number(row.income || 0),
      expenses: Number(row.expenses || 0),
    }));
  }, [financeSummary]);

  const upcomingOrders = useMemo(() => {
    return (orders || [])
      .filter((o) => o.dueDate)
      .map((o) => ({ ...o, due: new Date(String(o.dueDate)) }))
      .filter((o) => !Number.isNaN(o.due.getTime()))
      .sort((a, b) => a.due.getTime() - b.due.getTime())
      .slice(0, 8);
  }, [orders]);

  const monthIncome = Number(financeSummary?.monthIncome || 0);
  const monthExpenses = Number(financeSummary?.monthExpenses || 0);
  const monthBalance = monthIncome - monthExpenses;

  const urgentAlerts = useMemo(() => {
    const alerts = [];
    if (lowStockProducts.length > 0) {
      alerts.push({
        id: "stock-alert",
        title: "Stock critico",
        description: `${lowStockProducts.length} producto(s) bajo minimo`,
        severity: "high",
        icon: TriangleAlert,
      });
    }
    if (activeOrders > 5) {
      alerts.push({
        id: "orders-alert",
        title: "Carga alta",
        description: `${activeOrders} pedidos en ejecucion`,
        severity: "medium",
        icon: Clock,
      });
    }
    if (monthBalance < 0) {
      alerts.push({
        id: "finance-alert",
        title: "Balance negativo",
        description: `Resultado deficitario este mes`,
        severity: "high",
        icon: AlertCircle,
      });
    }
    return alerts;
  }, [lowStockProducts.length, activeOrders, monthBalance]);

  const calendarItemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();

    for (const order of orders || []) {
      if (!order.dueDate) continue;
      const dueDate = new Date(String(order.dueDate));
      if (Number.isNaN(dueDate.getTime())) continue;
      const key = toDateKey(dueDate);
      const list = map.get(key) || [];
      list.push({
        id: `order-${order.id}`,
        type: "order_due",
        title: `Entrega pedido #${order.id}`,
        subtitle: order.clientName,
        date: dueDate,
      });
      map.set(key, list);
    }

    for (const ev of events) {
      const d = new Date(ev.createdAt);
      if (Number.isNaN(d.getTime())) continue;
      const key = toDateKey(d);
      const list = map.get(key) || [];
      list.push({
        id: `ev-${ev.id}`,
        type: "activity",
        title: ev.eventType === "dtf_quotes" ? "Cotizacion creada" : ev.eventType === "mockup_pngs" ? "Sesion de mockup" : "Actividad",
        subtitle: d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
        date: d,
      });
      map.set(key, list);
    }

    return map;
  }, [orders, events]);

  const monthGrid = useMemo(() => buildMonthGrid(monthCursor), [monthCursor]);
  const selectedDayItems = calendarItemsByDate.get(selectedDateKey) || [];

  const modeFlags = {
    showSales: mode === "general" || mode === "ventas",
    showProduction: mode === "general" || mode === "produccion",
    showFinance: mode === "general" || mode === "finanzas",
  };

  const modeOption = MODE_OPTIONS.find((m) => m.id === mode);
  const ModeIcon = modeOption?.icon || BarChart3;

  const kpis = [
    {
      id: "orders-active",
      label: "Pedidos activos",
      value: activeOrders,
      hint: "En ejecucion",
      icon: ClipboardList,
      color: "from-blue-500 to-indigo-500",
      visible: true,
    },
    {
      id: "orders-period",
      label: "Pedidos periodo",
      value: filteredOrders.length,
      hint: "Segun filtro",
      icon: FileText,
      color: "from-cyan-500 to-sky-500",
      visible: modeFlags.showSales,
    },
    {
      id: "quotes-period",
      label: "Cotizaciones",
      value: quotesInPeriod,
      hint: "Actividad comercial",
      icon: Rocket,
      color: "from-orange-500 to-amber-500",
      visible: modeFlags.showSales,
    },
    {
      id: "mockups-period",
      label: "Mockups",
      value: mockupsInPeriod,
      hint: "Actividad creativa",
      icon: Shirt,
      color: "from-blue-500 to-indigo-500",
      visible: modeFlags.showSales,
    },
    {
      id: "income",
      label: "Ingresos",
      value: formatCurrency(monthIncome),
      hint: "Mes actual",
      icon: TrendingUp,
      color: "from-emerald-500 to-teal-500",
      visible: modeFlags.showFinance,
    },
    {
      id: "expenses",
      label: "Gastos",
      value: formatCurrency(monthExpenses),
      hint: "Mes actual",
      icon: TrendingDown,
      color: "from-rose-500 to-red-500",
      visible: modeFlags.showFinance,
    },
    {
      id: "balance",
      label: "Balance",
      value: formatCurrency(monthBalance),
      hint: monthBalance >= 0 ? "Resultado positivo" : "Resultado negativo",
      icon: DollarSign,
      color: monthBalance >= 0 ? "from-violet-500 to-fuchsia-500" : "from-amber-500 to-orange-600",
      visible: modeFlags.showFinance,
    },
    {
      id: "low-stock",
      label: "Stock bajo",
      value: lowStockProducts.length,
      hint: "Productos criticos",
      icon: TriangleAlert,
      color: "from-amber-500 to-orange-500",
      visible: modeFlags.showProduction,
    },
    {
      id: "services",
      label: "Servicios activos",
      value: services.filter((s) => s.isActive).length,
      hint: "Catalogo operativo",
      icon: Sparkles,
      color: "from-fuchsia-500 to-purple-600",
      visible: modeFlags.showProduction,
    },
    {
      id: "usage",
      label: "Uso cuotas",
      value: limits.dtfQuotes > 0 ? `${usage.dtfQuotes}/${limits.dtfQuotes}` : String(usage.dtfQuotes),
      hint: "Plan mensual",
      icon: Crown,
      color: "from-purple-500 to-indigo-600",
      visible: true,
    },
  ].filter((kpi) => kpi.visible);

  const onWidgetDrop = (targetId: WidgetId) => {
    if (!draggingWidget || draggingWidget === targetId) return;
    const from = widgetOrder.indexOf(draggingWidget);
    const to = widgetOrder.indexOf(targetId);
    setWidgetOrder((prev) => moveItem(prev, from, to));
    setDraggingWidget(null);
  };

  const DragHandle = () => (
    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
      <GripVertical className="w-4 h-4 text-muted-foreground" />
    </div>
  );

  const widgetCards = {
    stock: (
      <div
        key="stock"
        draggable
        onDragStart={() => setDraggingWidget("stock")}
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => onWidgetDrop("stock")}
        className="group rounded-2xl border border-border bg-card/60 p-5 cursor-move hover:border-primary/30 transition-colors relative"
      >
        <DragHandle />
        <h3 className="text-base font-display font-bold text-foreground mb-3">Alertas de stock</h3>
        {!modeFlags.showProduction ? (
          <p className="text-xs text-muted-foreground italic">Visible en modo Produccion o General.</p>
        ) : lowStockProducts.length === 0 ? (
          <div className="text-center py-6">
            <Sparkles className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Stock optimo. Sin alertas.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {lowStockProducts.slice(0, 6).map((p) => (
              <Link key={p.id} href="/products" className="block rounded-xl border border-border bg-background/40 px-3 py-2.5 hover:bg-white/5 transition-colors">
                <p className="text-sm font-semibold text-foreground">{p.name}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-muted-foreground">Stock {Number(p.currentStock)} / Min {Number(p.minStock)}</p>
                  <div className="w-16 h-1.5 bg-background rounded-full overflow-hidden">
                    <div
                      className={`h-full ${Number(p.currentStock) / Number(p.minStock) < 0.5 ? "bg-red-500" : "bg-amber-500"}`}
                      style={{ width: `${Math.min((Number(p.currentStock) / Number(p.minStock)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    ),
    activity: (
      <div
        key="activity"
        draggable
        onDragStart={() => setDraggingWidget("activity")}
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => onWidgetDrop("activity")}
        className="group rounded-2xl border border-border bg-card/60 p-5 cursor-move hover:border-primary/30 transition-colors relative"
      >
        <DragHandle />
        <h3 className="text-base font-display font-bold text-foreground mb-3">Actividad reciente</h3>
        {filteredEvents.length === 0 ? (
          <div className="text-center py-6">
            <Radio className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Sin actividad en este periodo.</p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[280px] overflow-y-auto custom-scrollbar">
            {filteredEvents.slice(0, 10).map((ev) => {
              const d = new Date(ev.createdAt);
              const isQuote = ev.eventType === "dtf_quotes";
              return (
                <div key={ev.id} className="rounded-xl border border-border bg-background/40 px-3 py-2.5 hover:bg-white/5 transition-colors">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                    {isQuote ? <Rocket className="w-3.5 h-3.5" /> : <Shirt className="w-3.5 h-3.5" />}
                    {isQuote ? "Cotizacion" : "Mockup"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" })} · {d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    ),
    actions: (
      <div
        key="actions"
        draggable
        onDragStart={() => setDraggingWidget("actions")}
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => onWidgetDrop("actions")}
        className="group rounded-2xl border border-border bg-card/60 p-5 cursor-move hover:border-primary/30 transition-colors relative"
      >
        <DragHandle />
        <h3 className="text-base font-display font-bold text-foreground mb-3">Acciones rapidas</h3>
        <div className="grid grid-cols-2 md:grid-cols-1 gap-2.5">
          <Link href="/app" className="inline-flex items-center justify-center rounded-xl border border-border bg-background/40 px-3 py-3 text-xs font-semibold hover:bg-white/5 transition-colors">
            <Rocket className="w-4 h-4 mr-1.5" />
            Nueva cotizacion
          </Link>
          <Link href="/orders" className="inline-flex items-center justify-center rounded-xl border border-border bg-background/40 px-3 py-3 text-xs font-semibold hover:bg-white/5 transition-colors">
            <ClipboardList className="w-4 h-4 mr-1.5" />
            Nuevo pedido
          </Link>
          <Link href="/services" className="inline-flex items-center justify-center rounded-xl border border-border bg-background/40 px-3 py-3 text-xs font-semibold hover:bg-white/5 transition-colors">
            <Sparkles className="w-4 h-4 mr-1.5" />
            Gestionar servicios
          </Link>
          <Link href="/mockups" className="inline-flex items-center justify-center rounded-xl border border-border bg-background/40 px-3 py-3 text-xs font-semibold hover:bg-white/5 transition-colors">
            <Shirt className="w-4 h-4 mr-1.5" />
            Crear mockup
          </Link>
        </div>
      </div>
    ),
  };

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 space-y-6 w-full max-w-none">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">{greeting}</h1>
            {modeOption && (
              <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r ${modeOption.color} bg-opacity-10 border border-white/10`}>
                <Disc3 className="w-3 h-3 text-white animate-pulse" />
                <span className="text-xs font-bold text-white">{modeOption.label}</span>
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground">Centro de control operativo</p>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap lg:flex-nowrap items-start sm:items-center gap-3">
          <div className="flex items-center gap-1.5 bg-white/5 rounded-lg p-1 border border-border">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground ml-2" />
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                title={opt.hint}
                onClick={() => setPeriod(opt.id)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-bold border transition-all ${
                  period === opt.id
                    ? "border-primary bg-primary/20 text-primary shadow-lg shadow-primary/20"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as DashboardMode)}
            className="px-3 py-2 rounded-lg border border-border bg-card text-xs font-bold text-foreground hover:border-primary/50 transition-colors"
          >
            {MODE_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>

          {!isMaster && !isGuest && subscription && (
            <div className="inline-flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-3 py-2">
              <Crown className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-primary">{subscription.planName}</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowUpgrade(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold hover:opacity-90 transition-opacity shadow-lg"
          >
            <Zap className="w-3.5 h-3.5" />
            Plan
          </button>
        </div>
      </div>

      {urgentAlerts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {urgentAlerts.map((alert) => {
            const Icon = alert.icon;
            const bgColor = alert.severity === "high" ? "bg-red-500/20 border-red-500/30" : "bg-amber-500/20 border-amber-500/30";
            return (
              <div key={alert.id} className={`rounded-lg border ${bgColor} p-3 flex items-start gap-3`}>
                <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${alert.severity === "high" ? "text-red-400" : "text-amber-400"}`} />
                <div>
                  <p className="text-xs font-bold text-white">{alert.title}</p>
                  <p className="text-xs text-white/80">{alert.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-10 gap-3 auto-rows-max">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.id} className="relative rounded-2xl border border-border bg-card/60 p-4 group hover:border-primary/50 transition-all">
              <div className={`absolute top-0 right-0 w-20 h-20 rounded-full bg-gradient-to-br ${kpi.color} opacity-10 -mr-8 -mt-8 group-hover:opacity-15 transition-opacity`} />
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center mb-3`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <p className="text-xl font-display font-black text-foreground leading-none">{kpi.value}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{kpi.label}</p>
              <p className="text-[10px] text-muted-foreground/70 mt-0.5">{kpi.hint}</p>
            </div>
          );
        })}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-8 space-y-5">
          {modeFlags.showSales && (
            <div className="rounded-2xl border border-border bg-card/60 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-display font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Actividad comercial
                  <HelpTooltip text="Cotizaciones y mockups dentro del periodo seleccionado." />
                </h2>
              </div>
              {activityChart.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-muted-foreground mb-2">{EMPTY_STATE_TIPS[mode]}</p>
                </div>
              ) : (
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={activityChart} barCategoryGap="25%">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#8b8b8b", fontSize: 11 }} />
                      <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#8b8b8b", fontSize: 11 }} width={24} />
                      <Tooltip content={<ActivityTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                      <Bar name="Cotizaciones" dataKey="quotes" fill="#f97316" radius={[6, 6, 0, 0]} maxBarSize={34} />
                      <Bar name="Mockups" dataKey="mockups" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={34} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {modeFlags.showFinance && (
            <div className="rounded-2xl border border-border bg-card/60 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-display font-bold text-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Evolucion financiera
                  <HelpTooltip text="Comparativa mensual de ingresos y gastos." />
                </h2>
              </div>
              {financeChart.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-muted-foreground mb-2">Sin datos financieros para mostrar.</p>
                </div>
              ) : (
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={financeChart}>
                      <defs>
                        <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="expensesFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#8b8b8b", fontSize: 11 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: "#8b8b8b", fontSize: 11 }} width={48} />
                      <Tooltip content={<FinanceTooltip />} />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      <Area name="Ingresos" type="monotone" dataKey="income" stroke="#10b981" fill="url(#incomeFill)" strokeWidth={2} />
                      <Area name="Gastos" type="monotone" dataKey="expenses" stroke="#ef4444" fill="url(#expensesFill)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </div>

        <aside className="xl:col-span-4 space-y-5">
          {modeFlags.showProduction && (
            <div className="rounded-2xl border border-border bg-card/60 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-display font-bold text-foreground flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-primary" />
                  Calendario operativo
                </h2>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))} className="p-1.5 rounded-lg hover:bg-white/5">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))} className="p-1.5 rounded-lg hover:bg-white/5">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-sm font-semibold text-foreground capitalize mb-3">{monthLabel(monthCursor)}</p>

              <div className="grid grid-cols-7 gap-1 text-[10px] text-muted-foreground mb-1.5 font-bold">
                {["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"].map((day) => (
                  <div key={day} className="text-center py-1">{day}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {monthGrid.map((day) => {
                  const key = toDateKey(day);
                  const inMonth = day.getMonth() === monthCursor.getMonth();
                  const isToday = key === toDateKey(new Date());
                  const isSelected = key === selectedDateKey;
                  const items = calendarItemsByDate.get(key) || [];
                  const dueCount = items.filter((it) => it.type === "order_due").length;
                  const actCount = items.filter((it) => it.type === "activity").length;

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedDateKey(key)}
                      className={`min-h-[52px] rounded-lg border p-1.5 text-left transition-all ${
                        isSelected ? "border-primary bg-primary/15 shadow-lg shadow-primary/10" : "border-border hover:bg-white/5 hover:border-primary/30"
                      } ${!inMonth ? "opacity-40" : "opacity-100"}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[11px] font-bold ${isToday ? "text-primary font-black" : "text-foreground"}`}>{day.getDate()}</span>
                        {(dueCount > 0 || actCount > 0) && (
                          <span className="text-[8px] font-black text-primary bg-primary/20 rounded-full w-4 h-4 flex items-center justify-center">{dueCount + actCount}</span>
                        )}
                      </div>
                      <div className="mt-1.5 flex items-center gap-1">
                        {dueCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                        {actCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 rounded-xl border border-border bg-background/40 p-3">
                <p className="text-xs font-bold text-foreground mb-2">{toDateKey(new Date(selectedDateKey))}</p>
                {selectedDayItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Sin eventos para este dia.</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                    {selectedDayItems.map((item) => (
                      <div key={item.id} className="rounded-lg border border-border px-2.5 py-2 bg-white/5 hover:bg-white/10 transition-colors">
                        <p className="text-xs font-semibold text-foreground">{item.title}</p>
                        <p className="text-[11px] text-muted-foreground">{item.subtitle}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {(modeFlags.showProduction || modeFlags.showSales) && (
            <div className="rounded-2xl border border-border bg-card/60 p-5">
              <h2 className="text-base font-display font-bold text-foreground flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-primary" />
                Entregas proximas
              </h2>
              {upcomingOrders.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-xs text-muted-foreground italic">No hay pedidos con fecha de entrega.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {upcomingOrders.map((order) => {
                    const daysUntil = Math.ceil((order.due.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    const isUrgent = daysUntil <= 3;
                    return (
                      <Link key={order.id} href="/orders" className={`block rounded-xl border px-3 py-2.5 transition-colors ${isUrgent ? "border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20" : "border-border bg-background/40 hover:bg-white/5"}`}>
                        <p className="text-sm font-semibold text-foreground flex items-center justify-between">
                          #{order.id} {isUrgent && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold">Urgente</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {order.clientName}
                        </p>
                        <div className="flex items-center justify-between mt-1.5 text-xs">
                          <span className="text-muted-foreground">Entrega {order.due.toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}</span>
                          <span className={`font-bold ${daysUntil <= 1 ? "text-red-400" : daysUntil <= 3 ? "text-amber-400" : "text-emerald-400"}`}>{daysUntil} dias</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{formatCurrency(Number(order.totalPrice || 0))}</p>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </aside>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {widgetOrder.map((id) => widgetCards[id])}
      </section>

      <UpgradePrompt
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        feature="herramientas y limites"
        mode="plans"
      />
    </div>
  );
}


