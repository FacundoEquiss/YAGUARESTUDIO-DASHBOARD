import React, { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Trash2, FileText, ChevronRight, MessageCircle, X, Package, Ruler, Shirt, Tag } from "lucide-react";
import { HelpTooltip } from "@/components/help-tooltip";
import { useDTFQuotes, Quote } from "@/hooks/use-dtf-store";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { RollVisualizer } from "@/components/roll-visualizer";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { STAMP_COLORS } from "@/lib/skyline";

function buildWhatsAppMessage(q: Quote): string {
  const date = format(q.createdAt, "d 'de' MMMM, yyyy", { locale: es });
  const stampLines = q.stamps
    .map((s, i) => {
      const title = s.title || `Estampa ${i + 1}`;
      return `• ${title}: ${s.w}cm × ${s.h}cm × ${s.qty} unid`;
    })
    .join("\n");

  let msg = `*Cotización DTF - YAGUAR ESTUDIO*\n`;
  msg += `━━━━━━━━━━━━━━━━━━\n`;
  msg += `👤 Cliente: ${q.clientName}\n`;
  if (q.orderName) msg += `📦 Pedido: ${q.orderName}\n`;
  msg += `📅 Fecha: ${date}\n\n`;
  msg += `*Estampas:*\n${stampLines}\n\n`;
  msg += `━━━━━━━━━━━━━━━━━━\n`;
  msg += `📏 Metros usados: ${q.linearMeters.toFixed(2)} m\n`;
  if (q.garmentsCount) msg += `👕 Prendas: ${q.garmentsCount} unid\n`;
  if (q.pressPasses && q.pressPasses > 0) msg += `🔥 Bajadas de plancha: ${q.pressPasses}\n`;
  if (q.talleEnabled) msg += `📐 Incluye talle: Sí\n`;
  if (q.pricePerGarment) msg += `💰 Precio por prenda: ${formatCurrency(q.pricePerGarment)}\n`;
  msg += `\n*TOTAL PEDIDO: ${formatCurrency(q.totalPrice)}*\n`;
  msg += `\n_Cotizado con Cotizador DTF by YAGUAR ESTUDIO_`;
  return msg;
}

function shareWhatsApp(q: Quote) {
  const text = buildWhatsAppMessage(q);
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
}

