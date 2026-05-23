import { useEffect, useMemo, useState } from "react";
import { Plus, Landmark, Pencil, Trash2, Loader2, Wallet, Banknote, Building2 } from "lucide-react";
import {
  useFinancialAccounts,
  type FinancialAccount,
  type FinancialAccountInput,
  type AccountType,
  ACCOUNT_TYPE_LABELS,
} from "@/hooks/use-financial-accounts";
import { useTransactions } from "@/hooks/use-transactions";
import { HelpTooltip } from "@/components/help-tooltip";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
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

const ACCOUNT_TYPES: AccountType[] = ["bank", "wallet", "cash", "other"];

const ACCOUNT_TYPE_ICONS: Record<AccountType, typeof Building2> = {
  bank: Building2,
  wallet: Wallet,
  cash: Banknote,
  other: Landmark,
};

const EMPTY_INPUT: FinancialAccountInput = {
  name: "",
  type: "bank",
  initialBalance: 0,
  description: "",
};

export function AccountsPage() {
  const { items: accounts, loading, add, update, remove } = useFinancialAccounts();
  const { items: transactions } = useTransactions();
  const { toast } = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FinancialAccount | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<FinancialAccount | null>(null);

  const accountsWithBalance = useMemo(() => {
    return accounts.map((acc) => {
      let balance = acc.initialBalance || 0;
      for (const t of transactions) {
        if (t.accountId !== acc.id) continue;
        balance += t.type === "income" ? t.amount : -t.amount;
      }
      return { ...acc, balance };
    });
  }, [accounts, transactions]);

  const totalBalance = accountsWithBalance.reduce((sum, a) => sum + a.balance, 0);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(account: FinancialAccount) {
    setEditing(account);
    setFormOpen(true);
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    try {
      await remove(confirmDelete.id);
      toast({ title: "Cuenta eliminada" });
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar.", variant: "destructive" });
    } finally {
      setConfirmDelete(null);
    }
  }

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-6 flex flex-col gap-6 pb-12 max-w-5xl">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl text-foreground font-display font-bold flex items-center gap-2">
            <Landmark className="w-7 h-7 text-primary" /> Cuentas corrientes
            <HelpTooltip text="Tus billeteras: banco, Mercado Pago, efectivo. El saldo de cada una se calcula solo sumando los ingresos y restando los gastos que le asignás en Finanzas." />
          </h1>
          <p className="text-muted-foreground mt-1 font-medium">
            Banco, Mercado Pago, efectivo… todo lo que manejás.
          </p>
        </div>
        <Button onClick={openCreate} size="lg" className="rounded-2xl">
          <Plus className="w-4 h-4 mr-2" /> Nueva cuenta
        </Button>
      </header>

      {accounts.length > 0 ? (
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Saldo total disponible
            </span>
            <span className={`text-2xl font-display font-black ${totalBalance >= 0 ? "text-foreground" : "text-orange-400"}`}>
              {formatCurrency(totalBalance)}
            </span>
          </CardContent>
        </Card>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : accounts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <Landmark className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
            <h3 className="text-lg font-bold mb-1">Sin cuentas todavía</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              Agregá tus cuentas para que los ingresos y gastos se asocien y se calcule el saldo
              automáticamente.
            </p>
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" /> Crear primera cuenta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accountsWithBalance.map((acc) => {
            const Icon = ACCOUNT_TYPE_ICONS[acc.type];
            return (
              <Card key={acc.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-base truncate">{acc.name}</h3>
                        <p className="text-xs text-muted-foreground">{ACCOUNT_TYPE_LABELS[acc.type]}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => openEdit(acc)}
                        className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Editar"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(acc)}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        aria-label="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border">
                    <div className="text-xs font-medium text-muted-foreground">Saldo actual</div>
                    <div className={`text-2xl font-display font-black ${acc.balance >= 0 ? "text-foreground" : "text-orange-400"}`}>
                      {formatCurrency(acc.balance)}
                    </div>
                  </div>

                  {acc.description ? (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{acc.description}</p>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AccountFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        account={editing}
        onSave={async (data) => {
          if (editing) {
            await update(editing.id, data);
            toast({ title: "Cuenta actualizada" });
          } else {
            await add(data);
            toast({ title: "Cuenta creada" });
          }
        }}
      />

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cuenta?</AlertDialogTitle>
            <AlertDialogDescription>
              Se va a eliminar <strong>{confirmDelete?.name}</strong>. Los movimientos asociados se
              mantienen pero quedan sin cuenta. Esta acción no se puede deshacer.
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

function AccountFormDialog({
  open,
  onOpenChange,
  account,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: FinancialAccount | null;
  onSave: (data: FinancialAccountInput) => Promise<void>;
}) {
  const isEdit = !!account;
  const [form, setForm] = useState<FinancialAccountInput>(EMPTY_INPUT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(
      account
        ? {
            name: account.name ?? "",
            type: account.type ?? "bank",
            initialBalance: account.initialBalance ?? 0,
            description: account.description ?? "",
          }
        : EMPTY_INPUT,
    );
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.name.trim().length < 2) {
      setError("El nombre es obligatorio.");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        name: form.name.trim(),
        type: form.type,
        initialBalance: Number(form.initialBalance) || 0,
        description: form.description.trim(),
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar cuenta" : "Nueva cuenta"}</DialogTitle>
          <DialogDescription>
            Tus cuentas son los lugares donde guardás plata: banco, billetera virtual, efectivo, etc.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="acc-name">Nombre *</Label>
            <Input
              id="acc-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Banco Galicia / Mercado Pago / Caja"
              autoFocus
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="acc-type">Tipo</Label>
            <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as AccountType }))}>
              <SelectTrigger id="acc-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {ACCOUNT_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="acc-initial">Saldo inicial</Label>
            <Input
              id="acc-initial"
              type="number"
              step="0.01"
              value={form.initialBalance || ""}
              onChange={(e) => setForm((f) => ({ ...f, initialBalance: parseFloat(e.target.value) || 0 }))}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground">
              Si la cuenta ya tiene plata cuando la cargás, indicá el saldo de partida. Los movimientos
              futuros se suman/restan automáticamente.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="acc-desc">Descripción</Label>
            <Textarea
              id="acc-desc"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Notas opcionales sobre esta cuenta."
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
