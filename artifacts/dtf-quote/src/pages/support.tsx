import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function SupportPage() {
  return (
    <div className="flex-1 w-full max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Centro de Ayuda</h1>
        <p className="text-muted-foreground mt-2">
          Encuentra respuestas a preguntas frecuentes o contáctanos directamente.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Preguntas Frecuentes */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Preguntas Frecuentes</h2>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>¿Cómo funciona la cotización DTF?</AccordionTrigger>
              <AccordionContent>
                En nuestra calculadora, puedes subir imágenes, introducir el ancho y largo de tu pliego, y el sistema automáticamente calculará el costo considerando el material, mermas y pasadas de plancha.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>¿Qué formatos de imagen soporta?</AccordionTrigger>
              <AccordionContent>
                Soportamos formatos PNG, JPG y WebP. Recomendamos PNG con fondo transparente para las prendas oscuras.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>¿Cómo actualizo mis datos de facturación?</AccordionTrigger>
              <AccordionContent>
                Puedes desde la pestaña Configuración añadir o remover medios de pago. La plataforma procesa las suscripciones a través de Mercado Pago.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4">
              <AccordionTrigger>Tengo un error al usar la función de quitar fondos.</AccordionTrigger>
              <AccordionContent>
                Esta función consume muchos recursos, comprueba que tu imagen no supere los 10MB y tu conexión a internet sea estable.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Formulario de Contacto Directo */}
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-6">Contáctanos</h2>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              alert("Consulta enviada (simulación). Nos contactaremos a la brevedad.");
            }}
          >
            <div className="space-y-2">
              <label className="text-sm font-medium">Asunto</label>
              <Input placeholder="Ej: Error en pago" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email de contacto</label>
              <Input type="email" placeholder="tu@correo.com" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Mensaje</label>
              <Textarea
                placeholder="¿En qué podemos ayudarte?"
                className="min-h-[120px] resize-none"
                required
              />
            </div>
            <Button type="submit" className="w-full">
              Enviar Mensaje
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