export function HistoryPage() {
  const { currentUser } = useAuth();
  const { quotes, deleteQuote } = useDTFQuotes(currentUser?.id || "guest");
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-6 flex flex-col gap-6 pb-12 md:max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-foreground font-display font-bold flex items-center gap-2">Historial <HelpTooltip text="Todas las cotizaciones DTF que guardaste. Podés reenviarlas por WhatsApp o eliminarlas." /></h1>
          <p className="text-muted-foreground mt-1 font-medium">Tus cotizaciones guardadas</p>
        </div>
        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
          <FileText className="w-6 h-6 text-primary" />
        </div>
      </div>

      {quotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center mt-20 p-8 border-2 border-dashed border-border rounded-3xl bg-card/50">
          <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-primary opacity-50" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">No hay cotizaciones</h3>
          <p className="text-muted-foreground">Las cotizaciones que guardes aparecerán aquí.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {quotes.map((quote) => (
              <motion.div
                key={quote.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-card rounded-2xl shadow-sm border border-border cursor-pointer hover:shadow-md transition-all group overflow-hidden"
                onClick={() => { setSelectedQuote(quote); setConfirmDelete(false); }}
              >
                <div className="flex items-stretch">
                  <div className="w-1 bg-primary shrink-0" />
                  <div className="flex-1 p-4 pr-3">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base text-foreground truncate">{quote.clientName}</h3>
                        {quote.orderName && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{quote.orderName}</p>
                        )}
                      </div>
                      <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-1 rounded-lg shrink-0">
                        {format(quote.createdAt, "d MMM, yy", { locale: es })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-xs font-semibold bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-md">
                          {quote.linearMeters.toFixed(2)} m
                        </span>
                        <span className="text-xs font-semibold bg-secondary text-muted-foreground px-2 py-0.5 rounded-md">
                          {quote.stamps.reduce((acc, s) => acc + s.qty, 0)} ítems
                        </span>
                        {quote.garmentsCount && (
                          <span className="text-xs font-semibold bg-secondary text-muted-foreground px-2 py-0.5 rounded-md">
                            {quote.garmentsCount} prendas
                          </span>
                        )}
                      </div>
                      <span className="text-lg font-display font-black text-primary ml-2 shrink-0">
                        {formatCurrency(quote.totalPrice)}
                      </span>
                    </div>
                  </div>
                  <div className="w-10 flex items-center justify-center border-l border-border">
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Quote Details Modal */}
      <Dialog open={!!selectedQuote} onOpenChange={(open) => !open && setSelectedQuote(null)}>
        {selectedQuote && (
          <DialogContent className="max-w-md w-[95vw] rounded-3xl p-0 overflow-hidden bg-background max-h-[92dvh] flex flex-col">

            {/* Sticky Header */}
            <div className="bg-gradient-to-br from-primary to-orange-600 px-5 pt-5 pb-5 text-white shrink-0">
              <div className="flex justify-between items-start mb-1">
                <div className="flex-1 min-w-0 pr-3">
                  <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-1">Cliente</p>
                  <h2 className="text-xl font-display font-bold leading-tight truncate">{selectedQuote.clientName}</h2>
                  {selectedQuote.orderName && (
                    <p className="text-white/80 text-sm mt-0.5 truncate">{selectedQuote.orderName}</p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedQuote(null)}
                  className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors shrink-0 mt-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-end justify-between mt-3 pt-3 border-t border-white/20">
                <div>
                  <p className="text-white/70 text-xs">Fecha</p>
                  <p className="font-semibold text-sm">{format(selectedQuote.createdAt, "d 'de' MMMM, yyyy", { locale: es })}</p>
                </div>
                <div className="text-right">
                  <p className="text-white/70 text-xs">Total Pedido</p>
                  <p className="text-2xl font-display font-black">{formatCurrency(selectedQuote.totalPrice)}</p>
                </div>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1 p-5 space-y-5">

              {selectedQuote.notes && (
                <div className="bg-secondary/60 rounded-2xl p-4 text-sm text-foreground italic border border-border">
                  "{selectedQuote.notes}"
                </div>
              )}

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-card rounded-2xl p-3 border border-border text-center">
                  <Ruler className="w-4 h-4 text-primary mx-auto mb-1" />
                  <p className="text-lg font-display font-black text-foreground">{selectedQuote.linearMeters.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground font-medium">metros</p>
                </div>
                <div className="bg-card rounded-2xl p-3 border border-border text-center">
                  <Shirt className="w-4 h-4 text-primary mx-auto mb-1" />
                  <p className="text-lg font-display font-black text-foreground">{selectedQuote.garmentsCount || "—"}</p>
                  <p className="text-xs text-muted-foreground font-medium">prendas</p>
                </div>
                <div className="bg-card rounded-2xl p-3 border border-border text-center">
                  <Tag className="w-4 h-4 text-primary mx-auto mb-1" />
                  <p className="text-base font-display font-black text-foreground leading-tight">
                    {selectedQuote.pricePerGarment ? formatCurrency(selectedQuote.pricePerGarment) : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground font-medium">c/prenda</p>
                </div>
              </div>

              {/* Stamps list */}
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" />
                  Estampas
                </p>
                <div className="space-y-2">
                  {selectedQuote.stamps.map((stamp, i) => {
                    const color = STAMP_COLORS[i % STAMP_COLORS.length];
                    return (
                      <div
                        key={`${stamp.w}-${stamp.h}-${i}`}
                        className="flex items-center justify-between bg-card rounded-xl px-4 py-3 border border-border"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="font-semibold text-sm text-foreground">
                            {stamp.title || `Estampa ${i + 1}`}: {stamp.w}cm × {stamp.h}cm
                          </span>
                        </div>
                        <span
                          className="text-xs font-bold px-2.5 py-1 rounded-full text-white"
                          style={{ backgroundColor: color }}
                        >
                          × {stamp.qty}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Roll preview */}
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Vista del Rollo</p>
                <RollVisualizer
                  rollWidth={selectedQuote.rollWidth || 58}
                  totalHeight={selectedQuote.totalHeight}
                  placements={selectedQuote.placements}
                  className="shadow-sm"
                />
              </div>

            </div>

            {/* Action buttons - sticky footer */}
            <div className="border-t border-border bg-card px-4 py-4 flex gap-3 shrink-0">
              {!confirmDelete ? (
                <>
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl border-red-200 dark:border-red-900 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600"
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-1.5" /> Eliminar
                  </Button>
                  <Button
                    className="flex-1 rounded-xl bg-[#25D366] hover:bg-[#1ebe5a] text-white"
                    onClick={() => shareWhatsApp(selectedQuote)}
                  >
                    <MessageCircle className="w-4 h-4 mr-1.5" /> WhatsApp
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1 rounded-xl"
                    onClick={() => {
                      deleteQuote(selectedQuote.id);
                      setSelectedQuote(null);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-1.5" /> Confirmar
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
