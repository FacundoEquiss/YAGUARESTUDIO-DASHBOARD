import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

const TELEGRAM_LINK = "https://t.me/+IhEEsOPYZ-MzZDYx";
const INSTAGRAM_LINK = "https://www.instagram.com/yaguar.estudio";
const WHATSAPP_LINK = "https://wa.me/1122811911";

export function SupportPage() {
  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8 max-w-5xl mx-auto space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Centro de Ayuda</h1>
        <p className="text-muted-foreground mt-2">
          Respuestas a preguntas frecuentes y canales para contactarnos.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Preguntas Frecuentes</h2>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>Como funciona el cotizador DTF?</AccordionTrigger>
              <AccordionContent>
                Ingresa el ancho y alto de cada estampa, la cantidad de prendas y el sistema calcula automaticamente
                metros lineales de rollo, costo de material, margen y precio por prenda redondeado a $100.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>Donde se guardan mis datos?</AccordionTrigger>
              <AccordionContent>
                Tus clientes, pedidos, productos, finanzas y configuración se guardan de forma privada en tu
                cuenta (en la nube) y los podés ver desde cualquier dispositivo iniciando sesión. Solo vos
                tenés acceso a tus datos.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>La aplicacion tiene costo?</AccordionTrigger>
              <AccordionContent>
                No. La app es 100% gratis para emprendedores textiles. Sin limites de uso ni planes pagos.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Contactanos</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Escribinos por el canal que mas te convenga.
          </p>
          <div className="space-y-3">
            <Button asChild className="w-full justify-start" variant="outline">
              <a href={TELEGRAM_LINK} target="_blank" rel="noopener noreferrer">
                <Send className="w-4 h-4 mr-2 text-[#229ED9]" />
                Comunidad en Telegram
              </a>
            </Button>
            <Button asChild className="w-full justify-start" variant="outline">
              <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
            </Button>
            <Button asChild className="w-full justify-start" variant="outline">
              <a href={INSTAGRAM_LINK} target="_blank" rel="noopener noreferrer">
                Instagram
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
