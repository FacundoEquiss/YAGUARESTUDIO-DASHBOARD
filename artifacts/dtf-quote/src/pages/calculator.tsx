import React, { useState, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Plus, Trash2, Save, Users, MessageCircle } from "lucide-react";
import { useDTFSettings, useDTFQuotes } from "@/hooks/use-dtf-store";
import { StampItem, packStamps, STAMP_COLORS } from "@/lib/skyline";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { RollVisualizer } from "@/components/roll-visualizer";
import { motion, AnimatePresence } from "framer-motion";

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function buildWhatsAppFromCalc(params: {
  clientName: string;
  orderName: string;
  stamps: { w: number; h: number; qty: number }[];
  linearMeters: number;
  garments: number;
  pricePerGarment: number;
  totalOrder: number;
  showWholesale: boolean;
  pricePerGarmentWholesale: number;
  totalOrderWholesale: number;
}): string {
  const stampLines = params.stamps
    .filter(s => s.w > 0 && s.h > 0 && s.qty > 0)
    .map(s => `• ${s.w}cm × ${s.h}cm × ${s.qty} unid`)
    .join("\n");

  const date = format(new Date(), "d 'de' MMMM, yyyy", { locale: es });

  let msg = `*Cotización DTF - YAGUAR ESTUDIO*\n`;
  msg += `━━━━━━━━━━━━━━━━━━\n`;
  if (params.clientName) msg += `👤 Cliente: ${params.clientName}\n`;
  if (params.orderName) msg += `📦 Pedido: ${params.orderName}\n`;
  msg += `📅 Fecha: ${date}\n`;
  msg += `\n*Estampas:*\n${stampLines}\n\n`;
  msg += `━━━━━━━━━━━━━━━━━━\n`;
  msg += `📏 Metros usados: ${params.linearMeters.toFixed(2)} m\n`;
  msg += `👕 Prendas: ${params.garments} unid\n`;
  if (params.showWholesale) {
    msg += `💰 Precio/prenda (común): ${formatCurrency(params.pricePerGarment)}\n`;
    msg += `💰 Precio/prenda (mayorista): ${formatCurrency(params.pricePerGarmentWholesale)}\n\n`;
    msg += `*TOTAL COMÚN: ${formatCurrency(params.totalOrder)}*\n`;
    msg += `*TOTAL MAYORISTA: ${formatCurrency(params.totalOrderWholesale)}*\n`;
  } else {
    msg += `💰 Precio por prenda: ${formatCurrency(params.pricePerGarment)}\n`;
    msg += `\n*TOTAL PEDIDO: ${formatCurrency(params.totalOrder)}*\n`;
  }
  msg += `\n_Cotizado con Cotizador DTF by YAGUAR ESTUDIO_`;
  return msg;
}

