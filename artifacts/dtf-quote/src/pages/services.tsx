import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import {
  createService,
  deleteService,
  updateService,
  useServices,
  type CreateServiceData,
  type ServiceItem,
  type ServicePricingRule,
  type ServicePricingType,
} from "@/hooks/use-services";
import { HelpTooltip } from "@/components/help-tooltip";
import { Plus, Search, Trash2, Pencil, X, Wrench, ChevronDown, ChevronUp, Eye, EyeOff, TrendingUp } from "lucide-react";

function createDefaultServiceRule(): ServicePricingRule {
  return {
    id: `rule_${Date.now()}`,
    label: "Tramo base",
    minQty: 1,
    maxQty: null,
    unitPrice: 0,
  };
}

function ServiceFormModal({
  service,
  onClose,
  onSaved,
}: {
  service?: ServiceItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(service);
  const [name, setName] = useState(service?.name ?? "");
  const [category, setCategory] = useState(service?.category ?? "");
  const [pricingType, setPricingType] = useState<ServicePricingType>(service?.pricingType ?? "fixed");
  const [pricingRules, setPricingRules] = useState<ServicePricingRule[]>(service?.pricingRules?.length ? service.pricingRules : [createDefaultServiceRule()]);
  const [unit, setUnit] = useState(service?.unit ?? "unidad");
  const [baseCost, setBaseCost] = useState(Number(service?.baseCost || 0));
  const [suggestedPrice, setSuggestedPrice] = useState(Number(service?.suggestedPrice || 0));
  const [reportArea, setReportArea] = useState(service?.reportArea ?? "");
  const [reportConcept, setReportConcept] = useState(service?.reportConcept ?? "");
  const [notes, setNotes] = useState(service?.notes ?? "");
  const [isActive, setIsActive] = useState(service?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const updateRule = (index: number, key: keyof ServicePricingRule, value: string | number | null) => {
    setPricingRules((prev) =>
      prev.map((rule, ruleIndex) => {
        if (ruleIndex !== index) return rule;
        return {
          ...rule,
          [key]: value,
        } as ServicePricingRule;
      }),
    );
  };

  const addRule = () => {
    setPricingRules((prev) => [...prev, createDefaultServiceRule()]);
  };

  const removeRule = (index: number) => {
    setPricingRules((prev) => prev.filter((_, ruleIndex) => ruleIndex !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("El nombre del servicio es obligatorio");
      return;
    }

    setSaving(true);
    setError("");

    const payload: CreateServiceData = {
      name: name.trim(),
      category: category.trim() || undefined,
      pricingType,
      pricingRules: pricingType === "volume"
        ? pricingRules.map((rule, index) => ({
            id: rule.id || `rule_${index + 1}`,
            label: rule.label || `Tramo ${index + 1}`,
            minQty: Math.max(1, Number(rule.minQty) || 1),
            maxQty: rule.maxQty == null ? null : Math.max(1, Number(rule.maxQty) || 1),
            unitPrice: Math.max(0, Number(rule.unitPrice) || 0),
          }))
        : [],
      unit: unit.trim() || "unidad",
      baseCost,
      suggestedPrice,
      reportArea: reportArea.trim() || undefined,
      reportConcept: reportConcept.trim() || undefined,
      notes: notes.trim() || undefined,
      isActive,
    };

    const result = isEdit
      ? await updateService(service!.id, payload)
      : await createService(payload);

    setSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold">{isEdit ? "Editar servicio" : "Nuevo servicio"}</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors" aria-label="Cerrar">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Nombre *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Categoría</label>
              <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ej: Estampado" className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Tipo de precio</label>
              <select value={pricingType} onChange={(e) => setPricingType(e.target.value as ServicePricingType)} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="fixed">Fijo por unidad</option>
                <option value="hourly">Por hora</option>
                <option value="volume">Por volumen</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Unidad</label>
              <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="unidad" className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Precio sugerido</label>
              <input type="number" min="0" value={suggestedPrice || ""} onChange={(e) => setSuggestedPrice(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Costo base</label>
            <input type="number" min="0" value={baseCost || ""} onChange={(e) => setBaseCost(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>

          {pricingType === "volume" && (
            <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Reglas por volumen</p>
                <button type="button" onClick={addRule} className="text-xs font-semibold text-primary hover:text-primary/80">+ Agregar tramo</button>
              </div>
              <div className="space-y-2">
                {pricingRules.map((rule, index) => (
                  <div key={rule.id || `${index}`} className="grid grid-cols-1 md:grid-cols-12 gap-2 rounded-lg border border-border bg-muted/20 p-2.5">
                    <div className="md:col-span-4">
                      <label className="block text-[11px] text-muted-foreground mb-1">Etiqueta</label>
                      <input value={rule.label || ""} onChange={(e) => updateRule(index, "label", e.target.value)} className="w-full px-2.5 py-2 rounded-lg bg-muted border border-border text-xs" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] text-muted-foreground mb-1">Min</label>
                      <input type="number" min="1" value={Number(rule.minQty) || 1} onChange={(e) => updateRule(index, "minQty", Math.max(1, Number(e.target.value) || 1))} className="w-full px-2.5 py-2 rounded-lg bg-muted border border-border text-xs" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] text-muted-foreground mb-1">Max</label>
                      <input type="number" min="1" value={rule.maxQty == null ? "" : Number(rule.maxQty)} onChange={(e) => updateRule(index, "maxQty", e.target.value ? Math.max(1, Number(e.target.value) || 1) : null)} className="w-full px-2.5 py-2 rounded-lg bg-muted border border-border text-xs" />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-[11px] text-muted-foreground mb-1">Precio unit.</label>
                      <input type="number" min="0" value={Number(rule.unitPrice) || ""} onChange={(e) => updateRule(index, "unitPrice", Math.max(0, Number(e.target.value) || 0))} className="w-full px-2.5 py-2 rounded-lg bg-muted border border-border text-xs" />
                    </div>
                    <div className="md:col-span-1 flex items-end justify-end">
                      <button type="button" onClick={() => removeRule(index)} className="text-xs text-red-400 hover:text-red-300">Quitar</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Área de reporte</label>
              <input value={reportArea} onChange={(e) => setReportArea(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Concepto de reporte</label>
              <input value={reportConcept} onChange={(e) => setReportConcept(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Notas</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm resize-none" />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded border-border" />
            Servicio activo
          </label>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">{saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear servicio"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ServicesPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editService, setEditService] = useState<ServiceItem | null>(null);
  const [expandedServiceIds, setExpandedServiceIds] = useState<Set<number>>(new Set());

  const { services, loading, refresh } = useServices({
    search: search || undefined,
    category: categoryFilter || undefined,
    limit: 100,
  });

  const categories = useMemo(
    () => Array.from(new Set(services.map((service) => service.category).filter(Boolean))).sort(),
    [services],
  );

  // Compute statistics
  const stats = useMemo(() => {
    const total = services.length;
    const active = services.filter((s) => s.isActive).length;
    const avgPrice = total > 0 ? services.reduce((sum, s) => sum + Number(s.suggestedPrice || 0), 0) / total : 0;
    const volumeServices = services.filter((s) => s.pricingType === "volume").length;
    const totalMargin = services.reduce((sum, s) => {
      const price = Number(s.suggestedPrice || 0);
      const cost = Number(s.baseCost || 0);
      return sum + (price - cost);
    }, 0);

    return { total, active, avgPrice, volumeServices, totalMargin };
  }, [services]);

  const handleDelete = async (service: ServiceItem) => {
    const confirmed = window.confirm(`¿Eliminar el servicio \"${service.name}\"?`);
    if (!confirmed) return;

    const result = await deleteService(service.id);
    if (result.error) {
      window.alert(result.error);
      return;
    }

    await refresh();
  };

  const toggleExpanded = (serviceId: number) => {
    const newExpanded = new Set(expandedServiceIds);
    if (newExpanded.has(serviceId)) {
      newExpanded.delete(serviceId);
    } else {
      newExpanded.add(serviceId);
    }
    setExpandedServiceIds(newExpanded);
  };

  const getPricingTypeBadgeColor = (type: ServicePricingType) => {
    switch (type) {
      case "fixed":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "hourly":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "volume":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      default:
        return "bg-gray-500/10 text-gray-400 border-gray-500/20";
    }
  };

  const getPricingTypeLabel = (type: ServicePricingType) => {
    switch (type) {
      case "fixed":
        return "Fijo";
      case "hourly":
        return "Por hora";
      case "volume":
        return "Por volumen";
      default:
        return type;
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            Servicios
            <HelpTooltip text="Gestioná servicios como estampado, bajado de plancha, sublimación o diseño con precio fijo, por hora o por volumen." />
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Catálogo de servicios para usar en pedidos</p>
        </div>
        <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" />
          Nuevo servicio
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="rounded-xl border border-border bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground font-medium mb-1">Total de servicios</p>
          <p className="text-xl font-bold">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-border bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground font-medium mb-1">Activos</p>
          <p className="text-xl font-bold text-emerald-400">{stats.active}</p>
        </div>
        <div className="rounded-xl border border-border bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground font-medium mb-1">Precio promedio</p>
          <p className="text-xl font-bold">{formatCurrency(stats.avgPrice)}</p>
        </div>
        <div className="rounded-xl border border-border bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground font-medium mb-1">Por volumen</p>
          <p className="text-xl font-bold text-blue-400">{stats.volumeServices}</p>
        </div>
        <div className="rounded-xl border border-border bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Margen total
          </p>
          <p className="text-xl font-bold text-orange-400">{formatCurrency(stats.totalMargin)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-8 relative">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o categoría"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="md:col-span-4">
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
            <option value="">Todas las categorías</option>
            {categories.map((category) => (
              <option key={category || ""} value={category || ""}>{category}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Cargando servicios...</div>
        ) : services.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Todavía no hay servicios cargados</div>
        ) : (
          <div className="divide-y divide-border/60">
            {services.map((service) => {
              const isExpanded = expandedServiceIds.has(service.id);
              const margin = Number(service.suggestedPrice || 0) - Number(service.baseCost || 0);
              const marginPercent = Number(service.suggestedPrice || 0) > 0 ? (margin / Number(service.suggestedPrice || 0)) * 100 : 0;

              return (
                <div key={service.id} className="divide-y divide-border/30">
                  {/* Main Row */}
                  <div className="px-4 py-4 text-sm items-center">
                    <div className="flex items-center gap-3">
                      {/* Expand Button */}
                      <button
                        onClick={() => toggleExpanded(service.id)}
                        className="p-1 rounded hover:bg-muted transition-colors shrink-0"
                        aria-label={isExpanded ? "Contraer" : "Expandir"}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>

                      {/* Main Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-medium text-foreground">{service.name}</p>
                          {/* Status Badge */}
                          {!service.isActive && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                              <EyeOff className="w-3 h-3" />
                              Inactivo
                            </span>
                          )}
                          {/* Pricing Type Badge */}
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${getPricingTypeBadgeColor(service.pricingType)}`}>
                            {getPricingTypeLabel(service.pricingType)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{service.category || "Sin categoría"}</p>
                      </div>

                      {/* Price & Margin */}
                      <div className="text-right min-w-fit mr-3">
                        <p className="font-medium text-foreground">{formatCurrency(Number(service.suggestedPrice || 0))}</p>
                        <p className={`text-xs ${margin >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          Margen: {formatCurrency(margin)} ({marginPercent.toFixed(0)}%)
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            setEditService(service);
                            setShowForm(true);
                          }}
                          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          aria-label="Editar servicio"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => void handleDelete(service)}
                          className="p-2 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          aria-label="Eliminar servicio"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-4 py-4 bg-muted/20 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Unidad</p>
                          <p className="text-sm font-medium">{service.unit}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Costo base</p>
                          <p className="text-sm font-medium">{formatCurrency(Number(service.baseCost || 0))}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Área de reporte</p>
                          <p className="text-sm font-medium">{service.reportArea || "—"}</p>
                        </div>
                      </div>

                      {/* Pricing Rules for Volume Services */}
                      {service.pricingType === "volume" && service.pricingRules && service.pricingRules.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-muted-foreground font-semibold mb-2">Reglas por volumen:</p>
                          <div className="space-y-1.5">
                            {service.pricingRules.map((rule, index) => (
                              <div key={rule.id || index} className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/50">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-foreground">{rule.label}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Cantidad: {rule.minQty}-{rule.maxQty === null ? "∞" : rule.maxQty}
                                  </p>
                                </div>
                                <p className="text-sm font-semibold text-emerald-400 ml-2 shrink-0">{formatCurrency(rule.unitPrice)}/unit</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {service.notes && (
                        <div className="mt-3">
                          <p className="text-xs text-muted-foreground font-semibold mb-1">Notas:</p>
                          <p className="text-xs text-foreground bg-muted/40 border border-border/50 rounded-lg p-2">{service.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {(showForm || editService) && (
        <ServiceFormModal
          service={editService}
          onClose={() => {
            setShowForm(false);
            setEditService(null);
          }}
          onSaved={() => {
            setShowForm(false);
            setEditService(null);
            void refresh();
          }}
        />
      )}

      <div className="rounded-xl border border-border bg-muted/20 p-3 text-xs text-muted-foreground flex items-start gap-2">
        <Wrench className="w-4 h-4 mt-0.5 shrink-0" />
        Los servicios que crees acá ya pueden agregarse en pedidos y combinarse con productos en la misma orden. Usa los indicadores de margen para monitorear rentabilidad.
      </div>
    </div>
  );
}
