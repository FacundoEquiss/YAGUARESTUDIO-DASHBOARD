import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Truck, Pencil, Trash2, Mail, Phone, User, Tag, StickyNote, Loader2 } from "lucide-react";
import { useSuppliers, type Supplier, type SupplierInput } from "@/hooks/use-suppliers";
import { HelpTooltip } from "@/components/help-tooltip";
import { useAppCategories } from "@/hooks/use-app-categories";
import { ConfigureButton } from "@/components/configure-button";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
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

const EMPTY_INPUT: SupplierInput = {
  name: "",
  contactName: "",
  email: "",
  phone: "",
  category: "",
  notes: "",
};


function normalizeForSearch(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function SuppliersPage() {
  const { items: suppliers, loading, add, update, remove } = useSuppliers();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Supplier | null>(null);

  const filtered = useMemo(() => {
    const term = normalizeForSearch(search.trim());
    if (!term) return suppliers;
    return suppliers.filter((s) => {
      const haystack = normalizeForSearch(
        [s.name, s.contactName, s.email, s.phone, s.category].filter(Boolean).join(" "),
      );
      return haystack.includes(term);
    });
  }, [suppliers, search]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(supplier: Supplier) {
    setEditing(supplier);
    setFormOpen(true);
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    try {
      await remove(confirmDelete.id);
      toast({ title: "Proveedor eliminado" });
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
            <Truck className="w-7 h-7 text-primary" /> Proveedores
            <HelpTooltip text="A quién le comprás insumos, telas o servicios. Guardá su contacto y categoría para tenerlo a mano cuando cargues un gasto." />
          </h1>
          <p className="text-muted-foreground mt-1 font-medium">
            Quién te vende qué, organizado.
          </p>
        </div>
        <div className="flex gap-2">
          <ConfigureButton section="categorias" title="Configurar categorías" />
          <Button onClick={openCreate} size="lg" className="rounded-2xl">
            <Plus className="w-4 h-4 mr-2" /> Nuevo proveedor
          </Button>
        </div>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, contacto, categoría…"
          className="pl-9 h-11"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <Truck className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
            <h3 className="text-lg font-bold mb-1">
              {suppliers.length === 0 ? "Todavía no tenés proveedores" : "Sin resultados"}
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              {suppliers.length === 0
                ? "Cargá a quién le comprás insumos, telas o servicios."
                : "Probá con otra búsqueda."}
            </p>
            {suppliers.length === 0 ? (
              <Button onClick={openCreate}>
                <Plus className="w-4 h-4 mr-2" /> Agregar primer proveedor
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((supplier) => (
            <SupplierCard
              key={supplier.id}
              supplier={supplier}
              onEdit={() => openEdit(supplier)}
              onDelete={() => setConfirmDelete(supplier)}
            />
          ))}
        </div>
      )}

      <SupplierFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        supplier={editing}
        onSave={async (data) => {
          if (editing) {
            await update(editing.id, data);
            toast({ title: "Proveedor actualizado" });
          } else {
            await add(data);
            toast({ title: "Proveedor creado" });
          }
        }}
      />

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar proveedor?</AlertDialogTitle>
            <AlertDialogDescription>
              Se va a eliminar a <strong>{confirmDelete?.name}</strong>. Esta acción no se puede deshacer.
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

function SupplierCard({
  supplier,
  onEdit,
  onDelete,
}: {
  supplier: Supplier;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="hover:border-primary/30 transition-colors">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-bold text-base truncate">{supplier.name}</h3>
            {supplier.category ? (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                <Tag className="w-3 h-3 shrink-0" />
                {supplier.category}
              </p>
            ) : null}
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

        <div className="space-y-1.5 text-sm">
          {supplier.contactName ? (
            <p className="flex items-center gap-2 text-muted-foreground">
              <User className="w-3.5 h-3.5 shrink-0" />
              {supplier.contactName}
            </p>
          ) : null}
          {supplier.email ? (
            <a
              href={`mailto:${supplier.email}`}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors min-w-0"
            >
              <Mail className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{supplier.email}</span>
            </a>
          ) : null}
          {supplier.phone ? (
            <a
              href={`tel:${supplier.phone}`}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Phone className="w-3.5 h-3.5 shrink-0" />
              {supplier.phone}
            </a>
          ) : null}
          {supplier.notes ? (
            <p className="flex gap-2 text-muted-foreground text-xs pt-1 border-t border-border mt-2">
              <StickyNote className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span className="line-clamp-3">{supplier.notes}</span>
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function SupplierFormDialog({
  open,
  onOpenChange,
  supplier,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Supplier | null;
  onSave: (data: SupplierInput) => Promise<void>;
}) {
  const isEdit = !!supplier;
  const { categories: appCategories } = useAppCategories();
  const [form, setForm] = useState<SupplierInput>(EMPTY_INPUT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(
      supplier
        ? {
            name: supplier.name ?? "",
            contactName: supplier.contactName ?? "",
            email: supplier.email ?? "",
            phone: supplier.phone ?? "",
            category: supplier.category ?? "",
            notes: supplier.notes ?? "",
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
      setError("El nombre del proveedor es obligatorio.");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        name: form.name.trim(),
        contactName: form.contactName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar proveedor" : "Nuevo proveedor"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Actualizá los datos del proveedor."
              : "Cargá los datos básicos para contactarlo cuando necesites."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sup-name">Nombre del proveedor *</Label>
            <Input
              id="sup-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="DTF Argentina SRL"
              autoFocus
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sup-category">Categoría</Label>
            <Input
              id="sup-category"
              list="supplier-categories"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              placeholder="Insumos DTF, Telas, Plotter…"
            />
            <datalist id="supplier-categories">
              {appCategories.supplier.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sup-contact">Persona de contacto</Label>
            <Input
              id="sup-contact"
              value={form.contactName}
              onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
              placeholder="María García"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="sup-email">Email</Label>
              <Input
                id="sup-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="ventas@proveedor.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sup-phone">Teléfono</Label>
              <Input
                id="sup-phone"
                type="tel"
                inputMode="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+54 9 11 …"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sup-notes">Notas</Label>
            <Textarea
              id="sup-notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Forma de pago, tiempos de entrega, etc."
              rows={3}
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
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isEdit ? (
                "Guardar"
              ) : (
                "Crear"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
