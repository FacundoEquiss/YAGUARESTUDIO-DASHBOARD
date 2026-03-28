import { useState, useRef } from "react";

import {
  useSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  type SupplierItem,
  type CreateSupplierData,
} from "@/hooks/use-suppliers";
import {
  Plus,
  Search,
  Truck,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  X,
  Mail,
  Phone,
  Tag,
} from "lucide-react";

const CATEGORY_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "telas", label: "Telas" },
  { value: "tintas", label: "Tintas" },
  { value: "film_dtf", label: "Film DTF" },
  { value: "maquinaria", label: "Maquinaria" },
  { value: "insumos", label: "Insumos" },
  { value: "logistica", label: "Logística" },
  { value: "otro", label: "Otro" },
] as const;

function getCategoryLabel(cat: string | null): string {
  if (!cat) return "";
  const opt = CATEGORY_OPTIONS.find((o) => o.value === cat);
  return opt ? opt.label : cat;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

interface SupplierFormProps {
  supplier?: SupplierItem | null;
  onClose: () => void;
  onSaved: () => void;
}

function SupplierFormModal({ supplier, onClose, onSaved }: SupplierFormProps) {
  const isEdit = !!supplier;
  const [name, setName] = useState(supplier?.name ?? "");
  const [email, setEmail] = useState(supplier?.email ?? "");
  const [phone, setPhone] = useState(supplier?.phone ?? "");
  const [businessName, setBusinessName] = useState(supplier?.businessName ?? "");
  const [category, setCategory] = useState(supplier?.category ?? "");
  const [notes, setNotes] = useState(supplier?.notes ?? "");
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
    const payload: CreateSupplierData = {
      name: name.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      businessName: businessName.trim() || undefined,
      category: category || undefined,
      notes: notes.trim() || undefined,
    };
    const result = isEdit ? await updateSupplier(supplier!.id, payload) : await createSupplier(payload);
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
          <h2 className="text-lg font-semibold">{isEdit ? "Editar Proveedor" : "Nuevo Proveedor"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1.5">Nombre *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del proveedor" className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
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
            <label className="block text-sm font-medium mb-1.5">Categoría</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
              <option value="">Sin categoría</option>
              {CATEGORY_OPTIONS.filter((o) => o.value).map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Notas</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas adicionales..." rows={3} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">{saving ? "Guardando..." : isEdit ? "Guardar Cambios" : "Crear Proveedor"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface SupplierDetailProps {
  supplier: SupplierItem;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function SupplierDetailModal({ supplier, onClose, onEdit, onDelete }: SupplierDetailProps) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("¿Eliminar este proveedor?")) return;
    setDeleting(true);
    await deleteSupplier(supplier.id);
    setDeleting(false);
    onDelete();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold">{supplier.name}</h2>
            {supplier.businessName && <p className="text-sm text-muted-foreground">{supplier.businessName}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          {supplier.category && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-violet-500/15 text-violet-400 border border-violet-500/20">
                <Tag className="w-3 h-3" /> {getCategoryLabel(supplier.category)}
              </span>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Contacto</p>
            {supplier.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <a href={`mailto:${supplier.email}`} className="text-primary hover:underline">{supplier.email}</a>
              </div>
            )}
            {supplier.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <a href={`tel:${supplier.phone}`} className="text-primary hover:underline">{supplier.phone}</a>
              </div>
            )}
            {!supplier.email && !supplier.phone && (
              <p className="text-sm text-muted-foreground">Sin datos de contacto</p>
            )}
          </div>

          {supplier.notes && (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Notas</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{supplier.notes}</p>
            </div>
          )}
          <div className="pt-2 text-xs text-muted-foreground">
            Registrado el {formatDate(supplier.createdAt)}
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

export function SuppliersPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editSupplier, setEditSupplier] = useState<SupplierItem | null>(null);
  const [detailSupplier, setDetailSupplier] = useState<SupplierItem | null>(null);

  const { suppliers, total, totalPages, loading, refresh } = useSuppliers({
    search: debouncedSearch,
    category: categoryFilter || undefined,
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
          <h1 className="text-2xl font-bold tracking-tight">Proveedores</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{total} proveedor{total !== 1 ? "es" : ""} registrado{total !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => { setEditSupplier(null); setShowForm(true); }} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4" /> Nuevo Proveedor
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar por nombre, email, teléfono..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          {CATEGORY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {loading && suppliers.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : suppliers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Truck className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">{debouncedSearch || categoryFilter ? "Sin resultados" : "Sin proveedores"}</h3>
          <p className="text-sm text-muted-foreground mb-4">{debouncedSearch || categoryFilter ? "Probá con otros filtros" : "Agregá tu primer proveedor para empezar"}</p>
          {!debouncedSearch && !categoryFilter && (
            <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4" /> Nuevo Proveedor
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
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Categoría</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Registrado</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((supplier) => (
                    <tr
                      key={supplier.id}
                      onClick={() => setDetailSupplier(supplier)}
                      className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer group"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium truncate max-w-[200px]">{supplier.name}</p>
                        {supplier.businessName && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{supplier.businessName}</p>}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <div className="space-y-0.5">
                          {supplier.email && <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{supplier.email}</p>}
                          {supplier.phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{supplier.phone}</p>}
                          {!supplier.email && !supplier.phone && <span className="text-xs text-muted-foreground/50">—</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {supplier.category ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-500/15 text-violet-400 border border-violet-500/20">
                            {getCategoryLabel(supplier.category)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground hidden md:table-cell">
                        {formatDate(supplier.createdAt)}
                      </td>
                      <td className="px-2 py-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditSupplier(supplier); setShowForm(true); }}
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
        <SupplierFormModal
          supplier={editSupplier}
          onClose={() => { setShowForm(false); setEditSupplier(null); }}
          onSaved={handleSaved}
        />
      )}

      {detailSupplier && !showForm && (
        <SupplierDetailModal
          supplier={detailSupplier}
          onClose={() => setDetailSupplier(null)}
          onEdit={() => { setEditSupplier(detailSupplier); setShowForm(true); setDetailSupplier(null); }}
          onDelete={handleSaved}
        />
      )}
    </div>
  );
}
