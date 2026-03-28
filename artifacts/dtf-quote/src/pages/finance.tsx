import { useState, useRef } from "react";
import { cn, formatCurrency } from "@/lib/utils";
import {
  useTransactions,
  useTransactionSummary,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  type TransactionItem,
  type CreateTransactionData,
} from "@/hooks/use-transactions";
import { useAllClients } from "@/hooks/use-clients";
import { useAllSuppliers } from "@/hooks/use-suppliers";
import { useAllOrders } from "@/hooks/use-orders";
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  X,
  ArrowUpCircle,
  ArrowDownCircle,
  DollarSign,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

const INCOME_CATEGORIES = [
  { value: "venta", label: "Venta" },
  { value: "anticipo", label: "Anticipo" },
  { value: "otro", label: "Otro" },
];

const EXPENSE_CATEGORIES = [
  { value: "materiales", label: "Materiales" },
  { value: "envio", label: "Envío" },
  { value: "servicios", label: "Servicios" },
  { value: "impuestos", label: "Impuestos" },
  { value: "otros", label: "Otros" },
];

function getCategoryLabel(cat: string): string {
  const all = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];
  return all.find((c) => c.value === cat)?.label || cat;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

interface TxFormProps {
  tx?: TransactionItem | null;
  onClose: () => void;
  onSaved: () => void;
}

