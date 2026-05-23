import { useState } from "react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { FileText, Trash2, Calculator, MessageCircle, User } from "lucide-react";
import { useDTFQuotes, type Quote } from "@/hooks/use-dtf-store";
import { useBusinessSettings } from "@/hooks/use-business-settings";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

function buildWhatsAppMessage(quote: Quote, businessName?: string, signature?: string): string {
  const brand = businessName?.trim() || "YAGUAR ESTUDIO";
  const footer = signature?.trim() || `_Cotizado con ${brand}_`;
  const stampLines = quote.stamps
    .filter((s) => s.w > 0 && s.h > 0 && s.qty > 0)
    .map((s, i) => `• ${s.title || `Estampa ${i + 1}`}: ${s.w}cm × ${s.h}cm × ${s.qty} unid`)
    .join("\n");

  const date = format(new Date(quote.createdAt), "d 'de' MMMM, yyyy", { locale: es });
  let msg = `*Cotización DTF - ${brand}*\n`;
  msg += `━━━━━━━━━━━━━━━━━━\n`;
  if (quote.clientName) msg += `👤 Cliente: ${quote.clientName}\n`;
  if (quote.orderName) msg += `📦 Pedido: ${quote.orderName}\n`;
  msg += `📅 Fecha: ${date}\n\n`;
  msg += `*Estampas:*\n${stampLines}\n\n`;
  msg += `━━━━━━━━━━━━━━━━━━\n`;
  msg += `📏 Metros usados: ${quote.linearMeters.toFixed(2)} m\n`;
  if (quote.garmentsCount) msg += `👕 Prendas: ${quote.garmentsCount} unid\n`;
  if (quote.pricePerGarment) msg += `💰 Precio por prenda: ${formatCurrency(quote.pricePerGarment)}\n`;
  msg += `\n*TOTAL PEDIDO: ${formatCurrency(quote.totalPrice)}*\n`;
  msg += `\n${footer}`;
  return msg;
}

export function HistoryPage() {
  const { quotes, deleteQuote } = useDTFQuotes();
  const { settings: biz } = useBusinessSettings();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [confirmDelete, setConfirmDelete] = useState<Quote | null>(null);

  function shareWhatsApp(quote: Quote) {
    const url = `https://wa.me/?text=${encodeURIComponent(buildWhatsAppMessage(quote, biz.businessName, biz.signature))}`;
    window.open(url, "_blank");
  }

  function handleDelete() {
    if (!confirmDelete) return;
    deleteQuote(confirmDelete.id);
    toast({ title: "Cotización eliminada" });
    setConfirmDelete(null);
  }

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-6 flex flex-col gap-6 pb-12 max-w-5xl">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl text-foreground font-display font-bold flex items-center gap-2">
            <FileText className="w-7 h-7 text-primary" /> Historial de cotizaciones
          </h1>
          <p className="text-muted-foreground mt-1 font-medium">
            Las cotizaciones DTF que generaste y guardaste.
          </p>
        </div>
        <Button onClick={() => setLocation("/app")} size="lg" className="rounded-2xl">
          <Calculator className="w-4 h-4 mr-2" /> Nueva cotización
        </Button>
      </header>

      {quotes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
            <h3 className="text-lg font-bold mb-1">Aún no guardaste cotizaciones</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              Generá una cotización en el cotizador DTF y guardala para verla acá.
            </p>
            <Button onClick={() => setLocation("/app")}>
              <Calculator className="w-4 h-4 mr-2" /> Ir al cotizador
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {quotes.map((quote) => (
            <Card key={quote.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row gap-3 sm:items-start">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-base">
                        {quote.orderName || quote.clientName || "Cotización"}
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(quote.createdAt), "d MMM yyyy · HH:mm", { locale: es })}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                      {quote.clientName ? (
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" /> {quote.clientName}
                        </span>
                      ) : null}
                      <span>
                        {quote.garmentsCount ?? "?"} prendas · {quote.linearMeters.toFixed(2)} m DTF
                      </span>
                      {quote.stamps?.length ? (
                        <span>
                          {quote.stamps.length} {quote.stamps.length === 1 ? "estampa" : "estampas"}
                        </span>
                      ) : null}
                    </div>

                    {quote.notes ? (
                      <p className="text-xs text-muted-foreground line-clamp-2">{quote.notes}</p>
                    ) : null}
                  </div>

                  <div className="flex sm:flex-col sm:items-end gap-2 sm:gap-1 sm:text-right">
                    <div className="flex-1 sm:flex-initial">
                      <div className="text-lg font-display font-bold">
                        {formatCurrency(quote.totalPrice)}
                      </div>
                      {quote.pricePerGarment ? (
                        <div className="text-xs text-muted-foreground">
                          {formatCurrency(quote.pricePerGarment)}/prenda
                        </div>
                      ) : null}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => shareWhatsApp(quote)}
                        className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-emerald-400 transition-colors"
                        title="Compartir por WhatsApp"
                        aria-label="Compartir por WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(quote)}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        aria-label="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cotización?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
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
