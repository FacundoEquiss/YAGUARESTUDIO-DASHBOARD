import React, { useState, useEffect } from "react";
import { Settings, Save, LogOut, User, ShieldCheck } from "lucide-react";
import { HelpTooltip } from "@/components/help-tooltip";
import { useDTFSettings } from "@/hooks/use-dtf-store";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

export function SettingsPage() {
  const { settings, setSettings } = useDTFSettings();
  const { currentUser, logout } = useAuth();
  const { toast } = useToast();
  const { isDark } = useTheme();

  const [price, setPrice] = useState(settings.pricePerMeter.toString());
  const [width, setWidth] = useState(settings.rollWidth.toString());
  const [baseMargin, setBaseMargin] = useState(settings.baseMargin.toString());
  const [wholesaleMargin, setWholesaleMargin] = useState(settings.wholesaleMargin.toString());
  const [pressPassThreshold, setPressPassThreshold] = useState(settings.pressPassThreshold.toString());
  const [pressPassExtraCost, setPressPassExtraCost] = useState(settings.pressPassExtraCost.toString());
  const [talleEnabled, setTalleEnabled] = useState(settings.talleEnabled);
  const [talleSurcharge, setTalleSurcharge] = useState(settings.talleSurcharge.toString());

  useEffect(() => {
    setPrice(settings.pricePerMeter.toString());
    setWidth(settings.rollWidth.toString());
    setBaseMargin(settings.baseMargin.toString());
    setWholesaleMargin(settings.wholesaleMargin.toString());
    setPressPassThreshold(settings.pressPassThreshold.toString());
    setPressPassExtraCost(settings.pressPassExtraCost.toString());
    setTalleEnabled(settings.talleEnabled);
    setTalleSurcharge(settings.talleSurcharge.toString());
  }, [settings]);

  const handleSave = () => {
    const numPrice = parseInt(price);
    const numWidth = parseFloat(width);
    const numBaseMargin = parseInt(baseMargin);
    const numWholesaleMargin = parseInt(wholesaleMargin);
    const numPressPassThreshold = parseInt(pressPassThreshold);
    const numPressPassExtraCost = parseInt(pressPassExtraCost);
    const numTalleSurcharge = parseInt(talleSurcharge);

    if (isNaN(numPrice) || numPrice <= 0) {
      toast({ title: "Error", description: "El precio por metro debe ser un número válido mayor a 0.", variant: "destructive" });
      return;
    }
    if (isNaN(numWidth) || numWidth < 20 || numWidth > 120) {
      toast({ title: "Error", description: "El ancho del rollo debe estar entre 20cm y 120cm.", variant: "destructive" });
      return;
    }
    if (isNaN(numBaseMargin) || numBaseMargin < 0) {
      toast({ title: "Error", description: "El margen base debe ser 0 o mayor.", variant: "destructive" });
      return;
    }
    if (isNaN(numWholesaleMargin) || numWholesaleMargin < 0) {
      toast({ title: "Error", description: "El margen mayorista debe ser 0 o mayor.", variant: "destructive" });
      return;
    }
    if (isNaN(numPressPassThreshold) || numPressPassThreshold < 1) {
      toast({ title: "Error", description: "El umbral de bajadas debe ser al menos 1.", variant: "destructive" });
      return;
    }
    if (isNaN(numPressPassExtraCost) || numPressPassExtraCost < 0) {
      toast({ title: "Error", description: "El costo extra por bajada debe ser 0 o mayor.", variant: "destructive" });
      return;
    }
    if (isNaN(numTalleSurcharge) || numTalleSurcharge < 0) {
      toast({ title: "Error", description: "El recargo por talle debe ser 0 o mayor.", variant: "destructive" });
      return;
    }

    setSettings({
      pricePerMeter: numPrice,
      rollWidth: numWidth,
      baseMargin: numBaseMargin,
      wholesaleMargin: numWholesaleMargin,
      pressPassThreshold: numPressPassThreshold,
      pressPassExtraCost: numPressPassExtraCost,
      talleEnabled,
      talleSurcharge: numTalleSurcharge,
    });
    toast({
      title: "Configuración guardada",
      description: "Los valores se aplicarán a las nuevas cotizaciones.",
    });
  };

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-6 flex flex-col gap-6 pb-12 md:max-w-lg">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-foreground font-display font-bold flex items-center gap-2">Ajustes <HelpTooltip text="Configurá los parámetros de tu cotizador DTF: precios, márgenes, bajadas de plancha y recargo por talle." /></h1>
          <p className="text-muted-foreground mt-1 font-medium">Configurá tu cotizador</p>
        </div>
        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
          <Settings className="w-6 h-6 text-primary" />
        </div>
      </div>

      <Card className="border-none shadow-md bg-card overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary to-orange-400" />
        <CardContent className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-foreground truncate">{currentUser?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{currentUser?.email}</p>
            {currentUser?.role === "master" && (
              <span className="inline-flex items-center gap-1 mt-1 text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                <ShieldCheck className="w-3 h-3" /> Administrador
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="shrink-0 text-muted-foreground hover:text-destructive"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>

      <Card className="border-none shadow-md bg-card">
        <CardContent className="p-6 space-y-6">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            Material y Rollo
            <HelpTooltip text="Precio del material DTF por metro lineal y ancho físico de tu rollo." iconSize={13} />
          </h3>

          <div className="space-y-2">
            <Label htmlFor="price" className="text-sm font-bold flex items-center justify-between">
              Precio por Metro Lineal
              <span className="text-xs font-normal bg-orange-100 dark:bg-orange-950/40 text-orange-800 dark:text-orange-400 px-2 py-1 rounded">CLP ($)</span>
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

          <div className="w-full h-px bg-border" />

          <div className="space-y-2">
            <Label htmlFor="width" className="text-sm font-bold flex items-center justify-between">
              Ancho del Rollo
              <span className="text-xs font-normal bg-secondary px-2 py-1 rounded">Centímetros (cm)</span>
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

      <Card className="border-none shadow-md bg-card">
        <CardContent className="p-6 space-y-6">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            Márgenes de Ganancia
            <HelpTooltip text="Montos que se suman al costo del material por prenda para calcular el precio de venta." iconSize={13} />
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="baseMargin" className="text-sm font-bold">Margen Base (común)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
                <Input
                  id="baseMargin"
                  type="number"
                  value={baseMargin}
                  onChange={(e) => setBaseMargin(e.target.value)}
                  className="pl-8 font-bold h-12"
                />
              </div>
              <p className="text-xs text-muted-foreground">Se suma al costo DTF por prenda.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wholesaleMargin" className="text-sm font-bold">Margen Mayorista</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
                <Input
                  id="wholesaleMargin"
                  type="number"
                  value={wholesaleMargin}
                  onChange={(e) => setWholesaleMargin(e.target.value)}
                  className="pl-8 font-bold h-12"
                />
              </div>
              <p className="text-xs text-muted-foreground">Se usa cuando activás la opción mayorista.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-md bg-card">
        <CardContent className="p-6 space-y-6">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            Bajadas de Plancha
            <HelpTooltip text="Cuando un diseño requiere más pasadas por la plancha térmica que el umbral, se cobra un extra por cada pasada adicional." iconSize={13} />
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pressPassThreshold" className="text-sm font-bold">Umbral (incluidas)</Label>
              <Input
                id="pressPassThreshold"
                type="number"
                min="1"
                value={pressPassThreshold}
                onChange={(e) => setPressPassThreshold(e.target.value)}
                className="font-bold h-12"
              />
              <p className="text-xs text-muted-foreground">Bajadas incluidas en el precio base.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pressPassExtraCost" className="text-sm font-bold">Costo Extra por Bajada</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
                <Input
                  id="pressPassExtraCost"
                  type="number"
                  min="0"
                  value={pressPassExtraCost}
                  onChange={(e) => setPressPassExtraCost(e.target.value)}
                  className="pl-8 font-bold h-12"
                />
              </div>
              <p className="text-xs text-muted-foreground">Se cobra por cada bajada que exceda el umbral.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-md bg-card">
        <CardContent className="p-6 space-y-6">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            Recargo por Talle
            <HelpTooltip text="Cuando el diseño lleva talle (número o letra estampada), se suma un recargo adicional por prenda." iconSize={13} />
          </h3>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">Talle habilitado por defecto</p>
              <p className="text-xs text-muted-foreground mt-0.5">Activar talle automáticamente en cada cotización.</p>
            </div>
            <button
              onClick={() => setTalleEnabled(v => !v)}
              aria-label="Toggle talle"
              style={{
                width: 51,
                height: 31,
                borderRadius: 999,
                backgroundColor: talleEnabled ? "#f97316" : isDark ? "#374151" : "#d1d5db",
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
                  left: talleEnabled ? 22 : 2,
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

          <div className="space-y-2">
            <Label htmlFor="talleSurcharge" className="text-sm font-bold">Recargo por Talle</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
              <Input
                id="talleSurcharge"
                type="number"
                min="0"
                value={talleSurcharge}
                onChange={(e) => setTalleSurcharge(e.target.value)}
                className="pl-8 font-bold h-12"
              />
            </div>
            <p className="text-xs text-muted-foreground">Monto adicional por prenda cuando el diseño lleva talle.</p>
          </div>
        </CardContent>
      </Card>

      <Button size="lg" className="w-full rounded-2xl mt-2" onClick={handleSave}>
        <Save className="w-5 h-5 mr-2" />
        Guardar Ajustes
      </Button>
    </div>
  );
}
