import React, { useState, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import { Plus, Trash2, Save } from "lucide-react";
import { useDTFSettings, useDTFQuotes } from "@/hooks/use-dtf-store";
import { StampItem, packStamps, PlacedStamp, STAMP_COLORS } from "@/lib/skyline";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { RollVisualizer } from "@/components/roll-visualizer";
import { motion, AnimatePresence } from "framer-motion";

export function CalculatorPage() {
  const { settings } = useDTFSettings();
  const { saveQuote } = useDTFQuotes();
  const { toast } = useToast();

  const [clientName, setClientName] = useState("");
  const [notes, setNotes] = useState("");
  const [stamps, setStamps] = useState<StampItem[]>([
    { id: uuidv4(), w: 28, h: 32, qty: 1 } // Initial empty state
  ]);

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
  const totalPrice = linearMeters * settings.pricePerMeter;

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
      notes,
      stamps: stamps.filter(s => s.w > 0 && s.h > 0 && s.qty > 0),
      placements: packedResult.placements,
      totalHeight: packedResult.totalHeight,
      linearMeters,
      totalPrice,
      rollWidth: settings.rollWidth
    });

    toast({
      title: "¡Cotización guardada!",
      description: "Puedes verla en tu Historial.",
    });

    // Reset form after save
    setClientName("");
    setNotes("");
    setStamps([{ id: uuidv4(), w: 28, h: 32, qty: 1 }]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="px-5 py-8 flex flex-col gap-8 pb-12">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-primary">
          Cotizador DTF
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          powered by <span className="font-black">YAGUAR</span>STUDIO
        </p>
      </div>

      {/* Client Info */}
      <Card className="border-none shadow-md overflow-hidden bg-white/60 backdrop-blur">
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
            <Label htmlFor="notes" className="text-foreground font-bold">Notas <span className="text-muted-foreground font-normal">(opcional)</span></Label>
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

      {/* Stamps Form */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <div className="w-2 h-6 bg-primary rounded-full"></div>
            Estampas a cotizar
          </h2>
          <span className="text-xs font-medium bg-secondary text-muted-foreground px-2.5 py-1 rounded-full">
            {stamps.filter(s => s.w > 0 && s.h > 0).length} ítem{stamps.filter(s => s.w > 0 && s.h > 0).length !== 1 ? 's' : ''}
          </span>
        </div>
        
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {stamps.map((stamp, index) => (
              <motion.div 
                key={stamp.id}
                initial={{ opacity: 0, height: 0, scale: 0.95 }}
                animate={{ opacity: 1, height: "auto", scale: 1 }}
                exit={{ opacity: 0, height: 0, scale: 0.95, margin: 0 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-2xl p-4 shadow-sm border border-border flex flex-col gap-3 relative overflow-hidden group"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-orange-200 to-primary"></div>
                
                <div className="flex justify-between items-center pl-2">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full border border-opacity-30 border-black"
                      style={{ backgroundColor: STAMP_COLORS[index % STAMP_COLORS.length] }}
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
                      value={stamp.w || ''} 
                      onChange={(e) => updateStamp(stamp.id, 'w', parseFloat(e.target.value) || 0)}
                      className="h-10 px-3"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Largo (cm)</Label>
                    <Input 
                      type="number" 
                      min="1" 
                      step="0.1" 
                      value={stamp.h || ''} 
                      onChange={(e) => updateStamp(stamp.id, 'h', parseFloat(e.target.value) || 0)}
                      className="h-10 px-3"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Cantidad</Label>
                    <Input 
                      type="number" 
                      min="1" 
                      value={stamp.qty || ''} 
                      onChange={(e) => updateStamp(stamp.id, 'qty', parseInt(e.target.value) || 0)}
                      className="h-10 px-3 bg-orange-50 border-orange-200 focus-visible:ring-orange-200"
                    />
                  </div>
                </div>

                {stamp.w > 0 && stamp.h > 0 && stamp.qty > 0 && (
                  <div className="pl-2">
                    <span className="text-xs font-medium text-primary bg-orange-50 border border-orange-200 px-3 py-1 rounded-full">
                      {stamp.w}cm × {stamp.h}cm · {stamp.qty} unidad{stamp.qty !== 1 ? 'es' : ''}
                    </span>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <Button 
          variant="outline" 
          className="w-full border-dashed border-2 hover:border-primary hover:bg-orange-50/50 text-muted-foreground hover:text-primary"
          onClick={addStamp}
        >
          <Plus className="w-5 h-5 mr-2" />
          Agregar otra estampa
        </Button>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-br from-[#F97316] to-[#EA580C] rounded-[1.5rem] p-6 text-white shadow-xl shadow-orange-500/20 relative overflow-hidden">
        {/* Decorative background shapes */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-xl -ml-5 -mb-5 pointer-events-none"></div>
        
        <h3 className="font-display text-xl font-bold mb-4 opacity-90">Resumen de Costos</h3>
        
        <div className="space-y-2 mb-4">
          {stamps.filter(s => s.w > 0 && s.h > 0 && s.qty > 0).map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 text-sm text-white/80">
              <span className="w-2 h-2 rounded-full bg-white/60 shrink-0"></span>
              <span>{s.qty} × {s.w}×{s.h}cm</span>
            </div>
          ))}
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex justify-between items-center pb-3 border-b border-white/20">
            <span className="text-white/80">Metros Lineales</span>
            <span className="font-bold text-lg">{linearMeters.toFixed(3)} m</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-white/80">Precio (x metro)</span>
            <span className="font-medium">{formatCurrency(settings.pricePerMeter)}</span>
          </div>
        </div>

        <div className="bg-white text-foreground rounded-xl p-4 flex justify-between items-end shadow-inner">
          <span className="text-sm font-bold text-muted-foreground tracking-widest uppercase">TOTAL</span>
          <span className="text-3xl font-display font-black text-primary">
            {formatCurrency(totalPrice)}
          </span>
        </div>
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
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <p className="font-bold mb-1">Problemas al ubicar estampas:</p>
          <ul className="list-disc pl-4 space-y-1">
            {packedResult.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Save Action */}
      <Button 
        size="lg" 
        className="w-full rounded-2xl shadow-xl mt-4" 
        onClick={handleSave}
        disabled={packedResult.errors.length > 0}
      >
        <Save className="w-5 h-5 mr-2" />
        Guardar Cotización
      </Button>

    </div>
  );
}
