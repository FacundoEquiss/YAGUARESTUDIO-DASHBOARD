import React, { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Trash2, FileText, ChevronRight } from "lucide-react";
import { useDTFQuotes, Quote } from "@/hooks/use-dtf-store";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { RollVisualizer } from "@/components/roll-visualizer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";

export function HistoryPage() {
  const { quotes, deleteQuote } = useDTFQuotes();
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);

  return (
    <div className="px-5 py-8 flex flex-col gap-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-foreground font-display font-bold">Historial</h1>
          <p className="text-muted-foreground mt-1 font-medium">Tus cotizaciones guardadas</p>
        </div>
        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
          <FileText className="w-6 h-6 text-primary" />
        </div>
      </div>

      {quotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center mt-20 p-8 border-2 border-dashed border-border rounded-3xl bg-white/50">
          <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mb-4">
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
                className="bg-white rounded-2xl p-4 shadow-sm border border-border cursor-pointer hover:shadow-md transition-all group flex items-stretch"
                onClick={() => setSelectedQuote(quote)}
              >
                <div className="flex-1 pr-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-foreground line-clamp-1">{quote.clientName}</h3>
                    <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-1 rounded-md shrink-0 ml-2">
                      {format(quote.createdAt, "d MMM, yy", { locale: es })}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="text-xs font-medium bg-orange-50 text-orange-700 px-2 py-1 rounded-md border border-orange-100">
                      {quote.linearMeters.toFixed(2)} m
                    </span>
                    <span className="text-xs font-medium bg-muted text-muted-foreground px-2 py-1 rounded-md">
                      {quote.stamps.reduce((acc, s) => acc + s.qty, 0)} ítems
                    </span>
                  </div>

                  <div className="text-xl font-display font-black text-primary">
                    {formatCurrency(quote.totalPrice)}
                  </div>
                </div>

                <div className="w-12 border-l border-border flex flex-col justify-center items-center gap-4">
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Quote Details Modal */}
      <Dialog open={!!selectedQuote} onOpenChange={(open) => !open && setSelectedQuote(null)}>
        {selectedQuote && (
          <DialogContent className="max-w-md w-[95vw] rounded-3xl p-0 overflow-hidden bg-background">
            <div className="p-6 pb-4 bg-gradient-to-b from-orange-50 to-background">
              <DialogHeader className="mb-4">
                <DialogTitle className="text-2xl font-display flex justify-between items-start">
                  <span>{selectedQuote.clientName}</span>
                  <div className="text-right">
                    <div className="text-xs font-sans text-muted-foreground font-normal">Total</div>
                    <div className="text-primary">{formatCurrency(selectedQuote.totalPrice)}</div>
                  </div>
                </DialogTitle>
              </DialogHeader>

              {selectedQuote.notes && (
                <div className="bg-white p-3 rounded-xl border border-border text-sm text-foreground/80 mb-4 shadow-sm italic">
                  "{selectedQuote.notes}"
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-white p-3 rounded-xl border border-border shadow-sm">
                  <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Material</div>
                  <div className="font-bold">{selectedQuote.linearMeters.toFixed(3)} m</div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-border shadow-sm">
                  <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Fecha</div>
                  <div className="font-bold">{format(selectedQuote.createdAt, "dd/MM/yyyy")}</div>
                </div>
              </div>

              <h4 className="font-bold mb-3 flex items-center gap-2">
                <div className="w-2 h-5 bg-primary rounded-full"></div>
                Vista Previa
              </h4>
              <RollVisualizer 
                rollWidth={selectedQuote.rollWidth || 58}
                totalHeight={selectedQuote.totalHeight}
                placements={selectedQuote.placements}
                className="shadow-sm"
              />
            </div>
            
            <div className="p-4 border-t border-border bg-white flex justify-between gap-3">
              <Button 
                variant="destructive" 
                className="flex-1"
                onClick={() => {
                  deleteQuote(selectedQuote.id);
                  setSelectedQuote(null);
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Eliminar
              </Button>
              <Button 
                variant="default" 
                className="flex-1"
                onClick={() => setSelectedQuote(null)}
              >
                Cerrar
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
