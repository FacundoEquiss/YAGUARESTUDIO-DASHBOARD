import { useEffect, useMemo, useState } from "react";
import { takeOrderDraft } from "@/lib/order-draft";
import {
  Plus,
  Search,
  ClipboardList,
  Pencil,
  Trash2,
  Loader2,
  Calendar,
  User,
  StickyNote,
  X,
  MessageCircle,
} from "lucide-react";
import {
  useOrders,
  type Order,
  type OrderInput,
  type OrderItem,
  type OrderStatus,
  type PaymentStatus,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
} from "@/hooks/use-orders";
import { useClients } from "@/hooks/use-clients";
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
import { HelpTooltip } from "@/components/help-tooltip";

const STATUS_ORDER: OrderStatus[] = ["draft", "in_progress", "ready", "delivered", "cancelled"];

const EMPTY_INPUT: OrderInput = {
  clientId: "",
  clientName: "",
  orderName: "",
  items: [{ description: "", quantity: 1, unitPrice: 0 }],
  total: 0,
  paidAmount: 0,
  paymentStatus: "unpaid",
  status: "draft",
  dueDate: "",
  notes: "",
};

function normalizeForSearch(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function computeTotal(items: OrderItem[]): number {
  return items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);
}

function computePaymentStatus(paid: number, total: number): PaymentStatus {
  if (paid <= 0) return "unpaid";
  if (paid >= total) return "paid";
  return "partial";
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "Sin fecha";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

export function OrdersPage() {
  const { items: orders, loading, add, update, remove } = useOrders();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Order | null>(null);
  const [draftPrefill, setDraftPrefill] = useState<OrderInput | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Order | null>(null);

  // If we arrived from the DTF calculator with a draft, open the form prefilled.
  useEffect(() => {
    const draft = takeOrderDraft();
    if (draft) {
      setEditing(null);
      setDraftPrefill({
        ...EMPTY_INPUT,
        clientName: draft.clientName,
        orderName: draft.orderName,
        items: draft.items.length ? draft.items : EMPTY_INPUT.items,
        notes: draft.notes,
        total: draft.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0),
      });
      setFormOpen(true);
    }
  }, []);

  const filtered = useMemo(() => {
    const term = normalizeForSearch(search.trim());
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (!term) return true;
      const haystack = normalizeForSearch(
        [o.clientName, o.orderName, ...o.items.map((i) => i.description)].filter(Boolean).join(" "),
      );
      return haystack.includes(term);
    });
  }, [orders, search, statusFilter]);

  const stats = useMemo(() => {
    const totalRevenue = orders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + (o.total || 0), 0);
    const unpaid = orders
      .filter((o) => o.status !== "cancelled" && o.paymentStatus !== "paid")
      .reduce((sum, o) => sum + Math.max(0, (o.total || 0) - (o.paidAmount || 0)), 0);
    return {
      count: orders.length,
      inProgress: orders.filter((o) => o.status === "in_progress").length,
      totalRevenue,
      unpaid,
    };
  }, [orders]);

  function openCreate() {
    setEditing(null);
    setDraftPrefill(null);
    setFormOpen(true);
  }

  function openEdit(order: Order) {
    setEditing(order);
    setDraftPrefill(null);
    setFormOpen(true);
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    try {
      await remove(confirmDelete.id);
      toast({ title: "Pedido eliminado" });
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar.", variant: "destructive" });
    } finally {
      setConfirmDelete(null);
    }
  }

  async function handleStatusChange(order: Order, status: OrderStatus) {
    try {
      await update(order.id, { status });
    } catch {
      toast({ title: "Error", description: "No se pudo actualizar el estado.", variant: "destructive" });
    }
  }

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-6 flex flex-col gap-6 pb-12 max-w-6xl">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl text-foreground font-display font-bold flex items-center gap-2">
            <ClipboardList className="w-7 h-7 text-primary" /> Pedidos
            <HelpTooltip text="El registro de tus ventas. Cargá los ítems, asigná un cliente, seguí el estado (borrador, en proceso, listo, entregado) y cuánto te pagaron. El total se calcula solo." />
          </h1>
          <p className="text-muted-foreground mt-1 font-medium">
            Llevá un registro claro de cada venta.
          </p>
        </div>
        <Button onClick={openCreate} size="lg" className="rounded-2xl">
          <Plus className="w-4 h-4 mr-2" /> Nuevo pedido
        </Button>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total pedidos" value={stats.count.toString()} />
        <StatCard label="En proceso" value={stats.inProgress.toString()} />
        <StatCard label="Facturado" value={formatCurrency(stats.totalRevenue)} />
        <StatCard label="A cobrar" value={formatCurrency(stats.unpaid)} highlight={stats.unpaid > 0} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, pedido o detalle…"
            className="pl-9 h-11"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as OrderStatus | "all")}>
          <SelectTrigger className="w-full sm:w-48 h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {STATUS_ORDER.map((s) => (
              <SelectItem key={s} value={s}>
                {ORDER_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <ClipboardList className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
            <h3 className="text-lg font-bold mb-1">
              {orders.length === 0 ? "Todavía no cargaste pedidos" : "Sin resultados"}
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              {orders.length === 0
                ? "Registrá tu primer pedido para empezar a llevar el control de ventas."
                : "Probá con otra búsqueda o filtro."}
            </p>
            {orders.length === 0 ? (
              <Button onClick={openCreate}>
                <Plus className="w-4 h-4 mr-2" /> Cargar primer pedido
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <OrderRow
              key={order.id}
              order={order}
              onEdit={() => openEdit(order)}
              onDelete={() => setConfirmDelete(order)}
              onStatusChange={(s) => handleStatusChange(order, s)}
            />
          ))}
        </div>
      )}

      <OrderFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        order={editing}
        draft={draftPrefill}
        onSave={async (data) => {
          if (editing) {
            await update(editing.id, data);
            toast({ title: "Pedido actualizado" });
          } else {
            await add(data);
            toast({ title: "Pedido creado" });
          }
        }}
      />

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar pedido?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.orderName ? <>Se va a eliminar <strong>{confirmDelete.orderName}</strong>. </> : "Se va a eliminar el pedido. "}
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

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</div>
        <div className={`mt-1 text-xl font-display font-bold ${highlight ? "text-orange-400" : "text-foreground"}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function OrderRow({
  order,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  order: Order;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (s: OrderStatus) => void;
}) {
  const balance = (order.total || 0) - (order.paidAmount || 0);
  return (
    <Card className="hover:border-primary/30 transition-colors">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-start">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start gap-2 flex-wrap">
              <h3 className="font-bold text-base">{order.orderName || "Pedido sin nombre"}</h3>
              <span className={`text-[11px] px-2 py-0.5 rounded-md border font-semibold ${ORDER_STATUS_COLORS[order.status]}`}>
                {ORDER_STATUS_LABELS[order.status]}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {order.clientName ? (
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  {order.clientName}
                </span>
              ) : null}
              {order.dueDate ? (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(order.dueDate)}
                </span>
              ) : null}
              <span>
                {order.items.length} {order.items.length === 1 ? "ítem" : "ítems"}
              </span>
            </div>

            {order.notes ? (
              <p className="text-xs text-muted-foreground flex gap-1.5 items-start">
                <StickyNote className="w-3 h-3 shrink-0 mt-0.5" />
                <span className="line-clamp-2">{order.notes}</span>
              </p>
            ) : null}
          </div>

          <div className="flex sm:flex-col sm:items-end gap-2 sm:gap-1 sm:text-right">
            <div className="flex-1 sm:flex-initial">
              <div className="text-lg font-display font-bold text-foreground">
                {formatCurrency(order.total)}
              </div>
              {balance > 0 && order.status !== "cancelled" ? (
                <div className="text-xs text-orange-400 font-semibold">
                  Falta: {formatCurrency(balance)}
                </div>
              ) : (
                <div className="text-xs text-emerald-400 font-semibold">
                  {PAYMENT_STATUS_LABELS[order.paymentStatus]}
                </div>
              )}
            </div>
            <div className="flex gap-1">
              <Select value={order.status} onValueChange={(v) => onStatusChange(v as OrderStatus)}>
                <SelectTrigger className="h-8 text-xs w-32" aria-label="Cambiar estado">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">
                      {ORDER_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
        </div>
      </CardContent>
    </Card>
  );
}

function OrderFormDialog({
  open,
  onOpenChange,
  order,
  draft,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  draft?: OrderInput | null;
  onSave: (data: OrderInput) => Promise<void>;
}) {
  const isEdit = !!order;
  const { items: clients } = useClients();
  const [form, setForm] = useState<OrderInput>(EMPTY_INPUT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Rebuild the form whenever the dialog opens, regardless of how it was
  // triggered (user click or programmatic open from a calculator draft).
  useEffect(() => {
    if (!open) return;
    setForm(
      order
        ? {
            clientId: order.clientId ?? "",
            clientName: order.clientName ?? "",
            orderName: order.orderName ?? "",
            items: order.items?.length
              ? order.items.map((i) => ({
                  description: i.description ?? "",
                  quantity: i.quantity ?? 0,
                  unitPrice: i.unitPrice ?? 0,
                }))
              : [{ description: "", quantity: 1, unitPrice: 0 }],
            total: order.total ?? 0,
            paidAmount: order.paidAmount ?? 0,
            paymentStatus: order.paymentStatus ?? "unpaid",
            status: order.status ?? "draft",
            dueDate: order.dueDate ?? "",
            notes: order.notes ?? "",
          }
        : draft ?? EMPTY_INPUT,
    );
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const total = useMemo(() => computeTotal(form.items), [form.items]);

  function updateItem(idx: number, patch: Partial<OrderItem>) {
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    }));
  }

  function addItem() {
    setForm((f) => ({ ...f, items: [...f.items, { description: "", quantity: 1, unitPrice: 0 }] }));
  }

  function removeItem(idx: number) {
    setForm((f) => ({
      ...f,
      items: f.items.length > 1 ? f.items.filter((_, i) => i !== idx) : f.items,
    }));
  }

  function selectClient(clientId: string) {
    if (clientId === "__none__") {
      setForm((f) => ({ ...f, clientId: "", clientName: "" }));
      return;
    }
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      setForm((f) => ({ ...f, clientId: client.id, clientName: client.name }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.clientName.trim()) {
      setError("Indicá el cliente del pedido.");
      return;
    }
    if (form.items.every((it) => !it.description.trim())) {
      setError("Agregá al menos un ítem con descripción.");
      return;
    }
    const computedTotal = total;
    const paid = Math.max(0, Number(form.paidAmount) || 0);
    const paymentStatus = computePaymentStatus(paid, computedTotal);

    setSaving(true);
    try {
      await onSave({
        ...form,
        clientName: form.clientName.trim(),
        orderName: form.orderName.trim(),
        notes: form.notes.trim(),
        items: form.items.filter((it) => it.description.trim()),
        total: computedTotal,
        paidAmount: paid,
        paymentStatus,
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar pedido" : "Nuevo pedido"}</DialogTitle>
          <DialogDescription>
            Cargá los datos del pedido. El total se calcula automáticamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ord-name">Nombre del pedido</Label>
              <Input
                id="ord-name"
                value={form.orderName}
                onChange={(e) => setForm((f) => ({ ...f, orderName: e.target.value }))}
                placeholder="Remeras evento empresa X"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ord-client">Cliente *</Label>
              {clients.length > 0 ? (
                <Select value={form.clientId || "__none__"} onValueChange={selectClient}>
                  <SelectTrigger id="ord-client">
                    <SelectValue placeholder="Elegí un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin cliente registrado</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
              <Input
                value={form.clientName}
                onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value, clientId: "" }))}
                placeholder={clients.length > 0 ? "O escribí un nombre nuevo" : "Nombre del cliente"}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Ítems del pedido</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Agregar ítem
              </Button>
            </div>
            <div className="space-y-2">
              {form.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-start">
                  <Input
                    className="col-span-6"
                    value={item.description}
                    onChange={(e) => updateItem(idx, { description: e.target.value })}
                    placeholder="Remera DTF talle M"
                  />
                  <Input
                    className="col-span-2"
                    type="number"
                    min="1"
                    value={item.quantity || ""}
                    onChange={(e) => updateItem(idx, { quantity: parseInt(e.target.value) || 0 })}
                    placeholder="Cant."
                  />
                  <Input
                    className="col-span-3"
                    type="number"
                    min="0"
                    value={item.unitPrice || ""}
                    onChange={(e) => updateItem(idx, { unitPrice: parseFloat(e.target.value) || 0 })}
                    placeholder="Precio unit."
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    disabled={form.items.length === 1}
                    className="col-span-1 h-10 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground transition-colors flex items-center justify-center"
                    aria-label="Quitar ítem"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ord-status">Estado</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v as OrderStatus }))}
              >
                <SelectTrigger id="ord-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>
                      {ORDER_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ord-due">Fecha de entrega</Label>
              <Input
                id="ord-due"
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ord-paid">Cobrado</Label>
              <Input
                id="ord-paid"
                type="number"
                min="0"
                value={form.paidAmount || ""}
                onChange={(e) => setForm((f) => ({ ...f, paidAmount: parseFloat(e.target.value) || 0 }))}
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ord-notes">Notas</Label>
            <Textarea
              id="ord-notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Detalles, observaciones, etc."
              rows={2}
            />
          </div>

          <div className="bg-secondary/50 rounded-xl p-4 flex items-center justify-between">
            <span className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Total</span>
            <span className="text-2xl font-display font-black text-foreground">{formatCurrency(total)}</span>
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
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isEdit ? (
                "Guardar"
              ) : (
                "Crear pedido"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
