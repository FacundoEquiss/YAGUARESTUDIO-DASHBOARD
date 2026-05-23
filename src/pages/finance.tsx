import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Pencil,
  Trash2,
  Loader2,
  ArrowUpCircle,
  ArrowDownCircle,
} from "lucide-react";
import {
  useTransactions,
  type Transaction,
  type TransactionInput,
  type TransactionType,
  type PaymentMethod,
  PAYMENT_METHOD_LABELS,
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
} from "@/hooks/use-transactions";
import { useFinancialAccounts } from "@/hooks/use-financial-accounts";
import { useClients } from "@/hooks/use-clients";
import { useSuppliers } from "@/hooks/use-suppliers";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const PAYMENT_METHODS: PaymentMethod[] = ["cash", "transfer", "card", "mercadopago", "other"];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildEmptyInput(type: TransactionType): TransactionInput {
  return {
    type,
    amount: 0,
    category: "",
    description: "",
    date: todayISO(),
    accountId: "",
    relatedOrderId: "",
    relatedClientId: "",
    relatedSupplierId: "",
    paymentMethod: "transfer",
    notes: "",
  };
}

function normalizeForSearch(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function formatDate(d: string): string {
  if (!d) return "Sin fecha";
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

export function FinancePage() {
  const { items: transactions, loading, add, update, remove } = useTransactions();
  const { items: accounts } = useFinancialAccounts();
  const { toast } = useToast();

  const [tab, setTab] = useState<"all" | "income" | "expense">("all");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [formType, setFormType] = useState<TransactionType>("income");
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Transaction | null>(null);

  const stats = useMemo(() => {
    const income = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const expense = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    return { income, expense, balance: income - expense };
  }, [transactions]);

  const filtered = useMemo(() => {
    const term = normalizeForSearch(search.trim());
    return transactions.filter((t) => {
      if (tab !== "all" && t.type !== tab) return false;
      if (!term) return true;
      const hay = normalizeForSearch([t.description, t.category, t.notes].filter(Boolean).join(" "));
      return hay.includes(term);
    });
  }, [transactions, tab, search]);

  function openCreate(type: TransactionType) {
    setFormType(type);
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(transaction: Transaction) {
    setFormType(transaction.type);
    setEditing(transaction);
    setFormOpen(true);
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    try {
      await remove(confirmDelete.id);
      toast({ title: "Movimiento eliminado" });
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar.", variant: "destructive" });
    } finally {
      setConfirmDelete(null);
    }
  }

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-6 flex flex-col gap-6 pb-12 max-w-6xl">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl text-foreground font-display font-bold flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-primary" /> Ingresos y gastos
          </h1>
          <p className="text-muted-foreground mt-1 font-medium">
            La plata que entra y la que sale, en un solo lugar.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => openCreate("expense")} variant="outline" size="lg" className="rounded-2xl">
            <ArrowDownCircle className="w-4 h-4 mr-2 text-red-400" /> Gasto
          </Button>
          <Button onClick={() => openCreate("income")} size="lg" className="rounded-2xl">
            <ArrowUpCircle className="w-4 h-4 mr-2" /> Ingreso
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Ingresos</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-display font-black text-emerald-400">
              {formatCurrency(stats.income)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Gastos</span>
              <TrendingDown className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-2xl font-display font-black text-red-400">
              {formatCurrency(stats.expense)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Balance</span>
              <DollarSign className="w-4 h-4 text-primary" />
            </div>
            <div className={`text-2xl font-display font-black ${stats.balance >= 0 ? "text-foreground" : "text-orange-400"}`}>
              {formatCurrency(stats.balance)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "all" | "income" | "expense")}>
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="income">Ingresos</TabsTrigger>
            <TabsTrigger value="expense">Gastos</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por descripción, categoría…"
            className="pl-9 h-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <DollarSign className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
            <h3 className="text-lg font-bold mb-1">
              {transactions.length === 0 ? "Sin movimientos todavía" : "Sin resultados"}
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              {transactions.length === 0
                ? "Empezá a llevar tus ingresos y gastos."
                : "Probá con otro filtro o búsqueda."}
            </p>
            {transactions.length === 0 ? (
              <div className="flex gap-2 justify-center">
                <Button onClick={() => openCreate("income")}>
                  <ArrowUpCircle className="w-4 h-4 mr-2" /> Primer ingreso
                </Button>
                <Button onClick={() => openCreate("expense")} variant="outline">
                  <ArrowDownCircle className="w-4 h-4 mr-2" /> Primer gasto
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => (
            <TransactionRow
              key={t.id}
              transaction={t}
              accountName={accounts.find((a) => a.id === t.accountId)?.name ?? ""}
              onEdit={() => openEdit(t)}
              onDelete={() => setConfirmDelete(t)}
            />
          ))}
        </div>
      )}

      <TransactionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        type={formType}
        transaction={editing}
        onSave={async (data) => {
          if (editing) {
            await update(editing.id, data);
            toast({ title: "Movimiento actualizado" });
          } else {
            await add(data);
            toast({ title: "Movimiento guardado" });
          }
        }}
      />

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar movimiento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TransactionRow({
  transaction,
  accountName,
  onEdit,
  onDelete,
}: {
  transaction: Transaction;
  accountName: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isIncome = transaction.type === "income";
  return (
    <Card className="hover:border-primary/30 transition-colors">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isIncome ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
            }`}
          >
            {isIncome ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate">
              {transaction.description || transaction.category || "Sin descripción"}
            </div>
            <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2 mt-0.5">
              {transaction.category ? <span>{transaction.category}</span> : null}
              <span>·</span>
              <span>{formatDate(transaction.date)}</span>
              {accountName ? (
                <>
                  <span>·</span>
                  <span>{accountName}</span>
                </>
              ) : null}
            </div>
          </div>

          <div className={`font-bold text-base shrink-0 ${isIncome ? "text-emerald-400" : "text-red-400"}`}>
            {isIncome ? "+" : "−"} {formatCurrency(transaction.amount)}
          </div>

          <div className="flex gap-1 shrink-0">
            <button
              onClick={onEdit}
              className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Editar"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              aria-label="Eliminar"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TransactionFormDialog({
  open,
  onOpenChange,
  type,
  transaction,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: TransactionType;
  transaction: Transaction | null;
  onSave: (data: TransactionInput) => Promise<void>;
}) {
  const isEdit = !!transaction;
  const { items: accounts } = useFinancialAccounts();
  const { items: clients } = useClients();
  const { items: suppliers } = useSuppliers();
  const [form, setForm] = useState<TransactionInput>(buildEmptyInput(type));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isIncome = form.type === "income";
  const categories = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  useEffect(() => {
    if (!open) return;
    setForm(
      transaction
        ? {
            type: transaction.type,
            amount: transaction.amount ?? 0,
            category: transaction.category ?? "",
            description: transaction.description ?? "",
            date: transaction.date ?? todayISO(),
            accountId: transaction.accountId ?? "",
            relatedOrderId: transaction.relatedOrderId ?? "",
            relatedClientId: transaction.relatedClientId ?? "",
            relatedSupplierId: transaction.relatedSupplierId ?? "",
            paymentMethod: transaction.paymentMethod ?? "transfer",
            notes: transaction.notes ?? "",
          }
        : buildEmptyInput(type),
    );
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.amount <= 0) {
      setError("El monto debe ser mayor a 0.");
      return;
    }
    if (!form.description.trim() && !form.category.trim()) {
      setError("Agregá una descripción o categoría.");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        ...form,
        description: form.description.trim(),
        category: form.category.trim(),
        notes: form.notes.trim(),
      });
      onOpenChange(false);
    } catch {
      setError("No se pudo guardar. Probá de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar" : "Nuevo"} {isIncome ? "ingreso" : "gasto"}
          </DialogTitle>
          <DialogDescription>
            {isIncome ? "Registrá un ingreso." : "Registrá un gasto."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="tx-amount">Monto *</Label>
              <Input
                id="tx-amount"
                type="number"
                min="0"
                step="0.01"
                value={form.amount || ""}
                onChange={(e) => setForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tx-date">Fecha</Label>
              <Input
                id="tx-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tx-category">Categoría</Label>
            <Input
              id="tx-category"
              list="tx-categories"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              placeholder={isIncome ? "Ventas, Servicios…" : "Insumos, Alquiler…"}
            />
            <datalist id="tx-categories">
              {categories.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tx-desc">Descripción</Label>
            <Input
              id="tx-desc"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder={isIncome ? "Cobro pedido #123" : "Compra de DTF marzo"}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="tx-method">Forma de pago</Label>
              <Select
                value={form.paymentMethod}
                onValueChange={(v) => setForm((f) => ({ ...f, paymentMethod: v as PaymentMethod }))}
              >
                <SelectTrigger id="tx-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {PAYMENT_METHOD_LABELS[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tx-account">Cuenta</Label>
              <Select
                value={form.accountId || "__none__"}
                onValueChange={(v) => setForm((f) => ({ ...f, accountId: v === "__none__" ? "" : v }))}
              >
                <SelectTrigger id="tx-account">
                  <SelectValue placeholder="Sin cuenta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin cuenta</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isIncome && clients.length > 0 ? (
            <div className="space-y-2">
              <Label htmlFor="tx-client">Cliente (opcional)</Label>
              <Select
                value={form.relatedClientId || "__none__"}
                onValueChange={(v) => setForm((f) => ({ ...f, relatedClientId: v === "__none__" ? "" : v }))}
              >
                <SelectTrigger id="tx-client">
                  <SelectValue placeholder="Sin cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin cliente</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {!isIncome && suppliers.length > 0 ? (
            <div className="space-y-2">
              <Label htmlFor="tx-supplier">Proveedor (opcional)</Label>
              <Select
                value={form.relatedSupplierId || "__none__"}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, relatedSupplierId: v === "__none__" ? "" : v }))
                }
              >
                <SelectTrigger id="tx-supplier">
                  <SelectValue placeholder="Sin proveedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin proveedor</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="tx-notes">Notas</Label>
            <Textarea
              id="tx-notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
            />
          </div>

          {error ? <div className="text-sm text-destructive">{error}</div> : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
