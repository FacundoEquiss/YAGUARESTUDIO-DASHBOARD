import { useMemo } from "react";
import { formatCurrency } from "@/lib/utils";
import { useTransactionSummary } from "@/hooks/use-transactions";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import type { TooltipProps } from "recharts";
import type { ValueType, NameType } from "recharts/types/component/DefaultTooltipContent";
import { BarChart3, TrendingUp, PieChart as PieChartIcon, DollarSign } from "lucide-react";

const MONTH_LABELS: Record<string, string> = {};
function getMonthLabel(ym: string): string {
  if (MONTH_LABELS[ym]) return MONTH_LABELS[ym];
  const [y, m] = ym.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  const label = d.toLocaleDateString("es-AR", { month: "short" }).replace(".", "");
  MONTH_LABELS[ym] = label;
  return label;
}

const PIE_COLORS = ["#f97316", "#3b82f6", "#10b981", "#a855f7", "#ef4444", "#eab308", "#06b6d4"];

const CATEGORY_LABELS: Record<string, string> = {
  venta: "Venta",
  anticipo: "Anticipo",
  otro: "Otro",
  materiales: "Materiales",
  envio: "Envío",
  servicios: "Servicios",
  impuestos: "Impuestos",
  otros: "Otros",
};

function BarTooltip({ active, payload, label }: TooltipProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900/95 backdrop-blur border border-white/10 rounded-xl px-3 py-2 shadow-xl">
      <p className="text-xs text-muted-foreground font-medium capitalize">{String(label)}</p>
      {payload.map((p) => (
        <p key={String(p.dataKey)} className="text-sm font-bold" style={{ color: String(p.fill || p.color) }}>
          {formatCurrency(Number(p.value))} {p.dataKey === "income" ? "ingresos" : p.dataKey === "expenses" ? "gastos" : "ganancia"}
        </p>
      ))}
    </div>
  );
}

export function ReportsPage() {
  const { summary, loading } = useTransactionSummary();

  const monthlyData = useMemo(() => {
    if (!summary?.monthlyChart) return [];
    return summary.monthlyChart.map((m) => ({
      label: getMonthLabel(m.month),
      income: Number(m.income),
      expenses: Number(m.expenses),
      profit: Number(m.income) - Number(m.expenses),
    }));
  }, [summary]);

  const incomePieData = useMemo(() => {
    if (!summary?.incomeByCategory) return [];
    return summary.incomeByCategory.map((c) => ({
      name: CATEGORY_LABELS[c.category] || c.category,
      value: Number(c.total),
    })).filter((c) => c.value > 0);
  }, [summary]);

  const expensePieData = useMemo(() => {
    if (!summary?.expenseByCategory) return [];
    return summary.expenseByCategory.map((c) => ({
      name: CATEGORY_LABELS[c.category] || c.category,
      value: Number(c.total),
    })).filter((c) => c.value > 0);
  }, [summary]);

  const projectionData = useMemo(() => {
    if (monthlyData.length < 2) return [];
    const avgIncome = monthlyData.reduce((s, d) => s + d.income, 0) / monthlyData.length;
    const avgExpenses = monthlyData.reduce((s, d) => s + d.expenses, 0) / monthlyData.length;
    const projected = [];
    const now = new Date();
    for (let i = 1; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      projected.push({
        label: d.toLocaleDateString("es-AR", { month: "short" }).replace(".", "") + "*",
        income: Math.round(avgIncome),
        expenses: Math.round(avgExpenses),
        profit: Math.round(avgIncome - avgExpenses),
      });
    }
    return [...monthlyData, ...projected];
  }, [monthlyData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const monthIncome = Number(summary?.monthIncome || 0);
  const monthExpenses = Number(summary?.monthExpenses || 0);
  const balance = monthIncome - monthExpenses;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reportes</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Análisis financiero de tu negocio</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card/60 backdrop-blur border border-border rounded-2xl p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Ingresos del mes</p>
          <p className="text-xl font-bold text-emerald-400">{formatCurrency(monthIncome)}</p>
        </div>
        <div className="bg-card/60 backdrop-blur border border-border rounded-2xl p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Gastos del mes</p>
          <p className="text-xl font-bold text-red-400">{formatCurrency(monthExpenses)}</p>
        </div>
        <div className="bg-card/60 backdrop-blur border border-border rounded-2xl p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Ganancia</p>
          <p className={`text-xl font-bold ${balance >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatCurrency(balance)}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Ingresos vs Gastos por mes</h3>
        </div>
        {monthlyData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">Sin datos para mostrar. Agregá transacciones para ver el gráfico.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fill: "#a1a1aa", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={50} />
              <Tooltip content={<BarTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="income" fill="#10b981" radius={[6, 6, 0, 0]} name="Ingresos" />
              <Bar dataKey="expenses" fill="#ef4444" radius={[6, 6, 0, 0]} name="Gastos" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon className="w-4 h-4 text-emerald-400" />
            <h3 className="font-semibold text-sm">Ingresos por categoría</h3>
          </div>
          {incomePieData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">Sin ingresos este mes</p>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie data={incomePieData} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3}>
                    {incomePieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {incomePieData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span>{d.name}</span>
                    </div>
                    <span className="font-medium">{formatCurrency(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon className="w-4 h-4 text-red-400" />
            <h3 className="font-semibold text-sm">Gastos por categoría</h3>
          </div>
          {expensePieData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">Sin gastos este mes</p>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie data={expensePieData} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3}>
                    {expensePieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {expensePieData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span>{d.name}</span>
                    </div>
                    <span className="font-medium">{formatCurrency(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {projectionData.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">Tendencia de ganancia y proyección</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={projectionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fill: "#a1a1aa", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={50} />
              <Tooltip content={<BarTooltip />} cursor={{ strokeDasharray: "3 3" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} name="Ingresos" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Gastos" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="profit" stroke="#f97316" strokeWidth={2.5} name="Ganancia" dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-muted-foreground/50 mt-2 text-right">* Proyección basada en promedios</p>
        </div>
      )}
    </div>
  );
}
