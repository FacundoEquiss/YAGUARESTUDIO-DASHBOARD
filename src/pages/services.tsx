import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Wrench, Pencil, Trash2, Loader2, Tag } from "lucide-react";
import {
  useServices,
  type Service,
  type ServiceInput,
  type PriceUnit,
  PRICE_UNIT_LABELS,
  SERVICE_CATEGORIES,
} from "@/hooks/use-services";
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

const PRICE_UNITS: PriceUnit[] = ["fixed", "hour", "unit", "month", "session"];

const EMPTY_INPUT: ServiceInput = {
  name: "",
  category: "",
  description: "",
  price: 0,
  priceUnit: "fixed",
  active: true,
};

function normalizeForSearch(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function ServicesPage() {
  const { items: services, loading, add, update, remove } = useServices();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Service | null>(null);

  const filtered = useMemo(() => {
    const term = normalizeForSearch(search.trim());
    if (!term) return services;
    return services.filter((s) =>
      normalizeForSearch([s.name, s.category, s.description].filter(Boolean).join(" ")).includes(term),
    );
  }, [services, search]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(service: Service) {
    setEditing(service);
    setFormOpen(true);
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    try {
      await remove(confirmDelete.id);
      toast({ title: "Servicio eliminado" });
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar.", variant: "destructive" });
    } finally {
      setConfirmDelete(null);
    }
  }

  async function toggleActive(service: Service) {
    try {
      await update(service.id, { active: !service.active });
    } catch {
      toast({ title: "Error", description: "No se pudo actualizar.", variant: "destructive" });
    }
  }

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-6 flex flex-col gap-6 pb-12 max-w-5xl">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl text-foreground font-display font-bold flex items-center gap-2">
            <Wrench className="w-7 h-7 text-primary" /> Servicios
          </h1>
          <p className="text-muted-foreground mt-1 font-medium">
            Lo que ofrecés además de productos: personalización, diseño, cursos…
          </p>
        </div>
        <Button onClick={openCreate} size="lg" className="rounded-2xl">
          <Plus className="w-4 h-4 mr-2" /> Nuevo servicio
        </Button>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar servicio…"
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
            <Wrench className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
            <h3 className="text-lg font-bold mb-1">
              {services.length === 0 ? "Sin servicios todavía" : "Sin resultados"}
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              {services.length === 0
                ? "Cargá los servicios que ofrecés para tenerlos a mano al cotizar."
                : "Probá con otra búsqueda."}
            </p>
            {services.length === 0 ? (
              <Button onClick={openCreate}>
                <Plus className="w-4 h-4 mr-2" /> Primer servicio
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((service) => (
            <Card
              key={service.id}
              className={`hover:border-primary/30 transition-colors ${!service.active ? "opacity-60" : ""}`}
            >
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-bold text-base leading-tight">{service.name}</h3>
                    {service.category ? (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Tag className="w-3 h-3" /> {service.category}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(service)}
                      className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Editar"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(service)}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      aria-label="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {service.description ? (
                  <p className="text-sm text-muted-foreground line-clamp-3">{service.description}</p>
                ) : null}

                <div className="flex items-end justify-between pt-2 border-t border-border">
                  <div>
                    <div className="text-lg font-display font-bold text-foreground">
                      {formatCurrency(service.price)}
                    </div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {PRICE_UNIT_LABELS[service.priceUnit]}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleActive(service)}
                    className={`text-[11px] px-2 py-1 rounded-md font-semibold border ${
                      service.active
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                        : "bg-secondary text-muted-foreground border-border"
                    }`}
                  >
                    {service.active ? "Activo" : "Pausado"}
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ServiceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        service={editing}
        onSave={async (data) => {
          if (editing) {
            await update(editing.id, data);
            toast({ title: "Servicio actualizado" });
          } else {
            await add(data);
            toast({ title: "Servicio creado" });
          }
        }}
      />

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar servicio?</AlertDialogTitle>
            <AlertDialogDescription>
              Se va a eliminar <strong>{confirmDelete?.name}</strong>. Esta acción no se puede deshacer.
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

function ServiceFormDialog({
  open,
  onOpenChange,
  service,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: Service | null;
  onSave: (data: ServiceInput) => Promise<void>;
}) {
  const isEdit = !!service;
  const [form, setForm] = useState<ServiceInput>(EMPTY_INPUT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(
      service
        ? {
            name: service.name ?? "",
            category: service.category ?? "",
            description: service.description ?? "",
            price: service.price ?? 0,
            priceUnit: service.priceUnit ?? "fixed",
            active: service.active ?? true,
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
      setError("El nombre del servicio es obligatorio.");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        ...form,
        name: form.name.trim(),
        category: form.category.trim(),
        description: form.description.trim(),
        price: Math.max(0, Number(form.price) || 0),
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
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar servicio" : "Nuevo servicio"}</DialogTitle>
          <DialogDescription>Cargá un servicio que ofrecés a tus clientes.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="svc-name">Nombre *</Label>
            <Input
              id="svc-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Diseño de logo, Estampado por prenda…"
              autoFocus
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="svc-category">Categoría</Label>
            <Input
              id="svc-category"
              list="service-categories"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              placeholder="Diseño gráfico, Personalización…"
            />
            <datalist id="service-categories">
              {SERVICE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="svc-price">Precio</Label>
              <Input
                id="svc-price"
                type="number"
                min="0"
                step="0.01"
                value={form.price || ""}
                onChange={(e) => setForm((f) => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="svc-unit">Modalidad</Label>
              <Select
                value={form.priceUnit}
                onValueChange={(v) => setForm((f) => ({ ...f, priceUnit: v as PriceUnit }))}
              >
                <SelectTrigger id="svc-unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRICE_UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {PRICE_UNIT_LABELS[u]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="svc-desc">Descripción</Label>
            <Textarea
              id="svc-desc"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Qué incluye, condiciones, tiempos de entrega…"
              rows={3}
            />
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              className="rounded border-border"
            />
            Servicio activo (lo seguís ofreciendo)
          </label>

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
