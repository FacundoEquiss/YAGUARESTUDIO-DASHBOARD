import { useEffect, useMemo, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import {
  useProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  fetchProductDetail,
  createProductStockMovement,
  type ProductDetailResult,
  type ProductItem,
  type ProductPriceTier,
  type CreateProductData,
  type CreateStockMovementData,
} from "@/hooks/use-products";
import { createSupplier, useAllSuppliers } from "@/hooks/use-suppliers";
import { useAllOrders } from "@/hooks/use-orders";
import { HelpTooltip } from "@/components/help-tooltip";
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Boxes,
  Eye,
  Package2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

const MOVEMENT_LABELS: Record<CreateStockMovementData["movementType"], string> = {
  purchase: "Compra / ingreso",
  sale: "Venta / salida",
  adjustment_in: "Ajuste positivo",
  adjustment_out: "Ajuste negativo",
};

const MOVEMENT_BADGE_CLASSES: Record<CreateStockMovementData["movementType"], string> = {
  purchase: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  sale: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  adjustment_in: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  adjustment_out: "bg-red-500/10 text-red-400 border-red-500/20",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Sin fecha";
  return new Date(dateStr).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function createDefaultPriceTiers(salePrice = 0): ProductPriceTier[] {
  const safePrice = Math.max(0, salePrice || 0);
  const wholesalePrice = safePrice > 0 ? Math.max(0, safePrice * 0.8) : 0;
  return [
    {
      id: "minorista",
      label: "Precio minorista",
      type: "retail",
      price: safePrice,
      isDefault: true,
      minQty: 1,
      maxQty: null,
      isActive: true,
    },
    {
      id: "mayorista",
      label: "Precio mayorista",
      type: "wholesale",
      price: wholesalePrice,
      isDefault: false,
      minQty: 1,
      maxQty: null,
      isActive: true,
    },
  ];
}

interface ProductFormProps {
  product?: ProductItem | null;
  onClose: () => void;
  onSaved: () => void;
}

function ProductFormModal({ product, onClose, onSaved }: ProductFormProps) {
  const isEdit = !!product;
  const { suppliers, refresh: refreshSuppliers } = useAllSuppliers();
  const [name, setName] = useState(product?.name ?? "");
  const [supplierId, setSupplierId] = useState<number | null>(product?.supplierId ?? null);
  const [sku, setSku] = useState(product?.sku ?? "");
  const [category, setCategory] = useState(product?.category ?? "");
  const [unit, setUnit] = useState(product?.unit ?? "unidad");
  const [salePrice, setSalePrice] = useState(Number(product?.salePrice || 0));
  const [priceTiers, setPriceTiers] = useState<ProductPriceTier[]>(
    product?.priceTiers?.length
      ? product.priceTiers
      : createDefaultPriceTiers(Number(product?.salePrice || 0)),
  );
  const [allowManualPrice, setAllowManualPrice] = useState(product?.allowManualPrice ?? true);
  const [costPrice, setCostPrice] = useState(Number(product?.costPrice || 0));
  const [currentStock, setCurrentStock] = useState(Number(product?.currentStock || 0));
  const [minStock, setMinStock] = useState(Number(product?.minStock || 0));
  const [notes, setNotes] = useState(product?.notes ?? "");
  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const [showCreateSupplier, setShowCreateSupplier] = useState(false);
  const [supplierName, setSupplierName] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [supplierBusinessName, setSupplierBusinessName] = useState("");
  const [supplierCategory, setSupplierCategory] = useState("");
  const [supplierNotes, setSupplierNotes] = useState("");
  const [supplierError, setSupplierError] = useState("");
  const [creatingSupplier, setCreatingSupplier] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const updatePriceTier = (index: number, key: keyof ProductPriceTier, value: string | number | boolean | null) => {
    setPriceTiers((prev) =>
      prev.map((tier, tierIndex) => {
        if (tierIndex !== index) {
          return tier;
        }

        if (key === "isDefault" && value === true) {
          return { ...tier, isDefault: true };
        }

        return {
          ...tier,
          [key]: value,
        } as ProductPriceTier;
      }).map((tier, tierIndex) => {
        if (key === "isDefault" && value === true) {
          return {
            ...tier,
            isDefault: tierIndex === index,
          };
        }

        return tier;
      }),
    );
  };

  const addPriceTier = () => {
    setPriceTiers((prev) => [
      ...prev,
      {
        id: `tier_${Date.now()}_${prev.length + 1}`,
        label: `Precio ${prev.length + 1}`,
        type: `custom_${prev.length + 1}`,
        price: 0,
        isDefault: prev.length === 0,
        minQty: 1,
        maxQty: null,
        isActive: true,
      },
    ]);
  };

  const removePriceTier = (index: number) => {
    setPriceTiers((prev) => {
      const next = prev.filter((_, tierIndex) => tierIndex !== index);
      if (next.length === 0) {
        return [];
      }

      if (!next.some((tier) => tier.isDefault)) {
        next[0] = { ...next[0], isDefault: true };
      }

      return next;
    });
  };

  const handleCreateSupplier = async () => {
    if (!supplierName.trim()) {
      setSupplierError("El nombre del proveedor es obligatorio");
      return;
    }

    setCreatingSupplier(true);
    setSupplierError("");

    const result = await createSupplier({
      name: supplierName.trim(),
      email: supplierEmail.trim() || undefined,
      phone: supplierPhone.trim() || undefined,
      businessName: supplierBusinessName.trim() || undefined,
      category: supplierCategory.trim() || undefined,
      notes: supplierNotes.trim() || undefined,
    });

    if (result.error || !result.supplier) {
      setCreatingSupplier(false);
      setSupplierError(result.error || "No se pudo crear el proveedor");
      return;
    }

    await refreshSuppliers();
    setSupplierId(result.supplier.id);
    setShowCreateSupplier(false);
    setSupplierName("");
    setSupplierEmail("");
    setSupplierPhone("");
    setSupplierBusinessName("");
    setSupplierCategory("");
    setSupplierNotes("");
    setSupplierError("");
    setCreatingSupplier(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("El nombre del producto es obligatorio");
      return;
    }

    setSaving(true);
    setError("");

    const payload: CreateProductData = {
      name: name.trim(),
      supplierId: supplierId || undefined,
      sku: sku.trim() || undefined,
      category: category.trim() || undefined,
      unit: unit.trim() || "unidad",
      salePrice,
      priceTiers: priceTiers
        .filter((tier) => tier.label?.trim())
        .map((tier, index) => ({
          id: tier.id || `tier_${index + 1}`,
          label: tier.label.trim(),
          type: (tier.type || tier.label || `tier_${index + 1}`).toString().trim().toLowerCase().replace(/\s+/g, "_"),
          price: Math.max(0, Number(tier.price) || 0),
          isDefault: Boolean(tier.isDefault),
          minQty: Math.max(1, Number(tier.minQty) || 1),
          maxQty: tier.maxQty == null ? null : Math.max(1, Number(tier.maxQty) || 1),
          isActive: tier.isActive ?? true,
        })),
      allowManualPrice,
      costPrice,
      currentStock,
      minStock,
      notes: notes.trim() || undefined,
      isActive,
    };

    const result = isEdit
      ? await updateProduct(product!.id, payload)
      : await createProduct(payload);

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
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold">{isEdit ? "Editar producto" : "Nuevo producto"}</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors" aria-label="Cerrar">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Nombre *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Remera Oversize Negra" className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Proveedor</label>
              <select value={supplierId ?? ""} onChange={(e) => setSupplierId(e.target.value ? Number(e.target.value) : null)} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="">Sin proveedor</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                ))}
              </select>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-[11px] text-muted-foreground">
                  {suppliers.length === 0 ? "Todavia no hay proveedores creados" : "Podés crear un proveedor nuevo sin salir de este formulario"}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSupplierError("");
                    setShowCreateSupplier((value) => !value);
                  }}
                  className="text-xs font-medium text-primary hover:text-primary/80"
                >
                  {showCreateSupplier ? "Cancelar" : "Crear proveedor"}
                </button>
              </div>

              {showCreateSupplier && (
                <div className="mt-3 rounded-xl border border-border bg-muted/20 p-3 space-y-3">
                  {supplierError && (
                    <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">{supplierError}</div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1">Nombre *</label>
                      <input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="Ej: Go Textil" className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Categoria</label>
                      <input value={supplierCategory} onChange={(e) => setSupplierCategory(e.target.value)} placeholder="Ej: Textil" className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1">Email</label>
                      <input value={supplierEmail} onChange={(e) => setSupplierEmail(e.target.value)} placeholder="email@ejemplo.com" className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Telefono</label>
                      <input value={supplierPhone} onChange={(e) => setSupplierPhone(e.target.value)} placeholder="+54 11 1234-5678" className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">Razon social / empresa</label>
                    <input value={supplierBusinessName} onChange={(e) => setSupplierBusinessName(e.target.value)} placeholder="Empresa S.A." className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">Notas</label>
                    <textarea value={supplierNotes} onChange={(e) => setSupplierNotes(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
                  </div>

                  <button
                    type="button"
                    onClick={handleCreateSupplier}
                    disabled={creatingSupplier}
                    className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {creatingSupplier ? "Creando proveedor..." : "Crear y usar proveedor"}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">SKU</label>
              <input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Opcional" className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Categoria</label>
              <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ej: Indumentaria" className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Unidad</label>
              <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="unidad" className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Precio de venta</label>
              <input type="number" min="0" value={salePrice || ""} onChange={(e) => setSalePrice(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <p className="text-[11px] text-muted-foreground mt-1">Precio base de compatibilidad.</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Costo</label>
              <input type="number" min="0" value={costPrice || ""} onChange={(e) => setCostPrice(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">{isEdit ? "Stock actual" : "Stock inicial"}</label>
              <input type="number" min="0" value={currentStock || ""} onChange={(e) => setCurrentStock(Number(e.target.value))} disabled={isEdit} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60" />
              {isEdit && <p className="text-[11px] text-muted-foreground mt-1">El stock actual se mueve desde el detalle del producto.</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Stock minimo</label>
              <input type="number" min="0" value={minStock || ""} onChange={(e) => setMinStock(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Precios de venta</p>
                <p className="text-[11px] text-muted-foreground">Podés definir múltiples precios por producto y elegirlos al crear un pedido.</p>
              </div>
              <button
                type="button"
                onClick={addPriceTier}
                className="text-xs font-semibold text-primary hover:text-primary/80"
              >
                + Agregar precio
              </button>
            </div>

            {priceTiers.length === 0 ? (
              <p className="text-xs text-muted-foreground">No hay precios configurados. Se usará el precio base.</p>
            ) : (
              <div className="space-y-2">
                {priceTiers.map((tier, index) => (
                  <div key={tier.id || `${index}-${tier.label}`} className="rounded-lg border border-border bg-muted/20 p-3 grid grid-cols-1 md:grid-cols-12 gap-2">
                    <div className="md:col-span-4">
                      <label className="block text-[11px] text-muted-foreground mb-1">Etiqueta</label>
                      <input
                        value={tier.label}
                        onChange={(e) => updatePriceTier(index, "label", e.target.value)}
                        placeholder="Ej: Minorista"
                        className="w-full px-2.5 py-2 rounded-lg bg-muted border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-[11px] text-muted-foreground mb-1">Precio</label>
                      <input
                        type="number"
                        min="0"
                        value={Number(tier.price) || ""}
                        onChange={(e) => updatePriceTier(index, "price", Number(e.target.value) || 0)}
                        className="w-full px-2.5 py-2 rounded-lg bg-muted border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] text-muted-foreground mb-1">Min. cant.</label>
                      <input
                        type="number"
                        min="1"
                        value={Number(tier.minQty) || 1}
                        onChange={(e) => updatePriceTier(index, "minQty", Math.max(1, Number(e.target.value) || 1))}
                        className="w-full px-2.5 py-2 rounded-lg bg-muted border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    <div className="md:col-span-2 flex items-end">
                      <label className="inline-flex items-center gap-1 text-xs">
                        <input
                          type="radio"
                          name="default-price-tier"
                          checked={Boolean(tier.isDefault)}
                          onChange={() => updatePriceTier(index, "isDefault", true)}
                        />
                        Por defecto
                      </label>
                    </div>
                    <div className="md:col-span-1 flex items-end justify-end">
                      <button
                        type="button"
                        onClick={() => removePriceTier(index)}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <label className="inline-flex items-center gap-2 text-xs text-foreground">
              <input
                type="checkbox"
                checked={allowManualPrice}
                onChange={(e) => setAllowManualPrice(e.target.checked)}
                className="rounded border-border"
              />
              Permitir precio manual al generar la venta
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Notas</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded border-border" />
            Producto activo
          </label>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">{saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear producto"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface MovementFormProps {
  product: ProductItem;
  onClose: () => void;
  onSaved: () => void;
}

function StockMovementModal({ product, onClose, onSaved }: MovementFormProps) {
  const { suppliers } = useAllSuppliers();
  const { orders } = useAllOrders();
  const [movementType, setMovementType] = useState<CreateStockMovementData["movementType"]>("purchase");
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState(Number(product.costPrice || 0));
  const [supplierId, setSupplierId] = useState<number | null>(product.supplierId ?? null);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const showOrderField = movementType === "sale";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (quantity <= 0) {
      setError("La cantidad tiene que ser mayor a 0");
      return;
    }

    setSaving(true);
    setError("");

    const result = await createProductStockMovement(product.id, {
      movementType,
      quantity,
      unitCost,
      supplierId: showOrderField ? undefined : supplierId || undefined,
      orderId: showOrderField ? orderId || undefined : undefined,
      notes: notes.trim() || undefined,
    });

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
          <h2 className="text-lg font-semibold">Movimiento de stock</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors" aria-label="Cerrar">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
          )}

          <div className="bg-muted/30 rounded-xl border border-border p-3">
            <p className="text-sm font-medium">{product.name}</p>
            <p className="text-xs text-muted-foreground mt-1">Stock actual: {Number(product.currentStock)} {product.unit}</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Tipo de movimiento</label>
            <select value={movementType} onChange={(e) => setMovementType(e.target.value as CreateStockMovementData["movementType"])} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
              {Object.entries(MOVEMENT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Cantidad</label>
              <input type="number" min="0.01" step="0.01" value={quantity || ""} onChange={(e) => setQuantity(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Costo unitario</label>
              <input type="number" min="0" step="0.01" value={unitCost || ""} onChange={(e) => setUnitCost(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          </div>

          {showOrderField ? (
            <div>
              <label className="block text-sm font-medium mb-1.5">Pedido relacionado</label>
              <select value={orderId ?? ""} onChange={(e) => setOrderId(e.target.value ? Number(e.target.value) : null)} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="">Sin pedido</option>
                {orders.map((order) => (
                  <option key={order.id} value={order.id}>
                    #{order.id} - {order.clientName}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-1.5">Proveedor</label>
              <select value={supplierId ?? ""} onChange={(e) => setSupplierId(e.target.value ? Number(e.target.value) : null)} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="">Sin proveedor</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5">Notas</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">{saving ? "Guardando..." : "Registrar movimiento"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface DetailProps {
  product: ProductItem;
  onClose: () => void;
  onEdit: (product: ProductItem) => void;
  onMovement: (product: ProductItem) => void;
}

function ProductDetailModal({ product, onClose, onEdit, onMovement }: DetailProps) {
  const [detail, setDetail] = useState<ProductDetailResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const run = async () => {
      setLoading(true);
      const result = await fetchProductDetail(product.id);
      if (active) {
        setDetail(result);
        setLoading(false);
      }
    };

    run();

    return () => {
      active = false;
    };
  }, [product.id]);

  const currentProduct = detail?.product ?? product;
  const stockLevel = Number(currentProduct.currentStock || 0);
  const minStock = Number(currentProduct.minStock || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold">{currentProduct.name}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{currentProduct.category || "Sin categoria"}{currentProduct.supplierName ? ` · ${currentProduct.supplierName}` : ""}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors" aria-label="Cerrar">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="p-10 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="bg-card/60 border border-border rounded-2xl p-4">
                <p className="text-xs text-muted-foreground mb-1">Stock actual</p>
                <p className={`text-xl font-bold ${stockLevel <= minStock ? "text-red-400" : "text-foreground"}`}>{stockLevel} {currentProduct.unit}</p>
              </div>
              <div className="bg-card/60 border border-border rounded-2xl p-4">
                <p className="text-xs text-muted-foreground mb-1">Stock minimo</p>
                <p className="text-xl font-bold">{minStock} {currentProduct.unit}</p>
              </div>
              <div className="bg-card/60 border border-border rounded-2xl p-4">
                <p className="text-xs text-muted-foreground mb-1">Costo</p>
                <p className="text-xl font-bold text-red-400">{formatCurrency(Number(currentProduct.costPrice || 0))}</p>
              </div>
              <div className="bg-card/60 border border-border rounded-2xl p-4">
                <p className="text-xs text-muted-foreground mb-1">Precio de venta</p>
                <p className="text-xl font-bold text-emerald-400">{formatCurrency(Number(currentProduct.salePrice || 0))}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => onMovement(currentProduct)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                <Boxes className="w-4 h-4" />
                Mover stock
              </button>
              <button type="button" onClick={() => onEdit(currentProduct)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
                <Pencil className="w-4 h-4" />
                Editar producto
              </button>
            </div>

            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                <Boxes className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm">Ultimos movimientos</h3>
              </div>
              {!detail?.movements?.length ? (
                <div className="p-8 text-center text-sm text-muted-foreground">Todavia no hay movimientos para este producto</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Movimiento</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cantidad</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Costo</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Relacion</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.movements.map((movement) => (
                        <tr key={movement.id} className="border-b border-border/50">
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${MOVEMENT_BADGE_CLASSES[movement.movementType as CreateStockMovementData["movementType"]] || "bg-muted text-foreground border-border"}`}>
                              {MOVEMENT_LABELS[movement.movementType as CreateStockMovementData["movementType"]] || movement.movementType}
                            </span>
                          </td>
                          <td className={`px-4 py-3 font-medium ${Number(movement.quantity) < 0 ? "text-red-400" : "text-emerald-400"}`}>
                            {Number(movement.quantity) < 0 ? "" : "+"}
                            {Number(movement.quantity)} {currentProduct.unit}
                          </td>
                          <td className="px-4 py-3">{formatCurrency(Number(movement.unitCost || 0))}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {movement.orderId ? `Pedido #${movement.orderId}` : movement.supplierName || "Sin relacion"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{formatDate(movement.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {currentProduct.notes && (
              <div className="bg-muted/20 border border-border rounded-2xl p-4">
                <p className="text-xs font-medium text-muted-foreground mb-1">Notas</p>
                <p className="text-sm whitespace-pre-wrap">{currentProduct.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function ProductsPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showMovement, setShowMovement] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [editProduct, setEditProduct] = useState<ProductItem | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const { products, loading, refresh } = useProducts({
    search: debouncedSearch || undefined,
    category: categoryFilter || undefined,
    lowStock: lowStockOnly || undefined,
  });

  const categories = useMemo(
    () => Array.from(new Set(products.map((product) => product.category).filter(Boolean))).sort(),
    [products],
  );

  const totalProducts = products.length;
  const lowStockProducts = products.filter((product) => product.lowStock).length;
  const totalUnits = products.reduce((sum, product) => sum + Number(product.currentStock || 0), 0);
  const stockValue = products.reduce((sum, product) => sum + Number(product.currentStock || 0) * Number(product.costPrice || 0), 0);

  const handleDelete = async (productId: number) => {
    if (!confirm("¿Eliminar este producto?")) return;
    await deleteProduct(productId);
    refresh();
  };

  const handleSaved = () => {
    refresh();
    setEditProduct(null);
    setSelectedProduct(null);
  };

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            Productos / Stock
            <HelpTooltip text="Aca podes crear tus productos base, controlar stock, registrar compras y salidas de unidades, y detectar faltantes antes de armar pedidos." />
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Base de articulos y control de inventario</p>
        </div>
        <button type="button" onClick={() => { setEditProduct(null); setShowForm(true); }} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4" />
          Nuevo producto
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-card/60 backdrop-blur border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Productos visibles</p>
          <p className="text-xl font-bold">{totalProducts}</p>
        </div>
        <div className="bg-card/60 backdrop-blur border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Unidades en stock</p>
          <p className="text-xl font-bold text-blue-400">{totalUnits}</p>
        </div>
        <div className="bg-card/60 backdrop-blur border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Valuacion estimada</p>
          <p className="text-xl font-bold text-emerald-400">{formatCurrency(stockValue)}</p>
        </div>
        <div className="bg-card/60 backdrop-blur border border-border rounded-2xl p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <p className="text-xs text-muted-foreground">Stock bajo</p>
          </div>
          <p className="text-xl font-bold text-red-400 mt-1">{lowStockProducts}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_auto] gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, SKU o categoria..." className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>

          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-3 py-2.5 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
            <option value="">Todas las categorias</option>
            {categories.map((category) => (
              <option key={category} value={category!}>{category}</option>
            ))}
          </select>

          <label className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border text-sm cursor-pointer select-none">
            <input type="checkbox" checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)} className="rounded border-border" />
            Solo stock bajo
          </label>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="py-14 text-center">
            <Package2 className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium">Todavia no hay productos cargados</p>
            <p className="text-sm text-muted-foreground mt-1">Crealos para poder controlar stock y despues cruzarlos con pedidos y reportes.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Producto</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Proveedor</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Categoria</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Stock</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Minimo</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Costo</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Venta</th>
                  <th className="w-28"></th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const stock = Number(product.currentStock || 0);
                  const min = Number(product.minStock || 0);
                  return (
                    <tr key={product.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{product.sku || "Sin SKU"}{product.isActive ? "" : " · Inactivo"}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{product.supplierName || "Sin proveedor"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{product.category || "Sin categoria"}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${stock <= min ? "text-red-400" : "text-foreground"}`}>{stock} {product.unit}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{min}</td>
                      <td className="px-4 py-3 text-right text-red-400">{formatCurrency(Number(product.costPrice || 0))}</td>
                      <td className="px-4 py-3 text-right text-emerald-400">{formatCurrency(Number(product.salePrice || 0))}</td>
                      <td className="px-2 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button type="button" onClick={() => { setSelectedProduct(product); setShowDetail(true); }} className="p-1.5 rounded-lg hover:bg-muted transition-colors" aria-label="Ver detalle">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => { setEditProduct(product); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-muted transition-colors" aria-label="Editar producto">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => handleDelete(product.id)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-red-400" aria-label="Eliminar producto">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {products.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <ArrowUpCircle className="w-4 h-4 text-emerald-400" />
              <h3 className="font-semibold text-sm">Como usar esta seccion</h3>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>1. Creas el producto base, por ejemplo "Remera Oversize Negra".</p>
              <p>2. Registras ingresos de stock cuando compras al proveedor.</p>
              <p>3. Registras salidas cuando ese articulo se usa o se vende.</p>
              <p>4. Despues cruzamos esto con pedidos y reportes para medir rentabilidad real.</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <ArrowDownCircle className="w-4 h-4 text-orange-400" />
              <h3 className="font-semibold text-sm">Alertas rapidas</h3>
            </div>
            {lowStockProducts === 0 ? (
              <p className="text-sm text-muted-foreground">No hay productos con stock bajo por ahora.</p>
            ) : (
              <div className="space-y-2">
                {products.filter((product) => product.lowStock).slice(0, 5).map((product) => (
                  <button key={product.id} type="button" onClick={() => { setSelectedProduct(product); setShowDetail(true); }} className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-border hover:bg-muted/30 transition-colors text-left">
                    <span className="text-sm font-medium">{product.name}</span>
                    <span className="text-xs text-red-400">{Number(product.currentStock)} / min {Number(product.minStock)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showForm && (
        <ProductFormModal
          product={editProduct}
          onClose={() => { setShowForm(false); setEditProduct(null); }}
          onSaved={handleSaved}
        />
      )}

      {showDetail && selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => { setShowDetail(false); setSelectedProduct(null); }}
          onEdit={(product) => {
            setShowDetail(false);
            setSelectedProduct(product);
            setEditProduct(product);
            setShowForm(true);
          }}
          onMovement={(product) => {
            setShowDetail(false);
            setSelectedProduct(product);
            setShowMovement(true);
          }}
        />
      )}

      {showMovement && selectedProduct && (
        <StockMovementModal
          product={selectedProduct}
          onClose={() => { setShowMovement(false); }}
          onSaved={() => {
            refresh();
            setShowMovement(false);
            setSelectedProduct(null);
          }}
        />
      )}
    </div>
  );
}
