import { useMemo, useState } from "react";
import {
  Plus,
  Search,
  Package2,
  Pencil,
  Trash2,
  Loader2,
  AlertTriangle,
  Minus,
  Plus as PlusIcon,
} from "lucide-react";
import {
  useProducts,
  type Product,
  type ProductInput,
  PRODUCT_CATEGORIES,
} from "@/hooks/use-products";
import { useSuppliers } from "@/hooks/use-suppliers";
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

const EMPTY_INPUT: ProductInput = {
  name: "",
  category: "",
  sku: "",
  size: "",
  color: "",
  stock: 0,
  minStock: 0,
  unitCost: 0,
  unitPrice: 0,
  supplierId: "",
  supplierName: "",
  notes: "",
};

function normalizeForSearch(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function ProductsPage() {
  const { items: products, loading, add, update, remove } = useProducts();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showLowStock, setShowLowStock] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter(Boolean));
    return Array.from(set).sort();
  }, [products]);

  const filtered = useMemo(() => {
    const term = normalizeForSearch(search.trim());
    return products.filter((p) => {
      if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
      if (showLowStock && !(p.minStock > 0 && p.stock <= p.minStock)) return false;
      if (!term) return true;
      const hay = normalizeForSearch(
        [p.name, p.sku, p.category, p.size, p.color, p.supplierName].filter(Boolean).join(" "),
      );
      return hay.includes(term);
    });
  }, [products, search, categoryFilter, showLowStock]);

  const stats = useMemo(() => {
    const totalUnits = products.reduce((sum, p) => sum + (p.stock || 0), 0);
    const totalValue = products.reduce((sum, p) => sum + (p.stock || 0) * (p.unitCost || 0), 0);
    const lowStock = products.filter((p) => p.minStock > 0 && p.stock <= p.minStock).length;
    return { count: products.length, totalUnits, totalValue, lowStock };
  }, [products]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setFormOpen(true);
  }

  async function adjustStock(product: Product, delta: number) {
    const next = Math.max(0, (product.stock || 0) + delta);
    try {
      await update(product.id, { stock: next });
    } catch {
      toast({ title: "Error", description: "No se pudo actualizar el stock.", variant: "destructive" });
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    try {
      await remove(confirmDelete.id);
      toast({ title: "Producto eliminado" });
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
            <Package2 className="w-7 h-7 text-primary" /> Productos / Stock
          </h1>
          <p className="text-muted-foreground mt-1 font-medium">
            Controlá tu inventario, precios y alertas de stock bajo.
          </p>
        </div>
        <Button onClick={openCreate} size="lg" className="rounded-2xl">
          <Plus className="w-4 h-4 mr-2" /> Nuevo producto
        </Button>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Productos" value={stats.count.toString()} />
        <StatCard label="Unidades" value={stats.totalUnits.toString()} />
        <StatCard label="Valor en stock" value={formatCurrency(stats.totalValue)} />
        <StatCard
          label="Stock bajo"
          value={stats.lowStock.toString()}
          highlight={stats.lowStock > 0}
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, SKU, talle, color…"
            className="pl-9 h-11"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {categories.length > 0 ? (
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-48 h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <Button
          variant={showLowStock ? "default" : "outline"}
          onClick={() => setShowLowStock((v) => !v)}
          className="h-11"
        >
          <AlertTriangle className="w-4 h-4 mr-2" /> Stock bajo
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <Package2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
            <h3 className="text-lg font-bold mb-1">
              {products.length === 0 ? "Sin productos todavía" : "Sin resultados"}
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              {products.length === 0
                ? "Cargá tus prendas, insumos y todo lo que tengas en stock."
                : "Ajustá los filtros o la búsqueda."}
            </p>
            {products.length === 0 ? (
              <Button onClick={openCreate}>
                <Plus className="w-4 h-4 mr-2" /> Primer producto
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={() => openEdit(product)}
              onDelete={() => setConfirmDelete(product)}
              onAdjustStock={(delta) => adjustStock(product, delta)}
            />
          ))}
        </div>
      )}

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editing}
        onSave={async (data) => {
          if (editing) {
            await update(editing.id, data);
            toast({ title: "Producto actualizado" });
          } else {
            await add(data);
            toast({ title: "Producto creado" });
          }
        }}
      />

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
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

function ProductCard({
  product,
  onEdit,
  onDelete,
  onAdjustStock,
}: {
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
  onAdjustStock: (delta: number) => void;
}) {
  const lowStock = product.minStock > 0 && product.stock <= product.minStock;
  const variant = [product.size, product.color].filter(Boolean).join(" · ");

  return (
    <Card className={`hover:border-primary/30 transition-colors ${lowStock ? "border-orange-500/40" : ""}`}>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-base leading-tight">{product.name}</h3>
            <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground mt-1">
              {product.category ? <span>{product.category}</span> : null}
              {variant ? (
                <>
                  <span>·</span>
                  <span>{variant}</span>
                </>
              ) : null}
              {product.sku ? (
                <>
                  <span>·</span>
                  <span className="font-mono">{product.sku}</span>
                </>
              ) : null}
            </div>
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

        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <button
            onClick={() => onAdjustStock(-1)}
            className="w-8 h-8 rounded-lg bg-secondary hover:bg-secondary/70 text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center"
            aria-label="Restar 1"
          >
            <Minus className="w-4 h-4" />
          </button>
          <div className="flex-1 text-center">
            <div className={`text-2xl font-display font-black ${lowStock ? "text-orange-400" : "text-foreground"}`}>
              {product.stock}
            </div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {lowStock ? `Bajo (min ${product.minStock})` : "Unidades"}
            </div>
          </div>
          <button
            onClick={() => onAdjustStock(1)}
            className="w-8 h-8 rounded-lg bg-secondary hover:bg-secondary/70 text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center"
            aria-label="Sumar 1"
          >
            <PlusIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border text-xs">
          <div>
            <div className="text-muted-foreground">Costo</div>
            <div className="font-semibold">{formatCurrency(product.unitCost)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Venta</div>
            <div className="font-semibold text-emerald-400">{formatCurrency(product.unitPrice)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProductFormDialog({
  open,
  onOpenChange,
  product,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onSave: (data: ProductInput) => Promise<void>;
}) {
  const isEdit = !!product;
  const { items: suppliers } = useSuppliers();
  const [form, setForm] = useState<ProductInput>(EMPTY_INPUT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    if (next) {
      setForm(
        product
          ? {
              name: product.name ?? "",
              category: product.category ?? "",
              sku: product.sku ?? "",
              size: product.size ?? "",
              color: product.color ?? "",
              stock: product.stock ?? 0,
              minStock: product.minStock ?? 0,
              unitCost: product.unitCost ?? 0,
              unitPrice: product.unitPrice ?? 0,
              supplierId: product.supplierId ?? "",
              supplierName: product.supplierName ?? "",
              notes: product.notes ?? "",
            }
          : EMPTY_INPUT,
      );
      setError(null);
    }
    onOpenChange(next);
  }

  function selectSupplier(supplierId: string) {
    if (supplierId === "__none__") {
      setForm((f) => ({ ...f, supplierId: "", supplierName: "" }));
      return;
    }
    const supplier = suppliers.find((s) => s.id === supplierId);
    if (supplier) {
      setForm((f) => ({ ...f, supplierId: supplier.id, supplierName: supplier.name }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.name.trim().length < 2) {
      setError("El nombre del producto es obligatorio.");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        ...form,
        name: form.name.trim(),
        sku: form.sku.trim(),
        size: form.size.trim(),
        color: form.color.trim(),
        category: form.category.trim(),
        notes: form.notes.trim(),
        stock: Math.max(0, Number(form.stock) || 0),
        minStock: Math.max(0, Number(form.minStock) || 0),
        unitCost: Math.max(0, Number(form.unitCost) || 0),
        unitPrice: Math.max(0, Number(form.unitPrice) || 0),
      });
      onOpenChange(false);
    } catch {
      setError("No se pudo guardar. Probá de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar producto" : "Nuevo producto"}</DialogTitle>
          <DialogDescription>Cargá los datos del producto y su stock actual.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prod-name">Nombre *</Label>
            <Input
              id="prod-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Remera algodón premium"
              autoFocus
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="prod-category">Categoría</Label>
              <Input
                id="prod-category"
                list="product-categories"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="Remeras"
              />
              <datalist id="product-categories">
                {PRODUCT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label htmlFor="prod-sku">SKU / Código</Label>
              <Input
                id="prod-sku"
                value={form.sku}
                onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                placeholder="REM-001"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="prod-size">Talle</Label>
              <Input
                id="prod-size"
                value={form.size}
                onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))}
                placeholder="M"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prod-color">Color</Label>
              <Input
                id="prod-color"
                value={form.color}
                onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                placeholder="Blanco"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="prod-stock">Stock actual</Label>
              <Input
                id="prod-stock"
                type="number"
                min="0"
                value={form.stock || ""}
                onChange={(e) => setForm((f) => ({ ...f, stock: parseInt(e.target.value) || 0 }))}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prod-min-stock">Stock mínimo (alerta)</Label>
              <Input
                id="prod-min-stock"
                type="number"
                min="0"
                value={form.minStock || ""}
                onChange={(e) => setForm((f) => ({ ...f, minStock: parseInt(e.target.value) || 0 }))}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="prod-cost">Costo unitario</Label>
              <Input
                id="prod-cost"
                type="number"
                min="0"
                step="0.01"
                value={form.unitCost || ""}
                onChange={(e) => setForm((f) => ({ ...f, unitCost: parseFloat(e.target.value) || 0 }))}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prod-price">Precio de venta</Label>
              <Input
                id="prod-price"
                type="number"
                min="0"
                step="0.01"
                value={form.unitPrice || ""}
                onChange={(e) => setForm((f) => ({ ...f, unitPrice: parseFloat(e.target.value) || 0 }))}
                placeholder="0"
              />
            </div>
          </div>

          {suppliers.length > 0 ? (
            <div className="space-y-2">
              <Label htmlFor="prod-supplier">Proveedor (opcional)</Label>
              <Select value={form.supplierId || "__none__"} onValueChange={selectSupplier}>
                <SelectTrigger id="prod-supplier">
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
            <Label htmlFor="prod-notes">Notas</Label>
            <Textarea
              id="prod-notes"
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
