import React, { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { v4 as uuidv4 } from "uuid";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Plus, Trash2, Save, Users, MessageCircle, ChevronDown, ChevronUp, Info, ClipboardList } from "lucide-react";
import { HelpTooltip } from "@/components/help-tooltip";
import { useDTFSettings, useDTFQuotes } from "@/hooks/use-dtf-store";
import { StampItem, packStamps, STAMP_COLORS } from "@/lib/skyline";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/components/theme-provider";
import { useUsage } from "@/hooks/use-usage";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { ToolSessionGate } from "@/components/tool-session-gate";
import { saveOrderDraft } from "@/lib/drafts";
import { fetchAuthoritativeDtfPricing } from "@/lib/dtf-pricing-api";
import type { DtfPricingInput } from "@/hooks/use-orders";
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
  stamps: StampItem[];
  linearMeters: number;
  garments: number;
  pricePerGarment: number;
  totalOrder: number;
  showWholesale: boolean;
  pricePerGarmentWholesale: number;
  totalOrderWholesale: number;
  pressPasses: number;
  talleActive: boolean;
}): string {
  const stampLines = params.stamps
    .filter(s => s.w > 0 && s.h > 0 && s.qty > 0)
    .map((s, i) => {
      const title = s.title || `Estampa ${i + 1}`;
      return `• ${title}: ${s.w}cm × ${s.h}cm × ${s.qty} unid`;
    })
    .join("\n");

  const date = format(new Date(), "d 'de' MMMM, yyyy", { locale: es });

  let msg = `*Cotización DTF - Trazo by YAGUAR ESTUDIO*\n`;
  msg += `━━━━━━━━━━━━━━━━━━\n`;
  if (params.clientName) msg += `👤 Cliente: ${params.clientName}\n`;
  if (params.orderName) msg += `📦 Pedido: ${params.orderName}\n`;
  msg += `📅 Fecha: ${date}\n`;
  msg += `\n*Estampas:*\n${stampLines}\n\n`;
  msg += `━━━━━━━━━━━━━━━━━━\n`;
  msg += `📏 Metros usados: ${params.linearMeters.toFixed(2)} m\n`;
  msg += `👕 Prendas: ${params.garments} unid\n`;
  if (params.pressPasses > 0) msg += `🔥 Bajadas de plancha: ${params.pressPasses}\n`;
  if (params.talleActive) msg += `📐 Incluye talle: Sí\n`;
  if (params.showWholesale) {
    msg += `💰 Precio/prenda (común): ${formatCurrency(params.pricePerGarment)}\n`;
    msg += `💰 Precio/prenda (mayorista): ${formatCurrency(params.pricePerGarmentWholesale)}\n\n`;
    msg += `*TOTAL COMÚN: ${formatCurrency(params.totalOrder)}*\n`;
    msg += `*TOTAL MAYORISTA: ${formatCurrency(params.totalOrderWholesale)}*\n`;
  } else {
    msg += `💰 Precio por prenda: ${formatCurrency(params.pricePerGarment)}\n`;
    msg += `\n*TOTAL PEDIDO: ${formatCurrency(params.totalOrder)}*\n`;
  }
  msg += `\n_Cotizado con Trazo by YAGUAR ESTUDIO_`;
  return msg;
}

function buildOrderDraftDescription(params: {
  garments: number;
  linearMeters: number;
  stamps: StampItem[];
  pressPasses: number;
  talleActive: boolean;
}) {
  const stampSummary = params.stamps
    .filter((stamp) => stamp.w > 0 && stamp.h > 0 && stamp.qty > 0)
    .map((stamp, index) => `${stamp.title || `Estampa ${index + 1}`}: ${stamp.w}x${stamp.h} cm x ${stamp.qty}`)
    .join(" | ");

  const extras = [
    `${params.garments} prenda${params.garments !== 1 ? "s" : ""}`,
    `${params.linearMeters.toFixed(2)} m de DTF`,
  ];

  if (params.pressPasses > 0) {
    extras.push(`${params.pressPasses} bajada${params.pressPasses !== 1 ? "s" : ""} de plancha`);
  }

  if (params.talleActive) {
    extras.push("lleva talle");
  }

  return `${extras.join(" · ")}${stampSummary ? `\n${stampSummary}` : ""}`;
}

