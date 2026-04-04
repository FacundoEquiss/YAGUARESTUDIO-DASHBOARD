import { useState, useCallback, useEffect } from "react";
import { cn, formatCurrency } from "@/lib/utils";
import {
  useOrders,
  useOrderStats,
  createOrder,
  updateOrder,
  registerOrderPayment,
  registerOrderCostPayment,
  markOrderDelivered,
  deleteOrder,
  type OrderItem,
  type CreateOrderData,
  type OrderLineInput,
} from "@/hooks/use-orders";
import { useAllClients, createClient } from "@/hooks/use-clients";
import { useProducts } from "@/hooks/use-products";
import { useAllServices, type ServiceItem } from "@/hooks/use-services";
import { useAllFinancialAccounts } from "@/hooks/use-financial-accounts";
import { HelpTooltip } from "@/components/help-tooltip";
import { clearOrderDraft, loadOrderDraft } from "@/lib/drafts";
import {
  Plus,
  Search,
  Filter,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  X,
  Calendar,
  Package,
  AlertCircle,
  DollarSign,
} from "lucide-react";

const STATUS_OPTIONS = [
  { value: "nuevo", label: "Nuevo", color: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  { value: "en_proceso", label: "En Proceso", color: "bg-orange-500/15 text-orange-400 border-orange-500/20" },
  { value: "listo", label: "Listo", color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20" },
  { value: "entregado", label: "Entregado", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  { value: "cancelado", label: "Cancelado", color: "bg-red-500/15 text-red-400 border-red-500/20" },
] as const;

const PAYMENT_METHOD_OPTIONS = [
  { value: "cash", label: "Efectivo" },
  { value: "mercado_pago", label: "Mercado Pago" },
  { value: "bank_transfer", label: "Transferencia" },
  { value: "debit_card", label: "Tarjeta débito" },
  { value: "credit_card", label: "Tarjeta crédito" },
  { value: "other", label: "Otro" },
] as const;

const EXPENSE_CATEGORIES = [
  { value: "materiales", label: "Materiales" },
  { value: "envio", label: "Envío" },
  { value: "servicios", label: "Servicios" },
  { value: "impuestos", label: "Impuestos" },
  { value: "otros", label: "Otros" },
] as const;

function getStatusBadge(status: string) {
  const opt = STATUS_OPTIONS.find((o) => o.value === status);
  if (!opt) return { label: status, color: "bg-gray-500/15 text-gray-400 border-gray-500/20" };
  return opt;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

function formatShortDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

type FormLineType = "manual" | "product" | "service";

interface FormOrderLine {
  key: string;
  type: FormLineType;
  sourceId: number | null;
  priceTierId: string | null;
  title: string;
  description: string;
  quantity: string;
  unitCost: string;
  unitPrice: string;
}

let lineKeyCounter = 0;
function nextLineKey() {
  return `line-${++lineKeyCounter}`;
}

function toNumericString(value: unknown, fallback = 0): string {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? String(parsed) : String(fallback);
}

function parseLineNumber(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return parsed;
}

function resolveFormLineType(lineType?: string | null, sourceType?: string | null): FormLineType {
  if (sourceType === "product" || lineType === "product_line") {
    return "product";
  }

  if (sourceType === "service" || lineType === "service_line") {
    return "service";
  }

  return "manual";
}

function createEmptyFormLine(type: FormLineType = "manual"): FormOrderLine {
  return {
    key: nextLineKey(),
    type,
    sourceId: null,
    priceTierId: null,
    title: "",
    description: "",
    quantity: "1",
    unitCost: "0",
    unitPrice: "0",
  };
}

function calculateLineTotals(line: FormOrderLine) {
  const quantity = Math.max(0, parseLineNumber(line.quantity));
  const unitCost = Math.max(0, parseLineNumber(line.unitCost));
  const unitPrice = Math.max(0, parseLineNumber(line.unitPrice));

  return {
    quantity,
    unitCost,
    unitPrice,
    totalCost: quantity * unitCost,
    totalPrice: quantity * unitPrice,
  };
}

function getDefaultProductTier(product: { priceTiers?: Array<{ id: string; isDefault?: boolean; isActive?: boolean; price: number }> }) {
  const tiers = Array.isArray(product.priceTiers) ? product.priceTiers.filter((tier) => tier.isActive !== false) : [];
  if (tiers.length === 0) {
    return null;
  }

  return tiers.find((tier) => tier.isDefault) || tiers[0];
}

function resolveServiceUnitPrice(service: ServiceItem, quantity: number): number {
  const safeQuantity = Math.max(0, quantity || 0);

  if (service.pricingType === "volume") {
    const sortedRules = (service.pricingRules || [])
      .slice()
      .sort((a, b) => Number(a.minQty || 0) - Number(b.minQty || 0));

    for (const rule of sortedRules) {
      const minQty = Math.max(1, Number(rule.minQty) || 1);
      const maxQty = rule.maxQty == null ? null : Math.max(minQty, Number(rule.maxQty) || minQty);

      if (safeQuantity >= minQty && (maxQty == null || safeQuantity <= maxQty)) {
        return Math.max(0, Number(rule.unitPrice) || 0);
      }
    }
  }

  return Math.max(0, Number(service.suggestedPrice) || 0);
}

interface OrderFormProps {
  order?: OrderItem | null;
  draft?: Partial<CreateOrderData> | null;
  onClose: () => void;
  onSaved: () => void;
}

function OrderFormModal({ order, draft, onClose, onSaved }: OrderFormProps) {
  const isEdit = !!order;
  const { clients: allClients } = useAllClients();
  const { products } = useProducts();
  const { services } = useAllServices();
  const [selectedClientId, setSelectedClientId] = useState<number | null>(order?.clientId ?? draft?.clientId ?? null);
  const [clientName, setClientName] = useState(order?.clientName ?? draft?.clientName ?? "");
  const [title, setTitle] = useState(order?.title ?? draft?.title ?? "");
  const [description, setDescription] = useState(order?.description ?? draft?.description ?? "");
  const [status, setStatus] = useState(order?.status ?? draft?.status ?? "nuevo");
  const [dueDate, setDueDate] = useState(order?.dueDate ? order.dueDate.slice(0, 10) : draft?.dueDate ?? "");
  const [notes, setNotes] = useState(order?.notes ?? draft?.notes ?? "");
  const [createClientProfile, setCreateClientProfile] = useState(Boolean(draft?.clientName && !draft?.clientId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const initialLines: FormOrderLine[] = (() => {
    if (order?.lineItems && order.lineItems.length > 0) {
      return order.lineItems.map((line) => ({
        key: nextLineKey(),
        type: resolveFormLineType(line.lineType, line.sourceType),
        sourceId: line.sourceId ?? null,
        priceTierId: null,
        title: line.title,
        description: line.description || "",
        quantity: toNumericString(line.quantity, 1),
        unitCost: toNumericString(line.unitCost, 0),
        unitPrice: toNumericString(line.unitPrice, 0),
      }));
    }

    if (draft?.lineItems && draft.lineItems.length > 0) {
      return draft.lineItems.map((line) => ({
        key: nextLineKey(),
        type: resolveFormLineType(line.lineType, line.sourceType),
        sourceId: line.sourceId ?? null,
        priceTierId: null,
        title: line.title,
        description: line.description || "",
        quantity: toNumericString(line.quantity, 1),
        unitCost: toNumericString(line.unitCost, 0),
        unitPrice: toNumericString(line.unitPrice, 0),
      }));
    }

    if (order?.costItems && order.costItems.length > 0) {
      return order.costItems.map((line) => ({
        key: nextLineKey(),
        type: "manual" as const,
        sourceId: null,
        priceTierId: null,
        title: line.title,
        description: "",
        quantity: "1",
        unitCost: "0",
        unitPrice: toNumericString(line.amount, 0),
      }));
    }

    if (draft?.costItems && draft.costItems.length > 0) {
      return draft.costItems.map((line) => ({
        key: nextLineKey(),
        type: "manual" as const,
        sourceId: null,
        priceTierId: null,
        title: line.title,
        description: "",
        quantity: "1",
        unitCost: "0",
        unitPrice: toNumericString(line.amount, 0),
      }));
    }

    return [createEmptyFormLine()];
  })();

  const [orderLines, setOrderLines] = useState<FormOrderLine[]>(initialLines);

  const { totalCost, totalPrice } = orderLines.reduce(
    (acc, line) => {
      const totals = calculateLineTotals(line);
      acc.totalCost += totals.totalCost;
      acc.totalPrice += totals.totalPrice;
      return acc;
    },
    { totalCost: 0, totalPrice: 0 },
  );

  const handleClientSelect = (val: string) => {
    if (val === "") {
      setSelectedClientId(null);
      return;
    }
    const id = Number(val);
    const found = allClients.find((c) => c.id === id);
    if (found) {
      setSelectedClientId(found.id);
      setClientName(found.name);
    }
  };

  const applyProductSelection = (line: FormOrderLine, sourceId: number | null): FormOrderLine => {
    if (!sourceId) {
      return {
        ...line,
        sourceId: null,
      };
    }

    const selected = products.find((product) => product.id === sourceId);
    if (!selected) {
      return {
        ...line,
        sourceId,
        priceTierId: null,
      };
    }

    const defaultTier = getDefaultProductTier(selected);
    const resolvedUnitPrice = defaultTier ? Number(defaultTier.price || 0) : Number(selected.salePrice || 0);

    return {
      ...line,
      sourceId,
      priceTierId: defaultTier?.id || null,
      title: selected.name,
      unitCost: toNumericString(selected.costPrice, 0),
      unitPrice: toNumericString(resolvedUnitPrice, 0),
    };
  };

  const changeLineProductPriceTier = (key: string, tierId: string | null) => {
    setOrderLines((prev) =>
      prev.map((line) => {
        if (line.key !== key) {
          return line;
        }

        if (line.type !== "product" || !line.sourceId) {
          return { ...line, priceTierId: tierId };
        }

        const selected = products.find((product) => product.id === line.sourceId);
        if (!selected) {
          return { ...line, priceTierId: tierId };
        }

        if (!tierId || tierId === "manual") {
          return { ...line, priceTierId: "manual" };
        }

        const tier = (selected.priceTiers || []).find((priceTier) => priceTier.id === tierId && priceTier.isActive !== false);
        if (!tier) {
          return { ...line, priceTierId: "manual" };
        }

        return {
          ...line,
          priceTierId: tier.id,
          unitPrice: toNumericString(tier.price, 0),
        };
      }),
    );
  };

  const addOrderLine = () => {
    setOrderLines((prev) => [...prev, createEmptyFormLine()]);
  };

  const applyServiceSelection = (line: FormOrderLine, sourceId: number | null): FormOrderLine => {
    if (!sourceId) {
      return {
        ...line,
        sourceId: null,
      };
    }

    const selected = services.find((service) => service.id === sourceId);
    if (!selected) {
      return {
        ...line,
        sourceId,
      };
    }

    const quantity = Math.max(0, parseLineNumber(line.quantity));
    const resolvedUnitPrice = resolveServiceUnitPrice(selected, quantity);

    return {
      ...line,
      sourceId,
      title: selected.name,
      unitCost: toNumericString(selected.baseCost, 0),
      unitPrice: toNumericString(resolvedUnitPrice, 0),
    };
  };

  const changeLineService = (key: string, sourceId: number | null) => {
    setOrderLines((prev) =>
      prev.map((line) => {
        if (line.key !== key) {
          return line;
        }

        return applyServiceSelection(line, sourceId);
      }),
    );
  };

  const updateOrderLine = (key: string, field: keyof FormOrderLine, value: string | number | null) => {
    setOrderLines((prev) =>
      prev.map((line) => {
        if (line.key !== key) {
          return line;
        }

        const updatedLine = {
          ...line,
          [field]: value,
        } as FormOrderLine;

        if (line.type === "service" && line.sourceId && field === "quantity") {
          const selectedService = services.find((service) => service.id === line.sourceId);
          if (selectedService) {
            const nextQuantity = Math.max(0, parseLineNumber(String(value)));
            updatedLine.unitPrice = toNumericString(resolveServiceUnitPrice(selectedService, nextQuantity), 0);
          }
        }

        return updatedLine;
      }),
    );
  };

  const changeLineType = (key: string, type: FormLineType) => {
    setOrderLines((prev) =>
      prev.map((line) => {
        if (line.key !== key) {
          return line;
        }

        if (type === "product") {
          const preferredProductId = line.sourceId ?? products[0]?.id ?? null;
          const productLine: FormOrderLine = {
            ...line,
            type,
            sourceId: preferredProductId,
            priceTierId: null,
            quantity: line.quantity || "1",
          };
          return applyProductSelection(productLine, preferredProductId);
        }

        return {
          ...line,
          type,
          sourceId: null,
          priceTierId: null,
          title: line.title || (type === "service" ? "Servicio" : ""),
        };
      }),
    );
  };

  const changeLineProduct = (key: string, sourceId: number | null) => {
    setOrderLines((prev) =>
      prev.map((line) => {
        if (line.key !== key) {
          return line;
        }

        return applyProductSelection(line, sourceId);
      }),
    );
  };

  const removeOrderLine = (key: string) => {
    setOrderLines((prev) => {
      if (prev.length <= 1) {
        return prev;
      }

      return prev.filter((line) => line.key !== key);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      setError("El nombre del cliente es obligatorio");
      return;
    }

    const validLines: OrderLineInput[] = [];

    for (const line of orderLines) {
      const totals = calculateLineTotals(line);
      const selectedProduct =
        line.type === "product" && line.sourceId
          ? products.find((product) => product.id === line.sourceId)
          : null;
      const selectedService =
        line.type === "service" && line.sourceId
          ? services.find((service) => service.id === line.sourceId)
          : null;

      const resolvedTitle = line.title.trim() || selectedProduct?.name || selectedService?.name || "";
      if (!resolvedTitle || totals.quantity <= 0) {
        continue;
      }

      const sourceType = line.type === "manual" ? "manual" : line.type;
      const lineType =
        line.type === "product"
          ? "product_line"
          : line.type === "service"
            ? "service_line"
            : "manual_line";

      validLines.push({
        lineType,
        sourceType,
        sourceId: line.type === "manual" ? null : line.sourceId,
        title: resolvedTitle,
        description: line.description.trim() || undefined,
        quantity: totals.quantity,
        unitCost: totals.unitCost,
        unitPrice: totals.unitPrice,
        totalCost: totals.totalCost,
        totalPrice: totals.totalPrice,
        affectsStock: line.type === "product",
        affectsFinance: true,
      });
    }

    if (validLines.length === 0) {
      setError("Agregá al menos una línea válida con título y cantidad");
      return;
    }

    setSaving(true);
    setError("");

    let finalClientId = selectedClientId;
    if (!finalClientId && createClientProfile) {
      const existingClient = allClients.find(
        (client) => client.name.trim().toLowerCase() === clientName.trim().toLowerCase(),
      );

      if (existingClient) {
        finalClientId = existingClient.id;
      } else {
        const created = await createClient({ name: clientName.trim() });
        if (created.error || !created.client) {
          setSaving(false);
          setError(created.error || "No se pudo crear el cliente");
          return;
        }
        finalClientId = created.client.id;
      }
    }

    const data: CreateOrderData = {
      clientName: clientName.trim(),
      clientId: finalClientId,
      title: title.trim() || undefined,
      description: description.trim() || undefined,
      quantity: 1,
      unitPrice: 0,
      totalPrice,
      quotedTotal: totalPrice,
      status,
      dueDate: dueDate || null,
      notes: notes.trim() || undefined,
      lineItems: validLines,
      pricingInput: draft?.pricingInput,
    };

    const result = isEdit ? await updateOrder(order!.id, data) : await createOrder(data);
    setSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-4 bg-card border border-border rounded-2xl shadow-2xl max-h-[90dvh] overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-display font-bold text-foreground">
            {isEdit ? "Editar Pedido" : "Nuevo Pedido"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Cliente *</label>
            {allClients.length > 0 && (
              <select
                value={selectedClientId ?? ""}
                onChange={(e) => handleClientSelect(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm mb-2"
              >
                <option value="">Escribir manualmente</option>
                {allClients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{c.businessName ? ` (${c.businessName})` : ""}</option>
                ))}
              </select>
            )}
            <input
              type="text"
              value={clientName}
              onChange={(e) => { setClientName(e.target.value); setSelectedClientId(null); }}
              placeholder="Nombre del cliente"
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
              autoFocus={!allClients.length}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-1.5">
              Título del pedido
              <HelpTooltip text="Un nombre para identificar este pedido, por ejemplo: 'Remeras Sandino' o 'Pedido Feria Mayo'." iconSize={12} />
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Remeras para evento, Pedido Sandino..."
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción del pedido (ej: 50 remeras con estampa logo)"
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm resize-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-1.5">
              Líneas del pedido *
              <HelpTooltip text="Podés mezclar líneas manuales, productos y servicios. Cada línea impacta en costos, precio final y trazabilidad del pedido." iconSize={12} />
            </label>
            <div className="space-y-3">
              {orderLines.map((line, index) => {
                const selectedProduct =
                  line.type === "product" && line.sourceId
                    ? products.find((product) => product.id === line.sourceId)
                    : null;
                const activePriceTiers = selectedProduct?.priceTiers?.filter((tier) => tier.isActive !== false) || [];
                const manualPricingEnabled = selectedProduct?.allowManualPrice ?? true;
                const isManualTier = !line.priceTierId || line.priceTierId === "manual";
                const totals = calculateLineTotals(line);

                return (
                  <div key={line.key} className="rounded-xl border border-border/70 bg-white/3 p-3 space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                      <div className="sm:col-span-4">
                        <select
                          value={line.type}
                          onChange={(e) => changeLineType(line.key, e.target.value as FormLineType)}
                          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
                        >
                          <option value="manual">Manual</option>
                          <option value="product">Producto</option>
                          <option value="service">Servicio</option>
                        </select>
                      </div>

                      <div className="sm:col-span-8">
                        {line.type === "product" ? (
                          <select
                            value={line.sourceId ?? ""}
                            onChange={(e) => changeLineProduct(line.key, e.target.value ? Number(e.target.value) : null)}
                            className="w-full px-3 py-2 rounded-xl bg-white/5 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
                          >
                            <option value="">Seleccionar producto</option>
                            {products.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.name}
                              </option>
                            ))}
                          </select>
                        ) : line.type === "service" ? (
                          <select
                            value={line.sourceId ?? ""}
                            onChange={(e) => changeLineService(line.key, e.target.value ? Number(e.target.value) : null)}
                            className="w-full px-3 py-2 rounded-xl bg-white/5 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
                          >
                            <option value="">Seleccionar servicio</option>
                            {services.map((service) => (
                              <option key={service.id} value={service.id}>
                                {service.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={line.title}
                            onChange={(e) => updateOrderLine(line.key, "title", e.target.value)}
                            placeholder={`Ej: Línea ${index + 1}`}
                            className="w-full px-3 py-2 rounded-xl bg-white/5 border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
                          />
                        )}
                      </div>
                    </div>

                    {line.type === "product" && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] text-muted-foreground block mb-1">Precio aplicado</label>
                            <select
                              value={line.priceTierId || "manual"}
                              onChange={(e) => changeLineProductPriceTier(line.key, e.target.value || null)}
                              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
                            >
                              {activePriceTiers.map((tier) => (
                                <option key={tier.id} value={tier.id}>
                                  {tier.label} ({formatCurrency(Number(tier.price || 0))})
                                </option>
                              ))}
                              {manualPricingEnabled && <option value="manual">Precio manual</option>}
                            </select>
                          </div>
                          <div className="flex items-end">
                            <p className="text-[11px] text-muted-foreground">
                              {isManualTier
                                ? "Precio editable manualmente para esta línea."
                                : "Precio tomado desde la configuración del producto."}
                            </p>
                          </div>
                        </div>
                        <input
                          type="text"
                          value={line.title}
                          onChange={(e) => updateOrderLine(line.key, "title", e.target.value)}
                          placeholder="Nombre visible de la línea"
                          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
                        />
                        {selectedProduct && (
                          <p className="text-[11px] text-muted-foreground">
                            Stock actual: {Number(selectedProduct.currentStock)} {selectedProduct.unit}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[11px] text-muted-foreground block mb-1">Cantidad</label>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={line.quantity}
                          onChange={(e) => updateOrderLine(line.key, "quantity", e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-muted-foreground block mb-1">Costo unit.</label>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={line.unitCost}
                          onChange={(e) => updateOrderLine(line.key, "unitCost", e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-muted-foreground block mb-1">Precio unit.</label>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={line.unitPrice}
                          onChange={(e) => updateOrderLine(line.key, "unitPrice", e.target.value)}
                          disabled={line.type === "product" && !isManualTier}
                          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={line.description}
                        onChange={(e) => updateOrderLine(line.key, "description", e.target.value)}
                        placeholder="Descripción opcional"
                        className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeOrderLine(line.key)}
                        disabled={orderLines.length <= 1}
                        className="p-2 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 disabled:opacity-20 disabled:hover:text-muted-foreground disabled:hover:bg-transparent transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between px-2 text-xs">
                      <span className="text-muted-foreground">Subtotal línea</span>
                      <span className="font-semibold text-foreground">{formatCurrency(totals.totalPrice)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={addOrderLine}
              className="mt-2 flex items-center gap-1.5 text-xs text-primary font-semibold hover:text-primary/80 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Agregar línea
            </button>
          </div>

          {!selectedClientId && clientName.trim().length > 0 && (
            <label className="flex items-start gap-2 rounded-xl border border-border bg-white/5 px-3 py-2.5 text-sm text-foreground">
              <input
                type="checkbox"
                checked={createClientProfile}
                onChange={(e) => setCreateClientProfile(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                Guardar también este cliente en la base de clientes.
              </span>
            </label>
          )}

          <div className="grid grid-cols-2 gap-3 px-3 py-2.5 rounded-xl bg-primary/5 border border-primary/10">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Costo estimado</p>
              <p className="text-sm font-semibold text-foreground">{formatCurrency(totalCost)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-muted-foreground">Total del pedido</p>
              <p className="text-base font-display font-bold text-primary">{formatCurrency(totalPrice)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Estado</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm appearance-none"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Fecha de Entrega</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Notas</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas adicionales..."
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? "Guardando..." : isEdit ? "Guardar Cambios" : "Crear Pedido"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface OrderDetailProps {
  order: OrderItem;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRegisterPayment: () => void;
  onRegisterCost: () => void;
  onMarkDelivered: () => void;
}

function OrderDetailModal({ order, onClose, onEdit, onDelete, onRegisterPayment, onRegisterCost, onMarkDelivered }: OrderDetailProps) {
  const badge = getStatusBadge(order.status);
  const [deleting, setDeleting] = useState(false);
  const paidAmount = Number(order.paidAmount || 0);
  const balanceDue = Number(order.balanceDue || order.totalPrice || 0);
  const lineBreakdown =
    order.lineItems && order.lineItems.length > 0
      ? order.lineItems.map((line) => ({ id: line.id, title: line.title, amount: Number(line.totalPrice || 0) }))
      : order.costItems.map((line) => ({ id: line.id, title: line.title, amount: Number(line.amount || 0) }));

  const handleDelete = async () => {
    if (!confirm("¿Estás seguro de eliminar este pedido?")) return;
    setDeleting(true);
    await onDelete();
  };

  const hasCostItems = lineBreakdown.length > 0;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-4 bg-card border border-border rounded-2xl shadow-2xl max-h-[90dvh] overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-lg font-display font-bold text-foreground">
              {order.title || `Pedido #${order.id}`}
            </h2>
            {order.title && (
              <p className="text-xs text-muted-foreground mt-0.5">Pedido #{order.id}</p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className={cn("text-xs font-bold px-2.5 py-1 rounded-lg border", badge.color)}>
              {badge.label}
            </span>
            <span className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</span>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-0.5">Cliente</p>
              <p className="text-sm font-semibold text-foreground">{order.clientName}</p>
            </div>
            {order.description && (
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-0.5">Descripción</p>
                <p className="text-sm text-foreground">{order.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Cobrado</p>
                <p className="mt-1 text-base font-display font-bold text-foreground">{formatCurrency(paidAmount)}</p>
              </div>
              <div className="rounded-xl border border-orange-500/15 bg-orange-500/5 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-orange-400">Pendiente</p>
                <p className="mt-1 text-base font-display font-bold text-foreground">{formatCurrency(balanceDue)}</p>
              </div>
            </div>

            {hasCostItems ? (
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-2">Desglose de costos</p>
                <div className="space-y-1.5">
                  {lineBreakdown.map((line) => (
                    <div key={line.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/3 border border-border/50">
                      <span className="text-sm text-foreground">{line.title}</span>
                      <span className="text-sm font-semibold text-foreground">{formatCurrency(line.amount)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-primary/5 border border-primary/10 mt-2">
                    <span className="text-sm font-bold text-foreground">Total</span>
                    <span className="text-sm font-bold text-primary">{formatCurrency(Number(order.totalPrice))}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-0.5">Cantidad</p>
                  <p className="text-sm font-semibold text-foreground">{order.quantity}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-0.5">Precio Unit.</p>
                  <p className="text-sm font-semibold text-foreground">{formatCurrency(Number(order.unitPrice))}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-0.5">Total</p>
                  <p className="text-sm font-bold text-primary">{formatCurrency(Number(order.totalPrice))}</p>
                </div>
              </div>
            )}

            {order.dueDate && (
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Entrega: <span className="font-medium text-foreground">{formatDate(order.dueDate)}</span>
                </p>
              </div>
            )}
            {order.notes && (
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-0.5">Notas</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{order.notes}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border">
            <button
              onClick={onRegisterPayment}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-sm font-bold hover:bg-emerald-500/15 transition-colors"
            >
              <DollarSign className="w-4 h-4" />
              Registrar pago
            </button>
            <button
              onClick={onRegisterCost}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-sm font-bold hover:bg-red-500/15 transition-colors"
            >
              <DollarSign className="w-4 h-4" />
              Registrar costo
            </button>
            {order.status !== "entregado" && (
              <button
                onClick={onMarkDelivered}
                className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-white/5 transition-colors"
              >
                Marcar entregado
              </button>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onEdit}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors"
            >
              <Pencil className="w-4 h-4" />
              Editar
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2.5 rounded-xl border border-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/10 disabled:opacity-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PaymentModalProps {
  order: OrderItem;
  onClose: () => void;
  onSaved: () => void;
}

function RegisterOrderPaymentModal({ order, onClose, onSaved }: PaymentModalProps) {
  const { accounts } = useAllFinancialAccounts();
  const [amount, setAmount] = useState(Math.max(0, Number(order.balanceDue || order.totalPrice || 0)) || Number(order.totalPrice || 0));
  const [paymentMethod, setPaymentMethod] = useState<(typeof PAYMENT_METHOD_OPTIONS)[number]["value"]>("cash");
  const [financialAccountId, setFinancialAccountId] = useState<number | null>(null);
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setError("El monto debe ser mayor a 0");
      return;
    }

    setSaving(true);
    setError("");

    const result = await registerOrderPayment(order.id, {
      amount,
      paymentMethod,
      financialAccountId: financialAccountId || undefined,
      paidAt: paidAt || undefined,
      notes: notes.trim() || undefined,
    });

    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }

    onSaved();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 bg-card border border-border rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-display font-bold text-foreground">Registrar pago</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
          )}

          <div className="text-xs text-muted-foreground">
            Pedido #{order.id} · Pendiente: <span className="font-semibold text-foreground">{formatCurrency(Number(order.balanceDue || 0))}</span>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Monto *</label>
            <input
              type="number"
              min={0}
              step={1}
              value={amount || ""}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Medio de pago</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as (typeof PAYMENT_METHOD_OPTIONS)[number]["value"])}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
            >
              {PAYMENT_METHOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {accounts.length > 0 && (
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Cuenta financiera</label>
              <select
                value={financialAccountId ?? ""}
                onChange={(e) => setFinancialAccountId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
              >
                <option value="">Sin cuenta</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Fecha</label>
            <input
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Notas</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={`Cobro pedido #${order.id}`}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? "Guardando..." : "Registrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface CostPaymentModalProps {
  order: OrderItem;
  onClose: () => void;
  onSaved: () => void;
}

function RegisterOrderCostPaymentModal({ order, onClose, onSaved }: CostPaymentModalProps) {
  const { accounts } = useAllFinancialAccounts();
  const lineOptions =
    order.lineItems && order.lineItems.length > 0
      ? order.lineItems.map((line) => ({ id: line.id, title: line.title }))
      : order.costItems.map((line) => ({ id: line.id, title: line.title }));
  const [amount, setAmount] = useState(0);
  const [category, setCategory] = useState<(typeof EXPENSE_CATEGORIES)[number]["value"]>("materiales");
  const [description, setDescription] = useState(`Costo pedido #${order.id}`);
  const [financialAccountId, setFinancialAccountId] = useState<number | null>(null);
  const [orderItemId, setOrderItemId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"" | (typeof PAYMENT_METHOD_OPTIONS)[number]["value"]>("");
  const [reportArea, setReportArea] = useState("");
  const [reportConcept, setReportConcept] = useState("");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setError("El monto debe ser mayor a 0");
      return;
    }

    setSaving(true);
    setError("");

    const result = await registerOrderCostPayment(order.id, {
      amount,
      category,
      description: description.trim() || undefined,
      financialAccountId: financialAccountId || undefined,
      orderItemId: orderItemId || undefined,
      paymentMethod: paymentMethod || undefined,
      reportArea: reportArea.trim() || undefined,
      reportConcept: reportConcept.trim() || undefined,
      paidAt: paidAt || undefined,
    });

    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }

    onSaved();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 bg-card border border-border rounded-2xl shadow-2xl max-h-[90dvh] overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-display font-bold text-foreground">Registrar costo pagado</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
          )}

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Monto *</label>
            <input
              type="number"
              min={0}
              step={1}
              value={amount || ""}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Categoría</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as (typeof EXPENSE_CATEGORIES)[number]["value"])}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
            >
              {EXPENSE_CATEGORIES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Línea del pedido</label>
            <select
              value={orderItemId ?? ""}
              onChange={(e) => setOrderItemId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
            >
              <option value="">Sin línea específica</option>
              {lineOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Medio de pago</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as "" | (typeof PAYMENT_METHOD_OPTIONS)[number]["value"])}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
            >
              <option value="">Sin especificar</option>
              {PAYMENT_METHOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {accounts.length > 0 && (
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Cuenta financiera</label>
              <select
                value={financialAccountId ?? ""}
                onChange={(e) => setFinancialAccountId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
              >
                <option value="">Sin cuenta</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Área reporte</label>
              <input
                type="text"
                value={reportArea}
                onChange={(e) => setReportArea(e.target.value)}
                placeholder="Producción"
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Concepto reporte</label>
              <input
                type="text"
                value={reportConcept}
                onChange={(e) => setReportConcept(e.target.value)}
                placeholder="Insumos"
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Fecha</label>
            <input
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Descripción</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? "Guardando..." : "Registrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { orders, total, totalPages, loading, refresh } = useOrders({
    status: statusFilter || undefined,
    search: search || undefined,
    sortBy,
    sortDir,
    page,
    limit: 15,
  });
  const stats = useOrderStats();

  const [showForm, setShowForm] = useState(false);
  const [editOrder, setEditOrder] = useState<OrderItem | null>(null);
  const [detailOrder, setDetailOrder] = useState<OrderItem | null>(null);
  const [paymentOrder, setPaymentOrder] = useState<OrderItem | null>(null);
  const [costPaymentOrder, setCostPaymentOrder] = useState<OrderItem | null>(null);
  const [draftOrder, setDraftOrder] = useState<Partial<CreateOrderData> | null>(null);

  const handleSearch = useCallback(() => {
    setSearch(searchInput);
    setPage(1);
  }, [searchInput]);

  const handleSaved = useCallback(() => {
    setShowForm(false);
    setEditOrder(null);
    setDetailOrder(null);
    setPaymentOrder(null);
    setCostPaymentOrder(null);
    setDraftOrder(null);
    refresh();
    stats.refresh();
  }, [refresh, stats]);

  useEffect(() => {
    const storedDraft = loadOrderDraft();
    if (!storedDraft) {
      return;
    }

    setDraftOrder(storedDraft);
    setEditOrder(null);
    setShowForm(true);
    clearOrderDraft();
  }, []);

  const handleDeleteFromDetail = useCallback(async () => {
    if (detailOrder) {
      await deleteOrder(detailOrder.id);
      setDetailOrder(null);
      refresh();
      stats.refresh();
    }
  }, [detailOrder, refresh, stats]);

  const handleRegisterPayment = useCallback((order: OrderItem) => {
    setDetailOrder(null);
    setPaymentOrder(order);
  }, []);

  const handleRegisterCost = useCallback((order: OrderItem) => {
    setDetailOrder(null);
    setCostPaymentOrder(order);
  }, []);

  const handleMarkDelivered = useCallback(async () => {
    if (!detailOrder) {
      return;
    }

    await markOrderDelivered(detailOrder.id);
    setDetailOrder(null);
    refresh();
    stats.refresh();
  }, [detailOrder, refresh, stats]);

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir("desc");
    }
    setPage(1);
  };

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-6 space-y-5 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary" />
            Pedidos
            <HelpTooltip text="Gestioná todos tus pedidos de producción. Podés asignar clientes, cambiar estados y llevar un seguimiento completo." />
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {stats.activeOrders} activo{stats.activeOrders !== 1 ? "s" : ""} · {stats.monthOrders} este mes · {total} total
          </p>
        </div>
        <button
          onClick={() => { setDraftOrder(null); setEditOrder(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nuevo Pedido
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Buscar por cliente, título o descripción..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/5 border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
          <button
            onClick={() => { setStatusFilter(""); setPage(1); }}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors border",
              !statusFilter
                ? "bg-primary/15 text-primary border-primary/30"
                : "bg-white/5 text-muted-foreground border-border hover:bg-white/10"
            )}
          >
            Todos
          </button>
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s.value}
              onClick={() => { setStatusFilter(s.value); setPage(1); }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors border",
                statusFilter === s.value
                  ? s.color
                  : "bg-white/5 text-muted-foreground border-border hover:bg-white/10"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card/60 backdrop-blur rounded-2xl border border-border overflow-hidden">
        <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3 border-b border-border text-xs font-bold text-muted-foreground uppercase tracking-wider items-center">
          <button onClick={() => handleSort("clientName")} className="text-left flex items-center gap-1 hover:text-foreground transition-colors">
            Pedido {sortBy === "clientName" && (sortDir === "asc" ? "↑" : "↓")}
          </button>
          <span className="w-24 text-center">Estado</span>
          <button onClick={() => handleSort("totalPrice")} className="w-24 text-right flex items-center justify-end gap-1 hover:text-foreground transition-colors">
            Total {sortBy === "totalPrice" && (sortDir === "asc" ? "↑" : "↓")}
            <HelpTooltip text="Precio total del pedido (suma de todos los ítems de costo). Hacé clic en el encabezado para ordenar." iconSize={11} side="bottom" />
          </button>
          <button onClick={() => handleSort("dueDate")} className="w-24 text-right flex items-center justify-end gap-1 hover:text-foreground transition-colors">
            Entrega {sortBy === "dueDate" && (sortDir === "asc" ? "↑" : "↓")}
          </button>
          <button onClick={() => handleSort("createdAt")} className="w-24 text-right flex items-center justify-end gap-1 hover:text-foreground transition-colors">
            Creado {sortBy === "createdAt" && (sortDir === "asc" ? "↑" : "↓")}
          </button>
        </div>

        {loading && orders.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="w-12 h-12 text-muted-foreground/20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              {search || statusFilter ? "No se encontraron pedidos con esos filtros" : "No tenés pedidos todavía"}
            </p>
            {!search && !statusFilter && (
              <button
                onClick={() => setShowForm(true)}
                className="mt-3 text-xs text-primary font-semibold hover:underline"
              >
                Crear tu primer pedido
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {orders.map((order) => {
              const badge = getStatusBadge(order.status);
              const costCount = order.lineItems?.length || order.costItems?.length || 0;
              return (
                <button
                  key={order.id}
                  onClick={() => setDetailOrder(order)}
                  className="w-full text-left px-5 py-3.5 hover:bg-white/3 transition-colors"
                >
                  <div className="sm:hidden space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1 mr-2">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {order.title || order.clientName}
                        </p>
                        {order.title && (
                          <p className="text-xs text-muted-foreground truncate">{order.clientName}</p>
                        )}
                      </div>
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0", badge.color)}>
                        {badge.label}
                      </span>
                    </div>
                    {order.description && (
                      <p className="text-xs text-muted-foreground truncate">{order.description}</p>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {costCount > 0 ? `${costCount} ítem${costCount > 1 ? "s" : ""}` : `${order.quantity} u.`}
                        {" · "}
                        {formatCurrency(Number(order.totalPrice))}
                      </span>
                      <span>{formatShortDate(order.dueDate) || formatShortDate(order.createdAt)}</span>
                    </div>
                  </div>

                  <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {order.title || order.clientName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {order.title ? order.clientName : (order.description || "")}
                        {order.title && order.description ? ` — ${order.description}` : ""}
                      </p>
                    </div>
                    <div className="w-24 flex justify-center">
                      <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-lg border", badge.color)}>
                        {badge.label}
                      </span>
                    </div>
                    <span className="w-24 text-right text-sm font-semibold text-foreground">
                      {formatCurrency(Number(order.totalPrice))}
                    </span>
                    <span className="w-24 text-right text-xs text-muted-foreground">
                      {formatShortDate(order.dueDate) || "—"}
                    </span>
                    <span className="w-24 text-right text-xs text-muted-foreground">
                      {formatShortDate(order.createdAt)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Página {page} de {totalPages} ({total} pedidos)
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 text-muted-foreground transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 text-muted-foreground transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {(showForm || editOrder) && (
        <OrderFormModal
          order={editOrder}
          draft={draftOrder}
          onClose={() => { setShowForm(false); setEditOrder(null); }}
          onSaved={handleSaved}
        />
      )}

      {detailOrder && !showForm && !editOrder && (
        <OrderDetailModal
          order={detailOrder}
          onClose={() => setDetailOrder(null)}
          onEdit={() => {
            setDraftOrder(null);
            setEditOrder(detailOrder);
            setDetailOrder(null);
            setShowForm(true);
          }}
          onDelete={handleDeleteFromDetail}
          onRegisterPayment={() => handleRegisterPayment(detailOrder)}
          onRegisterCost={() => handleRegisterCost(detailOrder)}
          onMarkDelivered={handleMarkDelivered}
        />
      )}

      {paymentOrder && (
        <RegisterOrderPaymentModal
          order={paymentOrder}
          onClose={() => setPaymentOrder(null)}
          onSaved={handleSaved}
        />
      )}

      {costPaymentOrder && (
        <RegisterOrderCostPaymentModal
          order={costPaymentOrder}
          onClose={() => setCostPaymentOrder(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
