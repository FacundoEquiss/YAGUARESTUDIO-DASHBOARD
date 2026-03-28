import { formatCurrency } from "@/lib/utils";
import { useBalances } from "@/hooks/use-transactions";
import { HelpTooltip } from "@/components/help-tooltip";
import { Users, Truck, Landmark, DollarSign } from "lucide-react";

export function AccountsPage() {
  const { balances, loading } = useBalances();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const clientBalances = balances?.clientBalances || [];
  const supplierBalances = balances?.supplierBalances || [];

  const totalClientOwed = clientBalances.reduce((s, c) => s + (Number(c.totalIncome) - Number(c.totalExpense)), 0);
  const totalSupplierOwed = supplierBalances.reduce((s, c) => s + (Number(c.totalExpense) - Number(c.totalIncome)), 0);

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">Cuentas Corrientes <HelpTooltip text="Resumen de saldos con clientes y proveedores, calculados en base a las transacciones registradas en Ingresos/Gastos." /></h1>
        <p className="text-sm text-muted-foreground mt-0.5">Saldos con clientes y proveedores</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card/60 backdrop-blur border border-border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-xs text-muted-foreground">Clientes te deben</span>
          </div>
          <p className="text-xl font-bold text-emerald-400">{formatCurrency(totalClientOwed)}</p>
        </div>
        <div className="bg-card/60 backdrop-blur border border-border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center">
              <Truck className="w-4 h-4 text-red-400" />
            </div>
            <span className="text-xs text-muted-foreground">Debés a proveedores</span>
          </div>
          <p className="text-xl font-bold text-red-400">{formatCurrency(totalSupplierOwed)}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Saldos de Clientes</h3>
          <span className="text-xs text-muted-foreground ml-auto">{clientBalances.length} cliente{clientBalances.length !== 1 ? "s" : ""}</span>
        </div>
        {clientBalances.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground">Sin transacciones vinculadas a clientes</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cliente</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Ingresos</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Gastos</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Saldo</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Transacciones</th>
                </tr>
              </thead>
              <tbody>
                {clientBalances.map((c) => {
                  const balance = Number(c.totalIncome) - Number(c.totalExpense);
                  return (
                    <tr key={c.clientId} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium">{c.clientName}</td>
                      <td className="px-4 py-3 text-right text-emerald-400">{formatCurrency(Number(c.totalIncome))}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(Number(c.totalExpense))}</td>
                      <td className="px-4 py-3 text-right font-semibold">
                        <span className={balance > 0 ? "text-emerald-400" : balance < 0 ? "text-red-400" : "text-muted-foreground"}>
                          {formatCurrency(balance)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground hidden sm:table-cell">{c.transactionCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Truck className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Saldos de Proveedores</h3>
          <span className="text-xs text-muted-foreground ml-auto">{supplierBalances.length} proveedor{supplierBalances.length !== 1 ? "es" : ""}</span>
        </div>
        {supplierBalances.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground">Sin transacciones vinculadas a proveedores</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Proveedor</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Gastos</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Ingresos</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Saldo</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Transacciones</th>
                </tr>
              </thead>
              <tbody>
                {supplierBalances.map((s) => {
                  const balance = Number(s.totalExpense) - Number(s.totalIncome);
                  return (
                    <tr key={s.supplierId} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium">{s.supplierName}</td>
                      <td className="px-4 py-3 text-right text-red-400">{formatCurrency(Number(s.totalExpense))}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(Number(s.totalIncome))}</td>
                      <td className="px-4 py-3 text-right font-semibold">
                        <span className={balance > 0 ? "text-red-400" : balance < 0 ? "text-emerald-400" : "text-muted-foreground"}>
                          {formatCurrency(balance)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground hidden sm:table-cell">{s.transactionCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
