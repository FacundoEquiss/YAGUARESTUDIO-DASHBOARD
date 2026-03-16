import React, { useState, useEffect } from "react";
import { Settings, Save } from "lucide-react";
import { useDTFSettings } from "@/hooks/use-dtf-store";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export function SettingsPage() {
  const { settings, setSettings } = useDTFSettings();
  const { toast } = useToast();
  
  // Local state for the form
  const [price, setPrice] = useState(settings.pricePerMeter.toString());
  const [width, setWidth] = useState(settings.rollWidth.toString());

  // Sync if global settings change elsewhere (unlikely in this app, but good practice)
  useEffect(() => {
    setPrice(settings.pricePerMeter.toString());
    setWidth(settings.rollWidth.toString());
  }, [settings]);

  const handleSave = () => {
    const numPrice = parseInt(price);
    const numWidth = parseInt(width);

    if (isNaN(numPrice) || numPrice <= 0) {
      toast({ title: "Error", description: "El precio debe ser un número válido.", variant: "destructive" });
      return;
    }
    if (isNaN(numWidth) || numWidth < 20 || numWidth > 120) {
      toast({ title: "Error", description: "El ancho debe estar entre 20cm y 120cm.", variant: "destructive" });
      return;
    }

    setSettings({
      pricePerMeter: numPrice,
      rollWidth: numWidth
    });

    toast({
      title: "Configuración guardada",
      description: "Los valores se aplicarán a las nuevas cotizaciones.",
    });
  };

  return (
    <div className="px-5 py-8 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-foreground font-display font-bold">Ajustes</h1>
          <p className="text-muted-foreground mt-1 font-medium">Configura el cotizador</p>
        </div>
        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
          <Settings className="w-6 h-6 text-primary" />
        </div>
      </div>

      <Card className="border-none shadow-md bg-card">
        <CardContent className="p-6 space-y-6">
          
          <div className="space-y-2">
            <Label htmlFor="price" className="text-base font-bold flex items-center justify-between">
              Precio por Metro Lineal
              <span className="text-xs font-normal bg-orange-100 text-orange-800 px-2 py-1 rounded text-right">CLP ($)</span>
            </Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-lg">$</span>
              <Input 
                id="price" 
                type="number" 
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="pl-9 font-bold text-lg h-14"
              />
            </div>
            <p className="text-sm text-muted-foreground">El valor a cobrar por cada 1 metro de material utilizado.</p>
          </div>

          <div className="w-full h-px bg-border"></div>

          <div className="space-y-2">
            <Label htmlFor="width" className="text-base font-bold flex items-center justify-between">
              Ancho del Rollo
              <span className="text-xs font-normal bg-secondary px-2 py-1 rounded text-right">Centímetros (cm)</span>
            </Label>
            <div className="relative">
              <Input 
                id="width" 
                type="number" 
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                className="pr-12 font-bold text-lg h-14"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">cm</span>
            </div>
            <p className="text-sm text-muted-foreground">Ancho físico del rollo DTF (estándar: 58cm o 60cm).</p>
          </div>

        </CardContent>
      </Card>

      <Button size="lg" className="w-full rounded-2xl mt-4" onClick={handleSave}>
        <Save className="w-5 h-5 mr-2" />
        Guardar Ajustes
      </Button>
    </div>
  );
}
