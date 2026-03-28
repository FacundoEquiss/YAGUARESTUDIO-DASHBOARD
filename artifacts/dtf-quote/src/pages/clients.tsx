import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  useClients,
  createClient,
  updateClient,
  deleteClient,
  type ClientItem,
  type CreateClientData,
} from "@/hooks/use-clients";
import {
  Plus,
  Search,
  Users,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  X,
  Mail,
  Phone,
  Building2,
  StickyNote,
} from "lucide-react";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

interface ClientFormProps {
  client?: ClientItem | null;
  onClose: () => void;
  onSaved: () => void;
}

function ClientFormModal({ client, onClose, onSaved }: ClientFormProps) {
  const isEdit = !!client;
  const [name, setName] = useState(client?.name ?? "");
  const [email, setEmail] = useState(client?.email ?? "");
  const [phone, setPhone] = useState(client?.phone ?? "");
  const [businessName, setBusinessName] = useState(client?.businessName ?? "");
  const [notes, setNotes] = useState(client?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    setSaving(true);
    setError("");
    const payload: CreateClientData = {
      name: name.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      businessName: businessName.trim() || undefined,
      notes: notes.trim() || undefined,
    };
    const result = isEdit ? await updateClient(client!.id, payload) : await createClient(payload);
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
          <h2 className="text-lg font-semibold">{isEdit ? "Editar Cliente" : "Nuevo Cliente"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1.5">Nombre *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del cliente" className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@ejemplo.com" className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Teléfono</label>
              <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+54 11 1234-5678" className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Razón Social / Empresa</label>
            <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Empresa S.A." className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Notas</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas adicionales..." rows={3} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">{saving ? "Guardando..." : isEdit ? "Guardar Cambios" : "Crear Cliente"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface ClientDetailProps {
  client: ClientItem;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function ClientDetailModal({ client, onClose, onEdit, onDelete }: ClientDetailProps) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("¿Eliminar este cliente?")) return;
    setDeleting(true);
    await deleteClient(client.id);
    setDeleting(false);
    onDelete();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold">{client.name}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          {client.businessName && (
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <span>{client.businessName}</span>
            </div>
          )}
          {client.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <a href={`mailto:${client.email}`} className="text-primary hover:underline">{client.email}</a>
            </div>
          )}
          {client.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <a href={`tel:${client.phone}`} className="text-primary hover:underline">{client.phone}</a>
            </div>
          )}
          {client.notes && (
            <div className="flex items-start gap-2 text-sm">
              <StickyNote className="w-4 h-4 text-muted-foreground mt-0.5" />
              <p className="text-muted-foreground whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}
          <div className="pt-2 text-xs text-muted-foreground">
            Registrado el {formatDate(client.createdAt)}
          </div>
        </div>
        <div className="flex gap-3 p-5 pt-0">
          <button onClick={onEdit} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors flex items-center justify-center gap-2">
            <Pencil className="w-3.5 h-3.5" /> Editar
          </button>
          <button onClick={handleDelete} disabled={deleting} className="py-2.5 px-4 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-sm font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            <Trash2 className="w-3.5 h-3.5" /> {deleting ? "..." : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ClientsPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editClient, setEditClient] = useState<ClientItem | null>(null);
  const [detailClient, setDetailClient] = useState<ClientItem | null>(null);

  const { clients, total, totalPages, loading, refresh } = useClients({
    search: debouncedSearch,
    page,
    limit: 20,
    sortBy: "createdAt",
    sortDir: "desc",
  });

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
    const timeout = setTimeout(() => setDebouncedSearch(val), 300);
    return () => clearTimeout(timeout);
  };

  const handleSaved = () => {
    refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{total} cliente{total !== 1 ? "s" : ""} registrado{total !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => { setEditClient(null); setShowForm(true); }} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4" /> Nuevo Cliente
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Buscar por nombre, email, teléfono..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {loading && clients.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">{debouncedSearch ? "Sin resultados" : "Sin clientes"}</h3>
          <p className="text-sm text-muted-foreground mb-4">{debouncedSearch ? "Probá con otros términos de búsqueda" : "Agregá tu primer cliente para empezar"}</p>
          {!debouncedSearch && (
            <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4" /> Nuevo Cliente
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-3">
            {clients.map((client) => (
              <div
                key={client.id}
                onClick={() => setDetailClient(client)}
                className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm truncate">{client.name}</h3>
                      {client.businessName && (
                        <span className="text-xs text-muted-foreground truncate">· {client.businessName}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {client.email && (
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{client.email}</span>
                      )}
                      {client.phone && (
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{client.phone}</span>
                      )}
                      <span>{formatDate(client.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditClient(client); setShowForm(true); }}
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">Página {page} de {totalPages}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-30">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-2 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-30">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {showForm && (
        <ClientFormModal
          client={editClient}
          onClose={() => { setShowForm(false); setEditClient(null); }}
          onSaved={handleSaved}
        />
      )}

      {detailClient && !showForm && (
        <ClientDetailModal
          client={detailClient}
          onClose={() => setDetailClient(null)}
          onEdit={() => { setEditClient(detailClient); setShowForm(true); setDetailClient(null); }}
          onDelete={handleSaved}
        />
      )}
    </div>
  );
}
