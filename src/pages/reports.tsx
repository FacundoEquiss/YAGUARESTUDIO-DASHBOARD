import { useMemo, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { useTransactions, type Transaction } from "@/hooks/use-transactions";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

// Categorías de gasto consideradas fijas (recurrentes, no dependen del volumen de ventas).
const FIXED_EXPENSE_CATEGORIES = new Set([
  "Alquiler",
  "Sueldos",
  "Impuestos",
  "Servicios",
]);

function parseDate(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isFixedExpense(t: Transaction): boolean {
  return FIXED_EXPENSE_CATEGORIES.has(t.category);
}

export function ReportsPage() {
  const { items: transactions } = useTransactions();

  const availableYears = useMemo(() => {
    const set = new Set<number>();
    for (const t of transactions) {
      const d = parseDate(t.date);
      if (d) set.add(d.getFullYear());
    }
    set.add(new Date().getFullYear());
    return Array.from(set).sort((a, b) => b - a);
  }, [transactions]);

  const [year, setYear] = useState<number>(new Date().getFullYear());

  const yearTx = useMemo(
    () => transactions.filter((t) => parseDate(t.date)?.getFullYear() === year),
    [transactions, year],
  );

  // Datos mensuales: ingresos, gastos fijos, gastos variables.
  const monthly = useMemo(() => {
    const rows = MONTHS.map((m, i) => ({
      month: m,
      monthIndex: i,
      income: 0,
      fixedCost: 0,
      variableCost: 0,
    }));
    for (const t of yearTx) {
      const d = parseDate(t.date);
      if (!d) continue;
      const row = rows[d.getMonth()];
      if (t.type === "income") {
        row.income += t.amount;
      } else if (isFixedExpense(t)) {
        row.fixedCost += t.amount;
      } else {
        row.variableCost += t.amount;
      }
    }
    return rows.map((r) => ({
      ...r,
      expense: r.fixedCost + r.variableCost,
      result: r.income - r.fixedCost - r.variableCost,
    }));
  }, [yearTx]);

  const totals = useMemo(() => {
    const income = monthly.reduce((s, r) => s + r.income, 0);
    const fixedCost = monthly.reduce((s, r) => s + r.fixedCost, 0);
    const variableCost = monthly.reduce((s, r) => s + r.variableCost, 0);
    const expense = fixedCost + variableCost;
    const result = income - expense;
    const margin = income > 0 ? (result / income) * 100 : 0;
    // Margen de contribución = (ingresos - costos variables) / ingresos
    const contributionMargin = income > 0 ? (income - variableCost) / income : 0;
    // Punto de equilibrio = costos fijos / margen de contribución
    const breakEven = contributionMargin > 0 ? fixedCost / contributionMargin : 0;
    return { income, fixedCost, variableCost, expense, result, margin, contributionMargin, breakEven };
  }, [monthly]);

  const categoryBreakdown = useMemo(() => {
    const incomeByCat = new Map<string, number>();
    const expenseByCat = new Map<string, number>();
    for (const t of yearTx) {
      const map = t.type === "income" ? incomeByCat : expenseByCat;
      const key = t.category || "Sin categoría";
      map.set(key, (map.get(key) ?? 0) + t.amount);
    }
    const sortDesc = (m: Map<string, number>) =>
      Array.from(m.entries())
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total);
    return { income: sortDesc(incomeByCat), expense: sortDesc(expenseByCat) };
  }, [yearTx]);

  const chartData = monthly.map((r) => ({
    name: r.month,
    Ingresos: Math.round(r.income),
    Gastos: Math.round(r.expense),
  }));

  const hasData = yearTx.length > 0;

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-6 flex flex-col gap-6 pb-12 max-w-6xl">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl text-foreground font-display font-bold flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-primary" /> Reportes
          </h1>
          <p className="text-muted-foreground mt-1 font-medium">
            Cómo evoluciona tu negocio mes a mes.
          </p>
        </div>
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-32 h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableYears.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </header>

      {!hasData ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
            <h3 className="text-lg font-bold mb-1">Sin datos para {year}</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Cargá ingresos y gastos en la sección de finanzas para ver tus reportes acá.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Resumen anual */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SummaryCard
              icon={<TrendingUp className="w-4 h-4 text-emerald-400" />}
              label="Ingresos del año"
              value={formatCurrency(totals.income)}
              valueClass="text-emerald-400"
            />
            <SummaryCard
              icon={<TrendingDown className="w-4 h-4 text-red-400" />}
              label="Gastos del año"
              value={formatCurrency(totals.expense)}
              valueClass="text-red-400"
            />
            <SummaryCard
              icon={<DollarSign className="w-4 h-4 text-primary" />}
              label="Resultado neto"
              value={formatCurrency(totals.result)}
              valueClass={totals.result >= 0 ? "text-foreground" : "text-orange-400"}
            />
            <SummaryCard
              icon={<Target className="w-4 h-4 text-primary" />}
              label="Margen neto"
              value={`${totals.margin.toFixed(1)}%`}
              valueClass={totals.margin >= 0 ? "text-foreground" : "text-orange-400"}
            />
          </div>

          {/* Gráfico ingresos vs gastos */}
          <Card>
            <CardContent className="p-5">
              <h3 className="font-bold text-base mb-4">Ingresos vs Gastos por mes</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      stroke="hsl(var(--muted-foreground))"
                      tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                      width={40}
                    />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 12,
                        fontSize: 13,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Punto de equilibrio + costos */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-5">
                <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">
                  Costos fijos
                </div>
                <div className="text-xl font-display font-black">{formatCurrency(totals.fixedCost)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Alquiler, sueldos, impuestos, servicios.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">
                  Costos variables
                </div>
                <div className="text-xl font-display font-black">{formatCurrency(totals.variableCost)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Insumos, telas, logística, etc.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">
                  Punto de equilibrio
                </div>
                <div className="text-xl font-display font-black text-primary">
                  {formatCurrency(totals.breakEven)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Ventas necesarias para no perder ni ganar (margen de contribución{" "}
                  {(totals.contributionMargin * 100).toFixed(0)}%).
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Estado de resultados mensual */}
          <Card>
            <CardContent className="p-5 overflow-x-auto">
              <h3 className="font-bold text-base mb-4">Estado de resultados mensual</h3>
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="py-2 pr-4 font-semibold">Mes</th>
                    <th className="py-2 px-3 text-right font-semibold">Ingresos</th>
                    <th className="py-2 px-3 text-right font-semibold">C. Variables</th>
                    <th className="py-2 px-3 text-right font-semibold">C. Fijos</th>
                    <th className="py-2 pl-3 text-right font-semibold">Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {monthly.map((r) => (
                    <tr key={r.month} className="border-b border-border/50">
                      <td className="py-2 pr-4 font-medium">{r.month}</td>
                      <td className="py-2 px-3 text-right text-emerald-400">
                        {r.income ? formatCurrency(r.income) : "—"}
                      </td>
                      <td className="py-2 px-3 text-right text-muted-foreground">
                        {r.variableCost ? formatCurrency(r.variableCost) : "—"}
                      </td>
                      <td className="py-2 px-3 text-right text-muted-foreground">
                        {r.fixedCost ? formatCurrency(r.fixedCost) : "—"}
                      </td>
                      <td
                        className={`py-2 pl-3 text-right font-bold ${
                          r.result > 0 ? "text-foreground" : r.result < 0 ? "text-orange-400" : "text-muted-foreground"
                        }`}
                      >
                        {r.income || r.expense ? formatCurrency(r.result) : "—"}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-border font-bold">
                    <td className="py-2 pr-4">Total</td>
                    <td className="py-2 px-3 text-right text-emerald-400">{formatCurrency(totals.income)}</td>
                    <td className="py-2 px-3 text-right">{formatCurrency(totals.variableCost)}</td>
                    <td className="py-2 px-3 text-right">{formatCurrency(totals.fixedCost)}</td>
                    <td className={`py-2 pl-3 text-right ${totals.result >= 0 ? "text-foreground" : "text-orange-400"}`}>
                      {formatCurrency(totals.result)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Top categorías */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CategoryList
              title="De dónde entra el dinero"
              icon={<ArrowUpRight className="w-4 h-4 text-emerald-400" />}
              items={categoryBreakdown.income}
              total={totals.income}
              barClass="bg-emerald-500"
            />
            <CategoryList
              title="En qué se va el dinero"
              icon={<ArrowDownRight className="w-4 h-4 text-red-400" />}
              items={categoryBreakdown.expense}
              total={totals.expense}
              barClass="bg-red-500"
            />
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  valueClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
          {icon}
        </div>
        <div className={`text-xl font-display font-black ${valueClass}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function CategoryList({
  title,
  icon,
  items,
  total,
  barClass,
}: {
  title: string;
  icon: React.ReactNode;
  items: Array<{ name: string; total: number }>;
  total: number;
  barClass: string;
}) {
  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <h3 className="font-bold text-base flex items-center gap-2">
          {icon} {title}
        </h3>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">Sin datos.</p>
        ) : (
          <div className="space-y-2.5">
            {items.slice(0, 8).map((item) => {
              const pct = total > 0 ? (item.total / total) * 100 : 0;
              return (
                <div key={item.name}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium truncate">{item.name}</span>
                    <span className="text-muted-foreground shrink-0 ml-2">
                      {formatCurrency(item.total)} · {pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div className={`h-full rounded-full ${barClass}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
