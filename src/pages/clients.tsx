import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Users, Pencil, Trash2, Mail, Phone, Building2, StickyNote, Loader2 } from "lucide-react";
import { useClients, type Client, type ClientInput } from "@/hooks/use-clients";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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

const EMPTY_INPUT: ClientInput = {
  name: "",
  email: "",
  phone: "",
  businessName: "",
  notes: "",
};

function normalizeForSearch(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function ClientsPage() {
  const { items: clients, loading, add, update, remove } = useClients();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Client | null>(null);

  const filtered = useMemo(() => {
    const term = normalizeForSearch(search.trim());
    if (!term) return clients;
    return clients.filter((c) => {
      const haystack = normalizeForSearch(
        [c.name, c.email, c.phone, c.businessName].filter(Boolean).join(" "),
      );
      return haystack.includes(term);
    });
  }, [clients, search]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(client: Client) {
    setEditing(client);
    setFormOpen(true);
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    try {
      await remove(confirmDelete.id);
      toast({ title: "Cliente eliminado" });
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar.", variant: "destructive" });
    } finally {
      setConfirmDelete(null);
    }
  }

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-6 flex flex-col gap-6 pb-12 max-w-5xl">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl text-foreground font-display font-bold flex items-center gap-2">
            <Users className="w-7 h-7 text-primary" /> Clientes
          </h1>
          <p className="text-muted-foreground mt-1 font-medium">
            Tu base de clientes, siempre a mano.
          </p>
        </div>
        <Button onClick={openCreate} size="lg" className="rounded-2xl">
          <Plus className="w-4 h-4 mr-2" /> Nuevo cliente
        </Button>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, email, teléfono o negocio…"
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
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
            <h3 className="text-lg font-bold mb-1">
              {clients.length === 0 ? "Todavía no tenés clientes" : "Sin resultados"}
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              {clients.length === 0
                ? "Agregá tu primer cliente para empezar a organizarte."
                : "Probá con otra búsqueda."}
            </p>
            {clients.length === 0 ? (
              <Button onClick={openCreate}>
                <Plus className="w-4 h-4 mr-2" /> Agregar primer cliente
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              onEdit={() => openEdit(client)}
              onDelete={() => setConfirmDelete(client)}
            />
          ))}
        </div>
      )}

      <ClientFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        client={editing}
        onSave={async (data) => {
          if (editing) {
            await update(editing.id, data);
            toast({ title: "Cliente actualizado" });
          } else {
            await add(data);
            toast({ title: "Cliente creado" });
          }
        }}
      />

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
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

function ClientCard({
  client,
  onEdit,
  onDelete,
}: {
  client: Client;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="hover:border-primary/30 transition-colors">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-bold text-base truncate">{client.name}</h3>
            {client.businessName ? (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                <Building2 className="w-3 h-3 shrink-0" />
                {client.businessName}
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
          {client.email ? (
            <a
              href={`mailto:${client.email}`}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors min-w-0"
            >
              <Mail className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{client.email}</span>
            </a>
          ) : null}
          {client.phone ? (
            <a
              href={`tel:${client.phone}`}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Phone className="w-3.5 h-3.5 shrink-0" />
              {client.phone}
            </a>
          ) : null}
          {client.notes ? (
            <p className="flex gap-2 text-muted-foreground text-xs pt-1 border-t border-border mt-2">
              <StickyNote className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span className="line-clamp-3">{client.notes}</span>
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function ClientFormDialog({
  open,
  onOpenChange,
  client,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  onSave: (data: ClientInput) => Promise<void>;
}) {
  const isEdit = !!client;
  const [form, setForm] = useState<ClientInput>(EMPTY_INPUT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form whenever the dialog opens with a new context.
  useEffect(() => {
    if (!open) return;
    setForm(
      client
        ? {
            name: client.name ?? "",
            email: client.email ?? "",
            phone: client.phone ?? "",
            businessName: client.businessName ?? "",
            notes: client.notes ?? "",
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
        email: form.email.trim(),
        phone: form.phone.trim(),
        businessName: form.businessName.trim(),
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
          <DialogTitle>{isEdit ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Actualizá los datos del cliente." : "Completá los datos para agregarlo."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client-name">Nombre *</Label>
            <Input
              id="client-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Juan Pérez"
              autoFocus
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="client-email">Email</Label>
              <Input
                id="client-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="juan@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-phone">Teléfono</Label>
              <Input
                id="client-phone"
                type="tel"
                inputMode="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+54 9 11 …"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="client-business">Negocio (opcional)</Label>
            <Input
              id="client-business"
              value={form.businessName}
              onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
              placeholder="Eventos JP"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="client-notes">Notas</Label>
            <Textarea
              id="client-notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Cliente recurrente, prefiere remeras negras, etc."
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