function TransactionFormModal({ tx, onClose, onSaved }: TxFormProps) {
  const isEdit = !!tx;
  const { clients: allClients } = useAllClients();
  const { suppliers: allSuppliers } = useAllSuppliers();
  const { orders: allOrders } = useAllOrders();
  const [type, setType] = useState<"income" | "expense">(tx?.type ?? "income");
  const [amount, setAmount] = useState(tx ? Number(tx.amount) : 0);
  const [description, setDescription] = useState(tx?.description ?? "");
  const [category, setCategory] = useState(tx?.category ?? "venta");
  const [clientId, setClientId] = useState<number | null>(tx?.clientId ?? null);
  const [supplierId, setSupplierId] = useState<number | null>(tx?.supplierId ?? null);
  const [orderId, setOrderId] = useState<number | null>(tx?.orderId ?? null);
  const [date, setDate] = useState(tx?.date ? new Date(tx.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleTypeChange = (newType: "income" | "expense") => {
    setType(newType);
    const newCats = newType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    if (!newCats.find((c) => c.value === category)) {
      setCategory(newCats[0].value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) { setError("El monto debe ser mayor a 0"); return; }
    if (!category) { setError("Seleccioná una categoría"); return; }
    setSaving(true);
    setError("");

    const payload: CreateTransactionData = {
      type,
      amount,
      description: description.trim() || undefined,
      category,
      clientId: clientId || undefined,
      supplierId: supplierId || undefined,
      orderId: orderId || undefined,
      date: date || undefined,
    };

    const result = isEdit ? await updateTransaction(tx!.id, payload) : await createTransaction(payload);
    setSaving(false);
    if (result.error) { setError(result.error); return; }
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold">{isEdit ? "Editar Transacción" : "Nueva Transacción"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

          <div className="flex rounded-xl overflow-hidden border border-border">
            <button type="button" onClick={() => handleTypeChange("income")} className={cn("flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors", type === "income" ? "bg-emerald-500/15 text-emerald-400" : "bg-muted/30 text-muted-foreground hover:bg-muted/50")}>
              <ArrowUpCircle className="w-4 h-4" /> Ingreso
            </button>
            <button type="button" onClick={() => handleTypeChange("expense")} className={cn("flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors", type === "expense" ? "bg-red-500/15 text-red-400" : "bg-muted/30 text-muted-foreground hover:bg-muted/50")}>
              <ArrowDownCircle className="w-4 h-4" /> Gasto
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Monto *</label>
            <input type="number" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} placeholder="0" min="1" step="1" className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Categoría *</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Fecha</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Descripción</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción de la transacción" className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {allClients.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-1.5">Cliente (opcional)</label>
                <select value={clientId ?? ""} onChange={(e) => setClientId(e.target.value ? Number(e.target.value) : null)} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                  <option value="">Sin cliente</option>
                  {allClients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            {allSuppliers.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-1.5">Proveedor (opcional)</label>
                <select value={supplierId ?? ""} onChange={(e) => setSupplierId(e.target.value ? Number(e.target.value) : null)} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                  <option value="">Sin proveedor</option>
                  {allSuppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
          </div>

          {allOrders.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Pedido (opcional)</label>
              <select value={orderId ?? ""} onChange={(e) => setOrderId(e.target.value ? Number(e.target.value) : null)} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="">Sin pedido</option>
                {allOrders.map((o) => <option key={o.id} value={o.id}>#{o.id} — {o.clientName} ({formatCurrency(Number(o.totalPrice))})</option>)}
              </select>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">{saving ? "Guardando..." : isEdit ? "Guardar" : "Crear"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function FinancePage() {
  const [typeFilter, setTypeFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editTx, setEditTx] = useState<TransactionItem | null>(null);

  const searchTimer = useRef<ReturnType<typeof setTimeout>>();
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(val), 300);
  };

  const { transactions, total, totalPages, loading, refresh } = useTransactions({
    type: typeFilter || undefined,
    category: categoryFilter || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    search: debouncedSearch || undefined,
    page,
    limit: 20,
    sortBy: "date",
    sortDir: "desc",
  });

  const { summary } = useTransactionSummary();

  const handleSaved = () => {
    refresh();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar esta transacción?")) return;
    await deleteTransaction(id);
    refresh();
  };

  const monthIncome = Number(summary?.monthIncome || 0);
  const monthExpenses = Number(summary?.monthExpenses || 0);
  const balance = monthIncome - monthExpenses;

  const filteredIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const filteredExpenses = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const filteredBalance = filteredIncome - filteredExpenses;
  const hasFilters = !!typeFilter || !!categoryFilter || !!debouncedSearch || !!dateFrom || !!dateTo;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ingresos / Gastos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{total} transaccion{total !== 1 ? "es" : ""}</p>
        </div>
        <button onClick={() => { setEditTx(null); setShowForm(true); }} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4" /> Nueva Transacción
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card/60 backdrop-blur border border-border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-xs text-muted-foreground">Ingresos del mes</span>
          </div>
          <p className="text-xl font-bold text-emerald-400">{formatCurrency(monthIncome)}</p>
        </div>
        <div className="bg-card/60 backdrop-blur border border-border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-red-400" />
            </div>
            <span className="text-xs text-muted-foreground">Gastos del mes</span>
          </div>
          <p className="text-xl font-bold text-red-400">{formatCurrency(monthExpenses)}</p>
        </div>
        <div className="bg-card/60 backdrop-blur border border-border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-xs text-muted-foreground">Balance</span>
          </div>
          <p className={cn("text-xl font-bold", balance >= 0 ? "text-emerald-400" : "text-red-400")}>{formatCurrency(balance)}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" value={search} onChange={(e) => handleSearchChange(e.target.value)} placeholder="Buscar por descripción..." className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="px-3 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
          <option value="">Todos</option>
          <option value="income">Ingresos</option>
          <option value="expense">Gastos</option>
        </select>
        <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }} className="px-3 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
          <option value="">Categorías</option>
          <optgroup label="Ingresos">
            {INCOME_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </optgroup>
          <optgroup label="Gastos">
            {EXPENSE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </optgroup>
        </select>
        <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} placeholder="Desde" className="px-3 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
        <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} placeholder="Hasta" className="px-3 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
      </div>

      {loading && transactions.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <DollarSign className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">{debouncedSearch || typeFilter || categoryFilter ? "Sin resultados" : "Sin transacciones"}</h3>
          <p className="text-sm text-muted-foreground mb-4">{debouncedSearch || typeFilter || categoryFilter ? "Probá con otros filtros" : "Registrá tu primer ingreso o gasto"}</p>
          {!debouncedSearch && !typeFilter && !categoryFilter && (
            <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4" /> Nueva Transacción
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fecha</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Descripción</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Categoría</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Vinculado</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Monto</th>
                    <th className="w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors group">
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(tx.date)}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium truncate max-w-[200px]">{tx.description || "Sin descripción"}</p>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border", tx.type === "income" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" : "bg-red-500/15 text-red-400 border-red-500/20")}>
                          {getCategoryLabel(tx.category)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell truncate max-w-[150px]">
                        {tx.clientName || tx.supplierName || "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                        <span className={tx.type === "income" ? "text-emerald-400" : "text-red-400"}>
                          {tx.type === "income" ? "+" : "-"}{formatCurrency(Number(tx.amount))}
                        </span>
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditTx(tx); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(tx.id)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-red-400">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/40">
                    <td colSpan={3} className="px-4 py-3 text-xs font-medium text-muted-foreground">
                      {hasFilters ? "Totales filtrados" : "Totales de página"}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell"></td>
                    <td className="px-4 py-3 text-right text-xs font-semibold">
                      {filteredIncome > 0 && <span className="text-emerald-400 block">+{formatCurrency(filteredIncome)}</span>}
                      {filteredExpenses > 0 && <span className="text-red-400 block">-{formatCurrency(filteredExpenses)}</span>}
                      <span className={cn("font-bold", filteredBalance >= 0 ? "text-emerald-400" : "text-red-400")}>{formatCurrency(filteredBalance)}</span>
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">Página {page} de {totalPages}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </>
      )}

      {showForm && (
        <TransactionFormModal
          tx={editTx}
          onClose={() => { setShowForm(false); setEditTx(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
