import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { useBalances } from "@/hooks/use-transactions";
import {
  useFinancialAccounts,
  createFinancialAccount,
  updateFinancialAccount,
  deleteFinancialAccount,
  type FinancialAccountItem,
} from "@/hooks/use-financial-accounts";
import { HelpTooltip } from "@/components/help-tooltip";
import { CreationFormGuide } from "@/components/creation-form-guide";
import { Users, Truck, Landmark, Plus, Pencil, Trash2, X } from "lucide-react";

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  cash: "Efectivo",
  bank: "Banco",
  wallet: "Billetera",
  card: "Tarjeta",
  other: "Otra",
};

interface AccountFormProps {
  account?: FinancialAccountItem | null;
  onClose: () => void;
  onSaved: () => void;
}

function FinancialAccountFormModal({ account, onClose, onSaved }: AccountFormProps) {
  const isEdit = !!account;
  const [name, setName] = useState(account?.name ?? "");
  const [accountType, setAccountType] = useState(account?.accountType ?? "cash");
  const [openingBalance, setOpeningBalance] = useState(Number(account?.openingBalance || 0));
  const [notes, setNotes] = useState(account?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const nameIsValid = name.trim().length > 0;
  const canSubmit = nameIsValid;

  const fillExampleData = () => {
    setName("Mercado Pago Principal");
    setAccountType("wallet");
    setOpeningBalance(250000);
    setNotes("Cuenta usada para cobros online y transferencias.");
  };

  const clearForm = () => {
    setName("");
    setAccountType("cash");
    setOpeningBalance(0);
    setNotes("");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    if (!name.trim()) {
      setError("El nombre de la cuenta es obligatorio");
      return;
    }

    setSaving(true);
    setError("");
    const payload = {
      name: name.trim(),
      accountType,
      openingBalance,
      notes: notes.trim() || undefined,
    };
    const result = isEdit
      ? await updateFinancialAccount(account!.id, payload)
      : await createFinancialAccount(payload);
    setSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold">{isEdit ? "Editar cuenta financiera" : "Nueva cuenta financiera"}</h2>
          <div className="flex items-center gap-2">
            {!isEdit && (
              <button
                type="button"
                onClick={fillExampleData}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-muted/40 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
              >
                Cargar ejemplo
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
          )}
          {!isEdit && (
            <CreationFormGuide entityName="cuenta" />
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5">Nombre *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Mercado Pago, Efectivo, Santander" className={`w-full px-3 py-2 rounded-lg bg-muted border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 ${submitAttempted && !nameIsValid ? "border-red-500/60" : "border-border"}`} />
            {submitAttempted && !nameIsValid && <p className="text-xs text-red-400 mt-1">Completá el nombre de la cuenta.</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Tipo</label>
              <select value={accountType} onChange={(e) => setAccountType(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="cash">Efectivo</option>
                <option value="bank">Banco</option>
                <option value="wallet">Billetera</option>
                <option value="card">Tarjeta</option>
                <option value="other">Otra</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Saldo inicial</label>
              <input type="number" min="0" value={openingBalance || ""} onChange={(e) => setOpeningBalance(Number(e.target.value))} placeholder="Ej: 250000" className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Notas</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej: Cuenta principal para cobros diarios" rows={3} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
          </div>

          <div className="flex gap-3 pt-2">
            {!isEdit && (
              <button type="button" onClick={clearForm} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">Limpiar</button>
            )}
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
            <button type="submit" disabled={saving || !canSubmit} className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">{saving ? "Guardando..." : isEdit ? "Guardar" : "Crear"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AccountsPage() {
  const { balances, loading } = useBalances();
  const { accounts, loading: accountsLoading, refresh: refreshAccounts } = useFinancialAccounts();
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [editAccount, setEditAccount] = useState<FinancialAccountItem | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const clientBalances = balances?.clientBalances || [];
  const supplierBalances = balances?.supplierBalances || [];
  const financialAccountBalances = accounts.length > 0
    ? accounts.map((account) => ({
        openingBalance: account.openingBalance,
        totalIncome: account.incomeTotal || "0",
        totalExpense: account.expenseTotal || "0",
        currentBalance: account.currentBalance || "0",
      }))
    : (balances?.financialAccountBalances || []).map((account) => ({
        openingBalance: account.openingBalance,
        totalIncome: account.totalIncome,
        totalExpense: account.totalExpense,
        currentBalance: (
          Number(account.openingBalance || 0) +
          Number(account.totalIncome || 0) -
          Number(account.totalExpense || 0)
        ).toFixed(2),
      }));

  const totalClientOwed = clientBalances.reduce((s, c) => s + (Number(c.totalIncome) - Number(c.totalExpense)), 0);
  const totalSupplierOwed = supplierBalances.reduce((s, c) => s + (Number(c.totalExpense) - Number(c.totalIncome)), 0);
  const totalAvailable = financialAccountBalances.reduce((sum, account) => sum + Number(account.currentBalance || 0), 0);

  const handleDeleteAccount = async (accountId: number) => {
    if (!confirm("¿Eliminar esta cuenta financiera?")) return;
    await deleteFinancialAccount(accountId);
    refreshAccounts();
  };

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">Cuentas Corrientes <HelpTooltip text="Resumen de saldos con clientes y proveedores, calculados en base a las transacciones registradas en Ingresos/Gastos." /></h1>
        <p className="text-sm text-muted-foreground mt-0.5">Saldos con clientes y proveedores</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-card/60 backdrop-blur border border-border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
              <Landmark className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-xs text-muted-foreground">Disponible en cuentas</span>
          </div>
          <p className="text-xl font-bold text-blue-400">{formatCurrency(totalAvailable)}</p>
        </div>
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
          <Landmark className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Cuentas financieras</h3>
          <HelpTooltip text="Tus cajas, billeteras y bancos reales. Cada movimiento de Finanzas puede asociarse a una de estas cuentas." iconSize={12} />
          <button
            onClick={() => { setEditAccount(null); setShowAccountForm(true); }}
            className="ml-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Nueva cuenta
          </button>
        </div>
        {accountsLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Cargando cuentas...</div>
        ) : accounts.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground">Todavía no creaste cuentas financieras</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cuenta</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tipo</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Saldo inicial</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Ingresos</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Egresos</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Saldo actual</th>
                  <th className="w-20"></th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium">{account.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{ACCOUNT_TYPE_LABELS[account.accountType] || account.accountType}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(Number(account.openingBalance || 0))}</td>
                    <td className="px-4 py-3 text-right text-emerald-400">{formatCurrency(Number(account.incomeTotal || 0))}</td>
                    <td className="px-4 py-3 text-right text-red-400">{formatCurrency(Number(account.expenseTotal || 0))}</td>
                    <td className="px-4 py-3 text-right font-semibold text-blue-400">{formatCurrency(Number(account.currentBalance || 0))}</td>
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => { setEditAccount(account); setShowAccountForm(true); }} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteAccount(account.id)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-red-400">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Saldos de Clientes</h3>
          <HelpTooltip text="Cuánto te deben tus clientes, calculado como ingresos menos gastos asociados a cada cliente." iconSize={12} />
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
          <HelpTooltip text="Cuánto les debés a tus proveedores, calculado como gastos menos ingresos asociados a cada proveedor." iconSize={12} />
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

      {showAccountForm && (
        <FinancialAccountFormModal
          account={editAccount}
          onClose={() => { setShowAccountForm(false); setEditAccount(null); }}
          onSaved={refreshAccounts}
        />
      )}
    </div>
  );
}