export function CalculatorPage() {
  const [, setLocation] = useLocation();
  const { settings } = useDTFSettings();
  const { currentUser } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { saveQuote } = useDTFQuotes(currentUser?.id || "guest");
  const { toast } = useToast();
  const { canUse, increment, remaining } = useUsage();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [quoteSessionStarted, setQuoteSessionStarted] = useState(false);
  const [startingQuoteSession, setStartingQuoteSession] = useState(false);

  const [clientName, setClientName] = useState("");
  const [orderName, setOrderName] = useState("");
  const [notes, setNotes] = useState("");
  const [garmentsCountRaw, setGarmentsCountRaw] = useState("1");
  const [stamps, setStamps] = useState<StampItem[]>([
    { id: uuidv4(), w: 28, h: 32, qty: 1, title: "" }
  ]);
  const [showWholesale, setShowWholesale] = useState(false);
  const [pressPassesRaw, setPressPassesRaw] = useState(String(settings.pressPassThreshold));
  const [talleActive, setTalleActive] = useState(settings.talleEnabled);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showMathExplanation, setShowMathExplanation] = useState(false);
  const [settingsSynced, setSettingsSynced] = useState(false);
  const [pricingBusy, setPricingBusy] = useState(false);

  useEffect(() => {
    if (!settingsSynced && settings.pressPassThreshold > 0) {
      setPressPassesRaw(String(settings.pressPassThreshold));
      setTalleActive(settings.talleEnabled);
      setSettingsSynced(true);
    }
  }, [settings.pressPassThreshold, settings.talleEnabled, settingsSynced]);

  const garmentsCount = Math.max(1, parseInt(garmentsCountRaw) || 0);
  const pressPasses = Math.max(0, parseInt(pressPassesRaw) || 0);

  const addStamp = () => {
    setStamps([...stamps, { id: uuidv4(), w: 0, h: 0, qty: 1, title: "" }]);
  };

  const updateStamp = (id: string, field: keyof StampItem, value: number | string) => {
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
  const dtfCostPerGarment = rawCost / garments;

  const pressPassExtra = pressPasses > settings.pressPassThreshold
    ? (pressPasses - settings.pressPassThreshold) * settings.pressPassExtraCost
    : 0;

  const talleSurchargeAmount = talleActive ? settings.talleSurcharge : 0;

  const pricePerGarment = Math.ceil((dtfCostPerGarment + settings.baseMargin + pressPassExtra + talleSurchargeAmount) / 100) * 100;
  const totalOrder = pricePerGarment * garments;
  const pricePerGarmentWholesale = Math.ceil((dtfCostPerGarment + settings.wholesaleMargin + pressPassExtra + talleSurchargeAmount) / 100) * 100;
  const totalOrderWholesale = pricePerGarmentWholesale * garments;
  const estimatedPricePerGarment = pricePerGarment;
  const estimatedTotalOrder = totalOrder;
  const estimatedPricePerGarmentWholesale = pricePerGarmentWholesale;
  const estimatedTotalOrderWholesale = totalOrderWholesale;
  const isMaster = currentUser?.role === "master";
  const isQuoteSessionUnlocked = isMaster || quoteSessionStarted;

  const buildPricingInput = (): DtfPricingInput => ({
    garments,
    pressPasses,
    talleActive,
    stamps: stamps
      .filter((s) => s.w > 0 && s.h > 0 && s.qty > 0)
      .map((s) => ({
        id: s.id,
        w: s.w,
        h: s.h,
        qty: s.qty,
        title: s.title,
      })),
  });

  const requestAuthoritativePricing = async () => {
    const pricingInput = buildPricingInput();
    if (pricingInput.stamps.length === 0) {
      toast({
        title: "Cotización vacía",
        description: "Agrega al menos una estampa válida para cotizar.",
        variant: "destructive",
      });
      return null;
    }

    setPricingBusy(true);
    const { pricing, error } = await fetchAuthoritativeDtfPricing(pricingInput);
    setPricingBusy(false);

    if (error || !pricing) {
      toast({
        title: "No se pudo validar el precio",
        description: error || "Error al calcular precio en backend.",
        variant: "destructive",
      });
      return null;
    }

    return { pricingInput, pricing };
  };

  const handleStartQuoteSession = async () => {
    if (isQuoteSessionUnlocked) {
      return;
    }

    if (!canUse("dtf_quotes")) {
      setShowUpgrade(true);
      return;
    }

    setStartingQuoteSession(true);
    const sessionId = `quote-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const ok = await increment("dtf_quotes", {
      source: "calculator",
      stage: "tool_unlock",
      sessionId,
    });
    setStartingQuoteSession(false);

    if (!ok) {
      setShowUpgrade(true);
      return;
    }

    setQuoteSessionStarted(true);
    toast({
      title: "Cotización iniciada",
      description: "Ya podés usar todas las funciones de esta cotización.",
    });
  };

  const handleSave = async () => {
    if (!isQuoteSessionUnlocked) {
      toast({
        title: "Primero iniciá la cotización",
        description: "Así registramos el uso y desbloqueamos la herramienta.",
        variant: "destructive"
      });
      return;
    }

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

    const authoritative = await requestAuthoritativePricing();
    if (!authoritative) {
      return;
    }

    saveQuote({
      clientName,
      orderName,
      notes,
      stamps: stamps.filter(s => s.w > 0 && s.h > 0 && s.qty > 0),
      placements: authoritative.pricing.placements.map((p) => ({
        id: `${p.itemIndex}-${p.x}-${p.y}`,
        itemIndex: p.itemIndex,
        x: p.x,
        y: p.y,
        w: p.w,
        h: p.h,
        color: STAMP_COLORS[p.itemIndex % STAMP_COLORS.length],
      })),
      totalHeight: authoritative.pricing.totalHeight,
      linearMeters: authoritative.pricing.linearMeters,
      totalPrice: authoritative.pricing.totalOrder,
      rollWidth: settings.rollWidth,
      garmentsCount: authoritative.pricing.garments,
      pricePerGarment: authoritative.pricing.pricePerGarment,
      pressPasses,
      talleEnabled: talleActive,
    });

    toast({
      title: "¡Cotización guardada!",
      description: "Puedes verla en tu Historial.",
    });

    setClientName("");
    setOrderName("");
    setNotes("");
    setGarmentsCountRaw("1");
    setPressPassesRaw(String(settings.pressPassThreshold));
    setTalleActive(settings.talleEnabled);
    setStamps([{ id: uuidv4(), w: 28, h: 32, qty: 1, title: "" }]);
    setQuoteSessionStarted(false);
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
      pressPasses,
      talleActive,
    });
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handleCreateOrderDraft = async () => {
    if (!isQuoteSessionUnlocked) {
      toast({
        title: "Primero iniciá la cotización",
        description: "Así registramos el uso antes de crear el pedido.",
        variant: "destructive",
      });
      return;
    }

    if (!clientName.trim()) {
      toast({
        title: "Falta el cliente",
        description: "Ingresá el nombre del cliente antes de crear el pedido.",
        variant: "destructive",
      });
      return;
    }

    if (packedResult.placements.length === 0 || packedResult.errors.length > 0) {
      toast({
        title: "La cotización todavía no está lista",
        description: "Revisá las estampas antes de crear el pedido.",
        variant: "destructive",
      });
      return;
    }

    const authoritative = await requestAuthoritativePricing();
    if (!authoritative) {
      return;
    }

    saveOrderDraft({
      clientName: clientName.trim(),
      title: orderName.trim() || `Pedido de ${clientName.trim()}`,
      description: buildOrderDraftDescription({
        garments: authoritative.pricing.garments,
        linearMeters: authoritative.pricing.linearMeters,
        stamps,
        pressPasses,
        talleActive,
      }),
      quantity: authoritative.pricing.garments,
      unitPrice: authoritative.pricing.pricePerGarment,
      totalPrice: authoritative.pricing.totalOrder,
      status: "nuevo",
      notes: notes.trim() || undefined,
      costItems: [
        {
          title: `Cotización DTF (${authoritative.pricing.linearMeters.toFixed(2)} m)`,
          amount: authoritative.pricing.totalOrder,
        },
      ],
      pricingInput: authoritative.pricingInput,
    });

    toast({
      title: "Pedido prearmado",
      description: "Te llevé a Pedidos con la cotización cargada.",
    });

    setLocation("/orders");
  };

  const validStampsCount = stamps.filter(s => s.w > 0 && s.h > 0).length;

  return (
    <div className="px-4 py-6 pb-12 sm:px-6 sm:py-6">
      {!isQuoteSessionUnlocked && (
        <div className="mb-6 md:max-w-3xl">
          <ToolSessionGate
            title="Iniciar cotización"
            description="Cuando la inicies, se habilitan todos los campos y se descuenta 1 uso de tu plan."
            buttonLabel="Iniciar cotización"
            remaining={remaining.dtfQuotes}
            loading={startingQuoteSession}
            onStart={() => void handleStartQuoteSession()}
          />
        </div>
      )}

      <div className={`md:flex md:items-start md:gap-8 ${isQuoteSessionUnlocked ? "" : "pointer-events-none select-none opacity-40 blur-[1px]"}`}>
      <div className="flex flex-col gap-8 md:min-w-0 md:flex-1 md:gap-4">

      <div className="md:hidden">
        <h1 className="text-3xl font-display font-bold text-primary">
          Cotizador DTF
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          <span className="font-black">Trazo</span> by Yaguar Estudio
        </p>
      </div>

      <Card className="border-none shadow-md overflow-hidden bg-card/60 backdrop-blur">
        <CardContent className="p-5 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="clientName" className="text-foreground font-bold text-sm">Cliente</Label>
              <Input
                id="clientName"
                placeholder="Ej: Juan Pérez"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="orderName" className="text-foreground font-bold text-sm">
                Pedido <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Input
                id="orderName"
                placeholder="Ej: Camisetas Azules"
                value={orderName}
                onChange={(e) => setOrderName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes" className="text-foreground font-bold text-sm">
              Notas <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Textarea
              id="notes"
              placeholder="Detalles del pedido..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[48px] md:min-h-[40px] resize-none"
            />
          </div>

          <div className="md:flex md:items-center md:gap-4 md:pt-2 md:border-t md:border-border">
            <div className="flex items-center gap-3 md:flex-1 md:flex md:items-center md:gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <div className="flex flex-col leading-tight">
                <Label htmlFor="garmentsCount" className="text-foreground font-bold text-sm whitespace-nowrap">
                  Cantidad de prendas
                </Label>
                <span className="text-[11px] text-muted-foreground">Obligatorio · mín. 1</span>
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
                className="h-11 text-2xl font-black text-center md:w-28 md:flex-none"
              />
            </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border md:mt-0 md:pt-0 md:border-0 md:shrink-0">
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
          </div>

          <div className="md:flex md:items-center md:gap-4 md:pt-2 md:border-t md:border-border space-y-3 md:space-y-0">
            <div className="flex items-center gap-3 md:flex-1">
              <div className="flex flex-col leading-tight">
                <Label htmlFor="pressPasses" className="text-foreground font-bold text-sm whitespace-nowrap flex items-center gap-1">
                  Bajadas de plancha
                  <HelpTooltip text={`Cantidad de pasadas por la plancha térmica. Las primeras ${settings.pressPassThreshold} están incluidas; cada bajada extra suma ${formatCurrency(settings.pressPassExtraCost)} por prenda.`} iconSize={12} />
                </Label>
                <span className="text-[11px] text-muted-foreground">Umbral incluido: {settings.pressPassThreshold}</span>
              </div>
              <Input
                id="pressPasses"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={pressPassesRaw}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, "");
                  setPressPassesRaw(val);
                }}
                onBlur={() => {
                  if (!pressPassesRaw || parseInt(pressPassesRaw) < 0) {
                    setPressPassesRaw("0");
                  }
                }}
                className="h-11 text-2xl font-black text-center md:w-28 md:flex-none"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex flex-col leading-tight">
                <p className="text-sm font-semibold text-foreground flex items-center gap-1">
                  ¿Lleva talle?
                  <HelpTooltip text={`Agrega un recargo de ${formatCurrency(settings.talleSurcharge)} por prenda cuando el diseño incluye número o letra de talle.`} iconSize={12} />
                </p>
                {talleActive && settings.talleSurcharge > 0 && (
                  <span className="text-[11px] text-primary font-medium">+{formatCurrency(settings.talleSurcharge)}/prenda</span>
                )}
              </div>
              <button
                onClick={() => setTalleActive(v => !v)}
                aria-label="Toggle talle"
                style={{
                  width: 51,
                  height: 31,
                  borderRadius: 999,
                  backgroundColor: talleActive ? "#f97316" : isDark ? "#374151" : "#d1d5db",
                  position: "relative",
                  border: "none",
                  cursor: "pointer",
                  transition: "background-color 0.25s ease",
                  flexShrink: 0,
                  marginLeft: 12,
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 2,
                    left: talleActive ? 22 : 2,
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
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <div className="w-2 h-6 bg-primary rounded-full"></div>
            Estampas a cotizar
            <HelpTooltip text="Ingresá ancho, largo y cantidad de cada diseño. Se distribuyen automáticamente en el rollo para calcular metros lineales." />
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
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: stampColor }}
                      />
                      <input
                        type="text"
                        value={stamp.title || ""}
                        onChange={(e) => updateStamp(stamp.id, "title", e.target.value)}
                        placeholder={`Estampa ${index + 1}`}
                        className="text-sm font-bold bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/60 w-full min-w-0"
                      />
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
                        {stamp.title || `Estampa ${index + 1}`}: {stamp.w}cm × {stamp.h}cm · {stamp.qty} unidad{stamp.qty !== 1 ? "es" : ""}
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

      </div>

      <div className="flex flex-col gap-6 md:w-[400px] md:shrink-0 md:sticky md:top-8 mt-8 md:mt-0">

      <div className="bg-gradient-to-br from-[#F97316] to-[#EA580C] rounded-[1.5rem] p-6 text-white shadow-xl shadow-orange-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-xl -ml-5 -mb-5 pointer-events-none"></div>

        <h3 className="font-display text-xl font-bold mb-4 opacity-90 flex items-center gap-2">Resumen de Costos <HelpTooltip text="El precio por prenda se calcula sumando material DTF + margen + bajadas extra + talle, redondeado a $100." iconSize={13} /></h3>

        <div className="space-y-1.5 mb-5 bg-black/10 rounded-xl px-3 py-2.5">
          {stamps.filter(s => s.w > 0 && s.h > 0 && s.qty > 0).map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 text-sm text-white">
              <span className="w-2 h-2 rounded-full bg-white/70 shrink-0"></span>
              <span className="font-medium">{s.title || `Estampa ${i + 1}`}: {s.qty} × {s.w}×{s.h}cm</span>
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
          {pressPasses > settings.pressPassThreshold && (
            <div className="flex justify-between items-center px-3 py-2.5 bg-black/10 border-b border-white/15">
              <span className="text-white/90 text-sm">Bajadas extra</span>
              <span className="font-bold text-white">+{formatCurrency(pressPassExtra)}/prenda</span>
            </div>
          )}
          {talleActive && settings.talleSurcharge > 0 && (
            <div className="flex justify-between items-center px-3 py-2.5 bg-black/10 border-b border-white/15">
              <span className="text-white/90 text-sm">Recargo talle</span>
              <span className="font-bold text-white">+{formatCurrency(settings.talleSurcharge)}/prenda</span>
            </div>
          )}
          <div className="bg-black/10">
            <button
              onClick={() => setShowBreakdown(v => !v)}
              className="w-full flex justify-between items-center px-3 py-2.5 hover:bg-white/5 transition-colors"
            >
              <span className="text-white/90 text-sm flex items-center gap-1">
                Precio por prenda estimado
                {showBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </span>
              <div className="text-right">
                <div className="font-bold text-white text-base">{formatCurrency(estimatedPricePerGarment)}</div>
                {showWholesale && (
                  <div className="text-white text-sm font-semibold bg-white/20 rounded-md px-2 py-0.5 mt-0.5">
                    Mayorista: {formatCurrency(estimatedPricePerGarmentWholesale)}
                  </div>
                )}
              </div>
            </button>

            <AnimatePresence>
              {showBreakdown && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-3 pb-3 space-y-1.5 text-xs">
                    <div className="h-px bg-white/15 mb-2" />
                    <div className="flex justify-between text-white/80">
                      <span>Costo DTF material</span>
                      <span>{formatCurrency(Math.round(dtfCostPerGarment))}</span>
                    </div>
                    <div className="flex justify-between text-white/80">
                      <span>Margen base{showWholesale ? " (común)" : ""}</span>
                      <span>+{formatCurrency(settings.baseMargin)}</span>
                    </div>
                    {showWholesale && (
                      <div className="flex justify-between text-white/80">
                        <span>Margen mayorista</span>
                        <span>+{formatCurrency(settings.wholesaleMargin)}</span>
                      </div>
                    )}
                    {pressPassExtra > 0 && (
                      <div className="flex justify-between text-white/80">
                        <span>Bajadas extra ({pressPasses - settings.pressPassThreshold} × {formatCurrency(settings.pressPassExtraCost)})</span>
                        <span>+{formatCurrency(pressPassExtra)}</span>
                      </div>
                    )}
                    {talleActive && settings.talleSurcharge > 0 && (
                      <div className="flex justify-between text-white/80">
                        <span>Recargo talle</span>
                        <span>+{formatCurrency(settings.talleSurcharge)}</span>
                      </div>
                    )}
                    <div className="h-px bg-white/15 mt-1 mb-1" />
                    <div className="flex justify-between text-white font-bold text-sm">
                      <span>Subtotal antes de redondeo</span>
                      <span>{formatCurrency(Math.round(dtfCostPerGarment + settings.baseMargin + pressPassExtra + talleSurchargeAmount))}</span>
                    </div>
                    <div className="flex justify-between text-white font-bold text-sm">
                      <span>Redondeado a $100 →</span>
                      <span>{formatCurrency(pricePerGarment)}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {showWholesale ? (
          <div className="space-y-2">
            <div className="bg-white/15 rounded-xl p-4 flex justify-between items-end">
              <span className="text-xs font-bold text-white/70 tracking-widest uppercase">TOTAL COMÚN</span>
              <span className="text-2xl font-display font-black text-white">
                {formatCurrency(estimatedTotalOrder)}
              </span>
            </div>
            <div className="bg-white text-foreground rounded-xl p-4 flex justify-between items-end shadow-inner">
              <span className="text-xs font-bold text-muted-foreground tracking-widest uppercase">TOTAL MAYORISTA</span>
              <span className="text-2xl font-display font-black text-primary">
                {formatCurrency(estimatedTotalOrderWholesale)}
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-white text-foreground rounded-xl p-4 flex justify-between items-end shadow-inner">
            <span className="text-sm font-bold text-muted-foreground tracking-widest uppercase">TOTAL PEDIDO</span>
            <span className="text-3xl font-display font-black text-primary">
              {formatCurrency(estimatedTotalOrder)}
            </span>
          </div>
        )}
      </div>

      <div className="bg-card/60 backdrop-blur rounded-2xl border border-border overflow-hidden">
        <button
          onClick={() => setShowMathExplanation(v => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/5 transition-colors"
        >
          <span className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Info className="w-4 h-4 text-primary" />
            ¿Cómo se calcula el precio?
          </span>
          {showMathExplanation ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        <AnimatePresence>
          {showMathExplanation && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 text-sm text-muted-foreground space-y-3 border-t border-border pt-4">
                <div>
                  <p className="font-bold text-foreground text-xs uppercase tracking-wider mb-1">1. Costo del material</p>
                  <p>Se calcula cuántos metros lineales de rollo DTF se usan según las estampas ingresadas. Este valor se multiplica por el precio por metro ({formatCurrency(settings.pricePerMeter)}).</p>
                  <p className="mt-1 text-xs bg-secondary/50 rounded-lg px-3 py-1.5 font-mono">
                    Costo DTF = {linearMeters.toFixed(3)} m × {formatCurrency(settings.pricePerMeter)} = {formatCurrency(Math.round(rawCost))}
                  </p>
                </div>

                <div>
                  <p className="font-bold text-foreground text-xs uppercase tracking-wider mb-1">2. Costo por prenda</p>
                  <p>El costo total del material se divide entre la cantidad de prendas ({garments}).</p>
                  <p className="mt-1 text-xs bg-secondary/50 rounded-lg px-3 py-1.5 font-mono">
                    Costo/prenda = {formatCurrency(Math.round(rawCost))} ÷ {garments} = {formatCurrency(Math.round(dtfCostPerGarment))}
                  </p>
                </div>

                <div>
                  <p className="font-bold text-foreground text-xs uppercase tracking-wider mb-1">3. Margen de ganancia</p>
                  <p>Se suma el margen configurado: {formatCurrency(settings.baseMargin)} (común){showWholesale ? ` o ${formatCurrency(settings.wholesaleMargin)} (mayorista)` : ""}.</p>
                </div>

                {(settings.pressPassThreshold > 0) && (
                  <div>
                    <p className="font-bold text-foreground text-xs uppercase tracking-wider mb-1">4. Bajadas de plancha</p>
                    <p>Las primeras {settings.pressPassThreshold} bajadas están incluidas. Cada bajada adicional suma {formatCurrency(settings.pressPassExtraCost)} al precio por prenda.</p>
                    {pressPassExtra > 0 && (
                      <p className="mt-1 text-xs bg-secondary/50 rounded-lg px-3 py-1.5 font-mono">
                        Extra = ({pressPasses} - {settings.pressPassThreshold}) × {formatCurrency(settings.pressPassExtraCost)} = {formatCurrency(pressPassExtra)}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <p className="font-bold text-foreground text-xs uppercase tracking-wider mb-1">{settings.pressPassThreshold > 0 ? "5" : "4"}. Recargo por talle</p>
                  <p>Si el diseño lleva talle (número o letra), se suma {formatCurrency(settings.talleSurcharge)} por prenda.{!talleActive ? " (No activado)" : ""}</p>
                </div>

                <div>
                  <p className="font-bold text-foreground text-xs uppercase tracking-wider mb-1">Fórmula final</p>
                  <div className="text-xs bg-primary/10 rounded-lg px-3 py-2 font-mono text-primary border border-primary/20">
                    <p>Precio/prenda = redondear_arriba(</p>
                    <p className="pl-4">costo_DTF + margen + bajadas_extra + talle</p>
                    <p>, a $100)</p>
                    <p className="mt-1 text-foreground/70">Total pedido = precio/prenda × prendas</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="hidden md:grid grid-cols-3 gap-2">
        <button
          onClick={handleSave}
          disabled={packedResult.errors.length > 0 || pricingBusy}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(135deg, rgba(249,115,22,0.92) 0%, rgba(234,88,12,0.95) 100%)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            boxShadow: "0 4px 12px rgba(249,115,22,0.35), 0 1px 0 rgba(255,255,255,0.25) inset",
            border: "1px solid rgba(255,255,255,0.22)",
          }}
        >
          <Save className="w-4 h-4 text-white shrink-0" />
          <span className="text-white font-bold text-sm">Guardar Cotización</span>
        </button>
        <button
          onClick={() => void handleCreateOrderDraft()}
          disabled={packedResult.errors.length > 0 || pricingBusy}
          className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(135deg, rgba(59,130,246,0.92) 0%, rgba(37,99,235,0.95) 100%)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            boxShadow: "0 4px 12px rgba(59,130,246,0.28), 0 1px 0 rgba(255,255,255,0.25) inset",
            border: "1px solid rgba(255,255,255,0.22)",
          }}
        >
          <ClipboardList className="w-4 h-4 text-white shrink-0" />
          <span className="text-white font-bold text-sm">Crear Pedido</span>
        </button>
        <button
          onClick={handleShareWhatsApp}
          disabled={packedResult.errors.length > 0 || pricingBusy}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(135deg, rgba(37,211,102,0.92) 0%, rgba(18,183,80,0.95) 100%)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            boxShadow: "0 4px 12px rgba(37,211,102,0.35), 0 1px 0 rgba(255,255,255,0.25) inset",
            border: "1px solid rgba(255,255,255,0.22)",
          }}
        >
          <MessageCircle className="w-4 h-4 text-white shrink-0" />
          <span className="text-white font-bold text-sm">Enviar por WhatsApp</span>
        </button>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <div className="w-2 h-6 bg-primary rounded-full"></div>
          Vista Previa del Rollo
          <HelpTooltip text="Representación visual de cómo se distribuyen las estampas en el rollo. Cada color corresponde a un diseño diferente." />
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

      <div className="grid grid-cols-3 gap-3 mt-4 md:hidden">
        <button
          onClick={handleSave}
          disabled={packedResult.errors.length > 0 || pricingBusy}
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

        <button
          onClick={() => void handleCreateOrderDraft()}
          disabled={packedResult.errors.length > 0 || pricingBusy}
          className="flex-1 flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(135deg, rgba(59,130,246,0.92) 0%, rgba(37,99,235,0.95) 100%)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            boxShadow: "0 8px 24px rgba(59,130,246,0.28), 0 1px 0 rgba(255,255,255,0.25) inset",
            border: "1px solid rgba(255,255,255,0.22)",
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.18)" }}
          >
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-sm leading-tight text-center">
            Crear<br />Pedido
          </span>
        </button>

        <button
          onClick={handleShareWhatsApp}
          disabled={packedResult.errors.length > 0 || pricingBusy}
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

      </div>
      </div>

      <UpgradePrompt
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        feature="cotizaciones"
      />

    </div>
  );
}
