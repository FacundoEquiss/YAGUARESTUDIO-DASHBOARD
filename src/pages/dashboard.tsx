import { useMemo, useState } from "react";
import { Link } from "wouter";
import { HelpCircle } from "lucide-react";
import { startAppTour, hasSeenTour, markTourSeen } from "@/lib/tour";
import {
  ArrowRight,
  ArrowUpCircle,
  ArrowDownCircle,
  AlertTriangle,
  Calendar,
  Calculator,
  ClipboardList,
  DollarSign,
  Package2,
  Plus,
  TrendingUp,
  Users,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useOrders, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/hooks/use-orders";
import { useTransactions } from "@/hooks/use-transactions";
import { useClients } from "@/hooks/use-clients";
import { useProducts } from "@/hooks/use-products";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

function startOfMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function parseDate(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

function daysUntil(target: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const t = new Date(target);
  t.setHours(0, 0, 0, 0);
  return Math.round((t.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "Buenas noches";
  if (h < 13) return "Buen día";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}

export function DashboardPage() {
  const { currentUser } = useAuth();
  const { items: orders } = useOrders();
  const { items: transactions } = useTransactions();
  const { items: clients } = useClients();
  const { items: products } = useProducts();

  const monthStart = startOfMonth();
  const monthEnd = endOfMonth();

  const stats = useMemo(() => {
    let monthIncome = 0;
    let monthExpense = 0;
    for (const t of transactions) {
      const d = parseDate(t.date);
      if (!d || d < monthStart || d > monthEnd) continue;
      if (t.type === "income") monthIncome += t.amount;
      else monthExpense += t.amount;
    }
    const activeOrders = orders.filter((o) => o.status === "in_progress" || o.status === "ready");
    const pendingPayments = orders
      .filter((o) => o.status !== "cancelled" && (o.paymentStatus === "partial" || o.paymentStatus === "unpaid"))
      .reduce((sum, o) => sum + Math.max(0, (o.total || 0) - (o.paidAmount || 0)), 0);
    return {
      monthIncome,
      monthExpense,
      monthBalance: monthIncome - monthExpense,
      activeOrders: activeOrders.length,
      pendingPayments,
    };
  }, [transactions, orders, monthStart, monthEnd]);

  const topClients = useMemo(() => {
    const totals = new Map<string, { name: string; total: number; orders: number }>();
    for (const o of orders) {
      if (o.status === "cancelled") continue;
      const key = o.clientId || o.clientName || "anon";
      const name = o.clientName || "Sin nombre";
      const prev = totals.get(key) ?? { name, total: 0, orders: 0 };
      totals.set(key, { name, total: prev.total + (o.total || 0), orders: prev.orders + 1 });
    }
    return Array.from(totals.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [orders]);

  const lowStockProducts = useMemo(
    () => products.filter((p) => p.minStock > 0 && p.stock <= p.minStock).slice(0, 5),
    [products],
  );

  const upcomingDeliveries = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const items = orders
      .filter((o) => {
        if (o.status === "delivered" || o.status === "cancelled") return false;
        const d = parseDate(o.dueDate);
        if (!d) return false;
        return d.getTime() >= today.getTime();
      })
      .sort((a, b) => {
        const da = parseDate(a.dueDate)!.getTime();
        const db = parseDate(b.dueDate)!.getTime();
        return da - db;
      })
      .slice(0, 5);
    return items;
  }, [orders]);

  const displayName = currentUser?.displayName?.split(" ")[0] ?? "";
  const [showWelcome, setShowWelcome] = useState(() => !hasSeenTour());

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-6 flex flex-col gap-6 pb-12 max-w-6xl">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl text-foreground font-display font-bold">
            {greeting()}
            {displayName ? <>, <span className="text-primary">{displayName}</span></> : null}
          </h1>
          <p className="text-muted-foreground mt-1 font-medium">
            Acá está el resumen de tu negocio.
          </p>
        </div>
        <button
          onClick={startAppTour}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
        >
          <HelpCircle className="w-4 h-4" />
          ¿Cómo funciona?
        </button>
      </header>

      {showWelcome ? (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <h3 className="font-bold text-base mb-1">¿Primera vez por acá? 👋</h3>
            <p className="text-sm text-muted-foreground">
              Te hacemos un recorrido rápido para que sepas usar todo. Dura menos de un minuto.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => {
                setShowWelcome(false);
                startAppTour();
              }}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all"
            >
              Hacer el tour
            </button>
            <button
              onClick={() => {
                markTourSeen();
                setShowWelcome(false);
              }}
              className="px-4 py-2 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              Ahora no
            </button>
          </div>
        </div>
      ) : null}

      {/* Stats */}
      <div data-tour="dashboard-stats" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<ArrowUpCircle className="w-4 h-4 text-emerald-400" />}
          label="Ingresos del mes"
          value={formatCurrency(stats.monthIncome)}
          accent="emerald"
        />
        <StatCard
          icon={<ArrowDownCircle className="w-4 h-4 text-red-400" />}
          label="Gastos del mes"
          value={formatCurrency(stats.monthExpense)}
          accent="red"
        />
        <StatCard
          icon={<TrendingUp className="w-4 h-4 text-primary" />}
          label="Balance del mes"
          value={formatCurrency(stats.monthBalance)}
          accent={stats.monthBalance >= 0 ? "neutral" : "orange"}
        />
        <StatCard
          icon={<DollarSign className="w-4 h-4 text-orange-400" />}
          label="A cobrar"
          value={formatCurrency(stats.pendingPayments)}
          accent={stats.pendingPayments > 0 ? "orange" : "neutral"}
        />
      </div>

      {/* Quick actions */}
      <Card data-tour="dashboard-shortcuts">
        <CardContent className="p-5">
          <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3">
            Atajos
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <QuickAction
              href="/app"
              icon={<Calculator className="w-5 h-5" />}
              label="Nueva cotización"
            />
            <QuickAction
              href="/orders"
              icon={<ClipboardList className="w-5 h-5" />}
              label="Nuevo pedido"
            />
            <QuickAction
              href="/finance"
              icon={<DollarSign className="w-5 h-5" />}
              label="Cargar ingreso"
            />
            <QuickAction
              href="/clients"
              icon={<Users className="w-5 h-5" />}
              label="Nuevo cliente"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Próximas entregas */}
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" /> Próximas entregas
              </h3>
              <Link
                href="/orders"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                Ver todos <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {upcomingDeliveries.length === 0 ? (
              <EmptyHint text="No tenés entregas próximas." />
            ) : (
              <div className="space-y-2">
                {upcomingDeliveries.map((o) => {
                  const d = parseDate(o.dueDate)!;
                  const days = daysUntil(d);
                  return (
                    <div key={o.id} className="flex items-center gap-3 py-2 border-b border-border last:border-b-0">
                      <div className="w-10 h-10 rounded-xl bg-secondary flex flex-col items-center justify-center shrink-0">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">
                          {d.toLocaleDateString("es-AR", { month: "short" })}
                        </span>
                        <span className="text-sm font-display font-bold leading-none">
                          {d.getDate()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate">
                          {o.orderName || "Pedido sin nombre"}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {o.clientName} · {days === 0 ? "hoy" : days === 1 ? "mañana" : `en ${days} días`}
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold ${ORDER_STATUS_COLORS[o.status]} shrink-0`}>
                        {ORDER_STATUS_LABELS[o.status]}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top clientes */}
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Mejores clientes
              </h3>
              <Link
                href="/clients"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                Ver todos <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {topClients.length === 0 ? (
              <EmptyHint text="Cargá pedidos para ver tus mejores clientes." />
            ) : (
              <div className="space-y-2">
                {topClients.map((c, i) => (
                  <div key={c.name + i} className="flex items-center gap-3 py-2 border-b border-border last:border-b-0">
                    <div className="w-7 h-7 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{c.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.orders} {c.orders === 1 ? "pedido" : "pedidos"}
                      </div>
                    </div>
                    <div className="text-sm font-display font-bold shrink-0">
                      {formatCurrency(c.total)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stock bajo */}
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-400" /> Stock bajo
              </h3>
              <Link
                href="/products"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                Ver productos <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {lowStockProducts.length === 0 ? (
              <EmptyHint text="Todo en orden, no hay alertas de stock." />
            ) : (
              <div className="space-y-2">
                {lowStockProducts.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 py-2 border-b border-border last:border-b-0">
                    <Package2 className="w-4 h-4 text-orange-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{p.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {[p.size, p.color].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    <div className="text-sm font-bold text-orange-400 shrink-0">
                      {p.stock} <span className="text-xs text-muted-foreground">/ min {p.minStock}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resumen general */}
        <Card>
          <CardContent className="p-5 space-y-3">
            <h3 className="font-bold text-base">Resumen</h3>
            <div className="space-y-2 text-sm">
              <SummaryRow label="Pedidos activos" value={stats.activeOrders.toString()} />
              <SummaryRow label="Clientes registrados" value={clients.length.toString()} />
              <SummaryRow label="Productos en catálogo" value={products.length.toString()} />
              <SummaryRow
                label="Pedidos sin cobrar"
                value={orders.filter((o) => o.status !== "cancelled" && o.paymentStatus !== "paid").length.toString()}
                accent={stats.pendingPayments > 0 ? "orange" : undefined}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: "emerald" | "red" | "orange" | "neutral";
}) {
  const colorClass =
    accent === "emerald"
      ? "text-emerald-400"
      : accent === "red"
      ? "text-red-400"
      : accent === "orange"
      ? "text-orange-400"
      : "text-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
          {icon}
        </div>
        <div className={`text-xl font-display font-black ${colorClass}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function QuickAction({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors text-center"
    >
      <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
        {icon}
      </div>
      <span className="text-xs font-semibold leading-tight">{label}</span>
    </Link>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground py-2">{text}</p>;
}

function SummaryRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "orange";
}) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-bold ${accent === "orange" ? "text-orange-400" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}