export function CalculatorPage() {
  const { settings } = useDTFSettings();
  const { currentUser } = useAuth();
  const { isDark } = useTheme();
  const { saveQuote } = useDTFQuotes(currentUser?.id || "guest");
  const { toast } = useToast();

  const [clientName, setClientName] = useState("");
  const [orderName, setOrderName] = useState("");
  const [notes, setNotes] = useState("");
  const [garmentsCountRaw, setGarmentsCountRaw] = useState("1");
  const [stamps, setStamps] = useState<StampItem[]>([
    { id: uuidv4(), w: 28, h: 32, qty: 1 }
  ]);
  const [showWholesale, setShowWholesale] = useState(false);

  const garmentsCount = Math.max(1, parseInt(garmentsCountRaw) || 0);

  const addStamp = () => {
    setStamps([...stamps, { id: uuidv4(), w: 0, h: 0, qty: 1 }]);
  };

  const updateStamp = (id: string, field: keyof StampItem, value: number) => {
    setStamps(stamps.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const removeStamp = (id: string) => {
    if (stamps.length > 1) {
      setStamps(stamps.filter(s => s.id !== id));
    }
  };

  const packedResult = useMemo(() => {
    const validStamps = stamps.filter(s => s.w > 0 && s.h > 0 && s.qty > 0);
    if (validStamps.length === 0) return { placements: [], totalHeight: 0, errors: [] };
    return packStamps(settings.rollWidth, validStamps);
  }, [stamps, settings.rollWidth]);

  const linearMeters = packedResult.totalHeight / 100;

  const rawCost = linearMeters * settings.pricePerMeter;
  const garments = garmentsCount;
  const rawCostPerGarment = rawCost / garments;
  const pricePerGarment = Math.ceil((rawCostPerGarment + 2000) / 100) * 100;
  const totalOrder = pricePerGarment * garments;
  const pricePerGarmentWholesale = Math.ceil((rawCostPerGarment + 1200) / 100) * 100;
  const totalOrderWholesale = pricePerGarmentWholesale * garments;

  const handleSave = () => {
    if (!clientName.trim()) {
      toast({
        title: "Falta información",
        description: "Por favor ingresa el nombre del cliente.",
        variant: "destructive"
      });
      return;
    }
    if (packedResult.placements.length === 0) {
      toast({
        title: "Cotización vacía",
        description: "Agrega al menos una estampa válida para cotizar.",
        variant: "destructive"
      });
      return;
    }
    if (packedResult.errors.length > 0) {
      toast({
        title: "Error en estampas",
        description: packedResult.errors[0],
        variant: "destructive"
      });
      return;
    }

    saveQuote({
      clientName,
      orderName,
      notes,
      stamps: stamps.filter(s => s.w > 0 && s.h > 0 && s.qty > 0),
      placements: packedResult.placements,
      totalHeight: packedResult.totalHeight,
      linearMeters,
      totalPrice: totalOrder,
      rollWidth: settings.rollWidth,
      garmentsCount: garments,
      pricePerGarment,
    });

    toast({
      title: "¡Cotización guardada!",
      description: "Puedes verla en tu Historial.",
    });

    setClientName("");
    setOrderName("");
    setNotes("");
    setGarmentsCountRaw("1");
    setStamps([{ id: uuidv4(), w: 28, h: 32, qty: 1 }]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleShareWhatsApp = () => {
    const validStamps = stamps.filter(s => s.w > 0 && s.h > 0 && s.qty > 0);
    if (validStamps.length === 0) {
      toast({ title: "Sin estampas", description: "Agrega al menos una estampa válida.", variant: "destructive" });
      return;
    }
    const msg = buildWhatsAppFromCalc({
      clientName,
      orderName,
      stamps,
      linearMeters,
      garments,
      pricePerGarment,
      totalOrder,
      showWholesale,
      pricePerGarmentWholesale,
      totalOrderWholesale,
    });
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const validStampsCount = stamps.filter(s => s.w > 0 && s.h > 0).length;

  return (
    <div className="px-5 py-8 md:px-10 md:py-10 pb-12 md:flex md:gap-8 md:items-start">

      {/* ── LEFT COLUMN (form inputs) ── */}
      <div className="flex flex-col gap-8 md:flex-1 md:min-w-0">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-primary">
          Cotizador DTF
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          powered by <span className="font-black">YAGUAR</span> ESTUDIO
        </p>
      </div>

      {/* Client Info */}
      <Card className="border-none shadow-md overflow-hidden bg-card/60 backdrop-blur">
        <CardContent className="p-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="clientName" className="text-foreground font-bold">Cliente</Label>
            <Input
              id="clientName"
              placeholder="Ej: Juan Pérez"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="orderName" className="text-foreground font-bold">
              Nombre del Pedido <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Input
              id="orderName"
              placeholder="Ej: Camisetas Azules"
              value={orderName}
              onChange={(e) => setOrderName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-foreground font-bold">
              Notas <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Textarea
              id="notes"
              placeholder="Detalles del pedido..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[60px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Garments Count */}
      <Card className="border-none shadow-md overflow-hidden bg-card/60 backdrop-blur">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <Label htmlFor="garmentsCount" className="text-foreground font-bold text-base">
                Cantidad de prendas a estampar
              </Label>
              <p className="text-xs text-muted-foreground">Obligatorio · mínimo 1</p>
            </div>
          </div>
          <Input
            id="garmentsCount"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={garmentsCountRaw}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, "");
              setGarmentsCountRaw(val);
            }}
            onBlur={() => {
              if (!garmentsCountRaw || parseInt(garmentsCountRaw) < 1) {
                setGarmentsCountRaw("1");
              }
            }}
            className="h-12 text-xl font-bold text-center"
          />

          {/* iOS-style wholesale toggle */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <div>
              <p className="text-sm font-semibold text-foreground">Ver también precio mayorista</p>
            </div>
            <button
              onClick={() => setShowWholesale(v => !v)}
              aria-label="Toggle precio mayorista"
              style={{
                width: 51,
                height: 31,
                borderRadius: 999,
                backgroundColor: showWholesale ? "#f97316" : isDark ? "#374151" : "#d1d5db",
                position: "relative",
                border: "none",
                cursor: "pointer",
                transition: "background-color 0.25s ease",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 2,
                  left: showWholesale ? 22 : 2,
                  width: 27,
                  height: 27,
                  borderRadius: "50%",
                  backgroundColor: "#ffffff",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                  transition: "left 0.25s ease",
                  display: "block",
                }}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Stamps Form */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <div className="w-2 h-6 bg-primary rounded-full"></div>
            Estampas a cotizar
          </h2>
          <span className="text-xs font-medium bg-secondary text-muted-foreground px-2.5 py-1 rounded-full">
            {validStampsCount} ítem{validStampsCount !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {stamps.map((stamp, index) => {
              const stampColor = STAMP_COLORS[index % STAMP_COLORS.length];
              return (
                <motion.div
                  key={stamp.id}
                  initial={{ opacity: 0, height: 0, scale: 0.95 }}
                  animate={{ opacity: 1, height: "auto", scale: 1 }}
                  exit={{ opacity: 0, height: 0, scale: 0.95, margin: 0 }}
                  transition={{ duration: 0.2 }}
                  className="bg-card rounded-2xl p-4 shadow-sm border border-border flex flex-col gap-3 relative overflow-hidden"
                >
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1"
                    style={{ backgroundColor: stampColor }}
                  />

                  <div className="flex justify-between items-center pl-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: stampColor }}
                      />
                      <span className="text-sm font-bold">Estampa {index + 1}</span>
                    </div>
                    {stamps.length > 1 && (
                      <button
                        onClick={() => removeStamp(stamp.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Ancho (cm)</Label>
                      <Input
                        type="number"
                        min="1"
                        step="0.1"
                        value={stamp.w || ""}
                        onChange={(e) => updateStamp(stamp.id, "w", parseFloat(e.target.value) || 0)}
                        className="h-10 px-3"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Largo (cm)</Label>
                      <Input
                        type="number"
                        min="1"
                        step="0.1"
                        value={stamp.h || ""}
                        onChange={(e) => updateStamp(stamp.id, "h", parseFloat(e.target.value) || 0)}
                        className="h-10 px-3"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Cantidad</Label>
                      <input
                        type="number"
                        min="1"
                        value={stamp.qty || ""}
                        onChange={(e) => updateStamp(stamp.id, "qty", parseInt(e.target.value) || 0)}
                        style={{
                          display: "flex",
                          height: 40,
                          width: "100%",
                          borderRadius: 12,
                          paddingLeft: 12,
                          paddingRight: 12,
                          fontWeight: 700,
                          fontSize: "0.9rem",
                          outline: "none",
                          border: "none",
                          appearance: "none",
                          WebkitAppearance: "none",
                          backgroundColor: hexToRgba(stampColor, isDark ? 0.4 : 0.12),
                          boxShadow: `0 0 0 1.5px ${hexToRgba(stampColor, isDark ? 0.7 : 0.4)}`,
                          color: isDark ? "#ffffff" : "#111827",
                          transition: "box-shadow 0.2s",
                        }}
                      />
                    </div>
                  </div>

                  {stamp.w > 0 && stamp.h > 0 && stamp.qty > 0 && (
                    <div className="pl-2">
                      <span
                        className="text-xs font-bold px-3 py-1.5 rounded-full text-white"
                        style={{
                          backgroundColor: stampColor,
                        }}
                      >
                        {stamp.w}cm × {stamp.h}cm · {stamp.qty} unidad{stamp.qty !== 1 ? "es" : ""}
                      </span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        <Button
          variant="outline"
          className="w-full border-dashed border-2 hover:border-primary hover:bg-primary/5 text-muted-foreground hover:text-primary"
          onClick={addStamp}
        >
          <Plus className="w-5 h-5 mr-2" />
          Agregar otra estampa
        </Button>
      </div>

      </div>{/* end LEFT COLUMN */}

      {/* ── RIGHT COLUMN (summary + visualizer) ── */}
      <div className="flex flex-col gap-6 md:w-[400px] md:shrink-0 md:sticky md:top-8 mt-8 md:mt-0">

      {/* Summary Card */}
      <div className="bg-gradient-to-br from-[#F97316] to-[#EA580C] rounded-[1.5rem] p-6 text-white shadow-xl shadow-orange-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-xl -ml-5 -mb-5 pointer-events-none"></div>

        <h3 className="font-display text-xl font-bold mb-4 opacity-90">Resumen de Costos</h3>

        <div className="space-y-1.5 mb-5 bg-black/10 rounded-xl px-3 py-2.5">
          {stamps.filter(s => s.w > 0 && s.h > 0 && s.qty > 0).map((s) => (
            <div key={s.id} className="flex items-center gap-2 text-sm text-white">
              <span className="w-2 h-2 rounded-full bg-white/70 shrink-0"></span>
              <span className="font-medium">{s.qty} × {s.w}×{s.h}cm</span>
            </div>
          ))}
        </div>

        <div className="space-y-0 mb-5 rounded-xl overflow-hidden border border-white/20">
          <div className="flex justify-between items-center px-3 py-2.5 bg-black/10 border-b border-white/15">
            <span className="text-white/90 text-sm">Metros lineales</span>
            <span className="font-bold text-white">{linearMeters.toFixed(3)} m</span>
          </div>
          <div className="flex justify-between items-center px-3 py-2.5 bg-black/10 border-b border-white/15">
            <span className="text-white/90 text-sm">Prendas</span>
            <span className="font-bold text-white">{garments} unid.</span>
          </div>
          <div className="flex justify-between items-center px-3 py-2.5 bg-black/10">
            <span className="text-white/90 text-sm">Precio por prenda</span>
            <div className="text-right">
              <div className="font-bold text-white text-base">{formatCurrency(pricePerGarment)}</div>
              {showWholesale && (
                <div className="text-white text-sm font-semibold bg-white/20 rounded-md px-2 py-0.5 mt-0.5">
                  Mayorista: {formatCurrency(pricePerGarmentWholesale)}
                </div>
              )}
            </div>
          </div>
        </div>

        {showWholesale ? (
          <div className="space-y-2">
            <div className="bg-white/15 rounded-xl p-4 flex justify-between items-end">
              <span className="text-xs font-bold text-white/70 tracking-widest uppercase">TOTAL COMÚN</span>
              <span className="text-2xl font-display font-black text-white">
                {formatCurrency(totalOrder)}
              </span>
            </div>
            <div className="bg-white text-foreground rounded-xl p-4 flex justify-between items-end shadow-inner">
              <span className="text-xs font-bold text-muted-foreground tracking-widest uppercase">TOTAL MAYORISTA</span>
              <span className="text-2xl font-display font-black text-primary">
                {formatCurrency(totalOrderWholesale)}
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-white text-foreground rounded-xl p-4 flex justify-between items-end shadow-inner">
            <span className="text-sm font-bold text-muted-foreground tracking-widest uppercase">TOTAL PEDIDO</span>
            <span className="text-3xl font-display font-black text-primary">
              {formatCurrency(totalOrder)}
            </span>
          </div>
        )}
      </div>

      {/* Roll Visualization */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <div className="w-2 h-6 bg-primary rounded-full"></div>
          Vista Previa del Rollo
        </h2>
        <RollVisualizer
          rollWidth={settings.rollWidth}
          totalHeight={packedResult.totalHeight}
          placements={packedResult.placements}
          legend={stamps.filter(s => s.w > 0 && s.h > 0 && s.qty > 0).map((s, i) => ({
            w: s.w,
            h: s.h,
            qty: s.qty,
            color: STAMP_COLORS[i % STAMP_COLORS.length]
          }))}
        />
      </div>

      {packedResult.errors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-700 dark:text-red-400">
          <p className="font-bold mb-1">Problemas al ubicar estampas:</p>
          <ul className="list-disc pl-4 space-y-1">
            {packedResult.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 mt-4">
        {/* Save button — glass primary */}
        <button
          onClick={handleSave}
          disabled={packedResult.errors.length > 0}
          className="flex-1 flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(135deg, rgba(249,115,22,0.92) 0%, rgba(234,88,12,0.95) 100%)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            boxShadow: "0 8px 24px rgba(249,115,22,0.35), 0 1px 0 rgba(255,255,255,0.25) inset",
            border: "1px solid rgba(255,255,255,0.22)",
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.18)" }}
          >
            <Save className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-sm leading-tight text-center">
            Guardar<br />Cotización
          </span>
        </button>

        {/* WhatsApp button — glass green */}
        <button
          onClick={handleShareWhatsApp}
          disabled={packedResult.errors.length > 0}
          className="flex-1 flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(135deg, rgba(37,211,102,0.92) 0%, rgba(18,183,80,0.95) 100%)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            boxShadow: "0 8px 24px rgba(37,211,102,0.35), 0 1px 0 rgba(255,255,255,0.25) inset",
            border: "1px solid rgba(255,255,255,0.22)",
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.18)" }}
          >
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-sm leading-tight text-center">
            Enviar por<br />WhatsApp
          </span>
        </button>
      </div>

      </div>{/* end RIGHT COLUMN */}

    </div>
  );
}
