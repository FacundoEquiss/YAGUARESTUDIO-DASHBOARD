import { useState, useEffect, useRef } from "react";
import { cn, formatCurrency } from "@/lib/utils";
import {
  useClients,
  createClient,
  updateClient,
  deleteClient,
  fetchClientDetail,
  type ClientItem,
  type ClientDetail,
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
  ShoppingBag,
  DollarSign,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  nuevo: "bg-blue-500/15 text-blue-400",
  en_proceso: "bg-orange-500/15 text-orange-400",
  listo: "bg-yellow-500/15 text-yellow-400",
  entregado: "bg-emerald-500/15 text-emerald-400",
  cancelado: "bg-red-500/15 text-red-400",
};

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
  clientId: number;
  onClose: () => void;
  onEdit: (client: ClientItem) => void;
  onDelete: () => void;
}

function ClientDetailModal({ clientId, onClose, onEdit, onDelete }: ClientDetailProps) {
  const [detail, setDetail] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchClientDetail(clientId).then((d) => {
      setDetail(d);
      setLoading(false);
    });
  }, [clientId]);

  const handleDelete = async () => {
    if (!confirm("¿Eliminar este cliente?")) return;
    setDeleting(true);
    await deleteClient(clientId);
    setDeleting(false);
    onDelete();
    onClose();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl p-10 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!detail) {
    onClose();
    return null;
  }

  const { client, orders, stats } = detail;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold">{client.name}</h2>
            {client.businessName && <p className="text-sm text-muted-foreground">{client.businessName}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500/15 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-xl font-bold">{stats.orderCount}</p>
                <p className="text-xs text-muted-foreground">Pedidos</p>
              </div>
            </div>
            <div className="bg-muted/50 rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-xl font-bold">{formatCurrency(Number(stats.totalRevenue))}</p>
                <p className="text-xs text-muted-foreground">Facturado</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Contacto</p>
            <div className="space-y-2">
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
              {!client.email && !client.phone && (
                <p className="text-sm text-muted-foreground">Sin datos de contacto</p>
              )}
            </div>
          </div>

          {client.notes && (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Notas</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Pedidos recientes</p>
            {orders.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin pedidos vinculados</p>
            ) : (
              <div className="space-y-2">
                {orders.map((o) => (
                  <div key={o.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{o.description || `Pedido #${o.id}`}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(o.createdAt)} · {o.quantity} un.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", STATUS_COLORS[o.status] || "bg-gray-500/15 text-gray-400")}>
                        {o.status.replace("_", " ")}
                      </span>
                      <span className="font-semibold text-xs">{formatCurrency(Number(o.totalPrice))}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            Registrado el {formatDate(client.createdAt)}
          </div>
        </div>

        <div className="flex gap-3 p-5 pt-0">
          <button onClick={() => onEdit(client)} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors flex items-center justify-center gap-2">
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
  const [detailClientId, setDetailClientId] = useState<number | null>(null);

  const { clients, total, totalPages, loading, refresh } = useClients({
    search: debouncedSearch,
    page,
    limit: 20,
    sortBy: "createdAt",
    sortDir: "desc",
  });

  const searchTimer = useRef<ReturnType<typeof setTimeout>>();
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(val), 300);
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
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nombre</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Contacto</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">Pedidos</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Facturado</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Registrado</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr
                      key={client.id}
                      onClick={() => setDetailClientId(client.id)}
                      className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer group"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium truncate max-w-[200px]">{client.name}</p>
                        {client.businessName && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{client.businessName}</p>}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <div className="space-y-0.5">
                          {client.email && <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{client.email}</p>}
                          {client.phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{client.phone}</p>}
                          {!client.email && !client.phone && <span className="text-xs text-muted-foreground/50">—</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", client.orderCount > 0 ? "bg-blue-500/15 text-blue-400" : "text-muted-foreground/50")}>
                          {client.orderCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {Number(client.totalRevenue) > 0 ? formatCurrency(Number(client.totalRevenue)) : <span className="text-muted-foreground/50">$0</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground hidden md:table-cell">
                        {formatDate(client.createdAt)}
                      </td>
                      <td className="px-2 py-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditClient(client); setShowForm(true); }}
                          className="p-1.5 rounded-lg hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

      {detailClientId != null && !showForm && (
        <ClientDetailModal
          clientId={detailClientId}
          onClose={() => setDetailClientId(null)}
          onEdit={(client) => { setEditClient(client); setShowForm(true); setDetailClientId(null); }}
          onDelete={handleSaved}
        />
      )}
    </div>
  );
}
