import React, { useState, useRef, useCallback, useEffect } from "react";
import { Stage, Layer, Image as KonvaImage, Transformer, Rect, Path, Group } from "react-konva";
import Konva from "konva";
import { Download, Upload, RotateCcw, ZoomIn, ZoomOut, ImageIcon, Shirt, Palette, Move, FlipHorizontal, FlipVertical } from "lucide-react";
import { garmentTemplates, GARMENT_COLORS, type GarmentTemplate } from "@/lib/garment-templates";
import { useUsage } from "@/hooks/use-usage";
import { useToast } from "@/hooks/use-toast";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { motion, AnimatePresence } from "framer-motion";

const CANVAS_SCALE = 1.5;

function useImage(src: string | null): HTMLImageElement | null {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!src) { setImage(null); return; }
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setImage(img);
    img.src = src;
    return () => { img.onload = null; };
  }, [src]);
  return image;
}

export function MockupsPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<GarmentTemplate>(garmentTemplates[0]);
  const [garmentColor, setGarmentColor] = useState(GARMENT_COLORS[0].hex);
  const [designSrc, setDesignSrc] = useState<string | null>(null);
  const [designProps, setDesignProps] = useState({ x: 0, y: 0, width: 0, height: 0, scaleX: 1, scaleY: 1, rotation: 0 });
  const [isSelected, setIsSelected] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [exporting, setExporting] = useState(false);

  const designImage = useImage(designSrc);
  const stageRef = useRef<Konva.Stage>(null);
  const designRef = useRef<Konva.Image>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { canUse, increment } = useUsage();
  const { toast } = useToast();

  const pa = selectedTemplate.printArea;

  useEffect(() => {
    if (designImage) {
      const aspect = designImage.width / designImage.height;
      let w = pa.width * 0.8;
      let h = w / aspect;
      if (h > pa.height * 0.8) {
        h = pa.height * 0.8;
        w = h * aspect;
      }
      const cx = pa.x + (pa.width - w) / 2;
      const cy = pa.y + (pa.height - h) / 2;
      setDesignProps({ x: cx, y: cy, width: w, height: h, scaleX: 1, scaleY: 1, rotation: 0 });
      setIsSelected(true);
    }
  }, [designImage, pa.x, pa.y, pa.width, pa.height]);

  useEffect(() => {
    if (isSelected && trRef.current && designRef.current) {
      trRef.current.nodes([designRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Formato no soportado", description: "Solo se aceptan imágenes (PNG, JPG, WebP)", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setDesignSrc(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setDesignSrc(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleExport = useCallback(async () => {
    if (!stageRef.current || !designImage) return;

    if (!canUse("mockup_pngs")) {
      setShowUpgrade(true);
      return;
    }

    setExporting(true);

    setIsSelected(false);

    await new Promise((r) => setTimeout(r, 100));

    try {
      const stage = stageRef.current;
      const exportScale = 3;
      const dataURL = stage.toDataURL({
        pixelRatio: exportScale,
        mimeType: "image/png",
      });

      const ok = await increment("mockup_pngs");
      if (!ok) {
        setShowUpgrade(true);
        setExporting(false);
        return;
      }

      const link = document.createElement("a");
      link.download = `mockup-${selectedTemplate.id}-${Date.now()}.png`;
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({ title: "Mockup exportado", description: "La imagen se descargó correctamente" });
    } catch {
      toast({ title: "Error al exportar", description: "No se pudo generar la imagen", variant: "destructive" });
    }

    setExporting(false);
  }, [designImage, canUse, increment, selectedTemplate.id, toast]);

  const handleReset = useCallback(() => {
    setDesignSrc(null);
    setIsSelected(false);
    setDesignProps({ x: 0, y: 0, width: 0, height: 0, scaleX: 1, scaleY: 1, rotation: 0 });
  }, []);

  const handleFlipH = useCallback(() => {
    setDesignProps((p) => ({ ...p, scaleX: p.scaleX * -1 }));
  }, []);

  const handleFlipV = useCallback(() => {
    setDesignProps((p) => ({ ...p, scaleY: p.scaleY * -1 }));
  }, []);

  const handleScale = useCallback((factor: number) => {
    setDesignProps((p) => ({
      ...p,
      scaleX: p.scaleX * factor,
      scaleY: p.scaleY * factor,
    }));
  }, []);

  const cw = selectedTemplate.canvasWidth;
  const ch = selectedTemplate.canvasHeight;

  const isLightColor = garmentColor === "#FFFFFF" || garmentColor === "#eab308" || garmentColor === "#38bdf8";

  return (
    <div className="min-h-full p-4 md:p-6 max-w-6xl mx-auto">
      <AnimatePresence>
        {showUpgrade && (
          <UpgradePrompt feature="mockup_pngs" open={showUpgrade} onClose={() => setShowUpgrade(false)} />
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-display font-black text-foreground">Generador de Mockups</h1>
        <p className="text-sm text-muted-foreground mt-1">Visualizá tu diseño en prendas reales</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="glass-panel rounded-2xl overflow-hidden">
            <div
              className="relative flex items-center justify-center bg-[repeating-conic-gradient(#80808015_0%_25%,transparent_0%_50%)] bg-[length:20px_20px]"
              style={{ minHeight: ch * CANVAS_SCALE + 40 }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              {!designSrc && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
                  <div className="glass-panel rounded-2xl p-8 text-center pointer-events-auto">
                    <Upload className="w-10 h-10 text-primary mx-auto mb-3" />
                    <p className="text-sm font-bold text-foreground mb-1">Arrastrá tu diseño acá</p>
                    <p className="text-xs text-muted-foreground mb-4">o hacé clic para subir</p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity"
                    >
                      Subir imagen
                    </button>
                  </div>
                </div>
              )}

              <div className="p-5">
                <Stage
                  ref={stageRef}
                  width={cw * CANVAS_SCALE}
                  height={ch * CANVAS_SCALE}
                  scaleX={CANVAS_SCALE}
                  scaleY={CANVAS_SCALE}
                  onMouseDown={(e) => {
                    if (e.target === e.target.getStage() || e.target.getClassName() === "Path" || e.target.getClassName() === "Rect") {
                      setIsSelected(false);
                    }
                  }}
                  onTouchStart={(e) => {
                    if (e.target === e.target.getStage() || e.target.getClassName() === "Path" || e.target.getClassName() === "Rect") {
                      setIsSelected(false);
                    }
                  }}
                >
                  <Layer>
                    <Rect x={0} y={0} width={cw} height={ch} fill="transparent" />
                    <Path
                      data={selectedTemplate.svgPath}
                      fill={garmentColor}
                      stroke={isLightColor ? "#d1d5db" : "transparent"}
                      strokeWidth={isLightColor ? 0.5 : 0}
                      shadowColor="rgba(0,0,0,0.15)"
                      shadowBlur={15}
                      shadowOffsetY={5}
                      listening={false}
                    />

                    {designImage && (
                      <Group
                        clipX={pa.x}
                        clipY={pa.y}
                        clipWidth={pa.width}
                        clipHeight={pa.height}
                      >
                        <KonvaImage
                          ref={designRef}
                          image={designImage}
                          x={designProps.x}
                          y={designProps.y}
                          width={designProps.width}
                          height={designProps.height}
                          scaleX={designProps.scaleX}
                          scaleY={designProps.scaleY}
                          rotation={designProps.rotation}
                          draggable
                          onClick={() => setIsSelected(true)}
                          onTap={() => setIsSelected(true)}
                          dragBoundFunc={(pos) => {
                            const stageScale = CANVAS_SCALE;
                            const absW = designProps.width * Math.abs(designProps.scaleX);
                            const absH = designProps.height * Math.abs(designProps.scaleY);
                            const minX = (pa.x - absW * 0.5) * stageScale;
                            const maxX = (pa.x + pa.width - absW * 0.5) * stageScale;
                            const minY = (pa.y - absH * 0.5) * stageScale;
                            const maxY = (pa.y + pa.height - absH * 0.5) * stageScale;
                            return {
                              x: Math.max(minX, Math.min(maxX, pos.x)),
                              y: Math.max(minY, Math.min(maxY, pos.y)),
                            };
                          }}
                          onDragEnd={(e) => {
                            setDesignProps((p) => ({ ...p, x: e.target.x(), y: e.target.y() }));
                          }}
                          onTransformEnd={() => {
                            const node = designRef.current;
                            if (!node) return;
                            setDesignProps({
                              x: node.x(),
                              y: node.y(),
                              width: node.width(),
                              height: node.height(),
                              scaleX: node.scaleX(),
                              scaleY: node.scaleY(),
                              rotation: node.rotation(),
                            });
                          }}
                        />
                        {isSelected && (
                          <Transformer
                            ref={trRef}
                            rotateEnabled={true}
                            keepRatio={true}
                            enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right"]}
                            boundBoxFunc={(oldBox, newBox) => {
                              if (Math.abs(newBox.width) < 15 || Math.abs(newBox.height) < 15) return oldBox;
                              return newBox;
                            }}
                            borderStroke="#f97316"
                            borderStrokeWidth={1.5}
                            anchorStroke="#f97316"
                            anchorFill="#ffffff"
                            anchorSize={8}
                            anchorCornerRadius={2}
                          />
                        )}
                      </Group>
                    )}

                    <Rect
                      x={pa.x}
                      y={pa.y}
                      width={pa.width}
                      height={pa.height}
                      stroke={designSrc ? "transparent" : (isLightColor ? "#9ca3af" : "#ffffff40")}
                      strokeWidth={0.8}
                      dash={[4, 4]}
                      listening={false}
                    />
                  </Layer>
                </Stage>
              </div>
            </div>

            {designSrc && (
              <div className="flex items-center gap-2 p-3 border-t border-white/10 dark:border-white/5 flex-wrap">
                <button onClick={() => fileInputRef.current?.click()} className="tool-btn" title="Cambiar imagen">
                  <Upload className="w-4 h-4" />
                </button>
                <button onClick={handleFlipH} className="tool-btn" title="Voltear horizontal">
                  <FlipHorizontal className="w-4 h-4" />
                </button>
                <button onClick={handleFlipV} className="tool-btn" title="Voltear vertical">
                  <FlipVertical className="w-4 h-4" />
                </button>
                <button onClick={() => handleScale(1.1)} className="tool-btn" title="Agrandar">
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button onClick={() => handleScale(0.9)} className="tool-btn" title="Achicar">
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button onClick={handleReset} className="tool-btn" title="Limpiar">
                  <RotateCcw className="w-4 h-4" />
                </button>
                <div className="flex-1" />
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg shadow-primary/20"
                >
                  <Download className="w-4 h-4" />
                  {exporting ? "Exportando..." : "Descargar PNG"}
                </button>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <div className="glass-panel rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Shirt className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">Prenda</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {garmentTemplates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t)}
                  className={`relative p-3 rounded-xl border-2 transition-all text-xs font-bold text-center ${
                    selectedTemplate.id === t.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-white/10 dark:border-white/5 hover:border-primary/30 text-muted-foreground"
                  }`}
                >
                  <svg viewBox="0 0 400 500" className="w-full h-16 mb-1">
                    <path
                      d={t.svgPath}
                      fill={selectedTemplate.id === t.id ? "#f9731630" : "currentColor"}
                      stroke={selectedTemplate.id === t.id ? "#f97316" : "currentColor"}
                      strokeWidth="1"
                      opacity={selectedTemplate.id === t.id ? 1 : 0.2}
                    />
                  </svg>
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Palette className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">Color</h3>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {GARMENT_COLORS.map((c) => (
                <button
                  key={c.hex}
                  onClick={() => setGarmentColor(c.hex)}
                  title={c.name}
                  className={`w-full aspect-square rounded-xl border-2 transition-all ${
                    garmentColor === c.hex
                      ? "border-primary scale-110 shadow-md"
                      : "border-white/20 dark:border-white/10 hover:scale-105"
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>

          {!designSrc && (
            <div className="glass-panel rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <ImageIcon className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Diseño</h3>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-6 rounded-xl border-2 border-dashed border-white/20 dark:border-white/10 hover:border-primary/40 transition-colors text-center"
              >
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs font-bold text-foreground">Subir diseño</p>
                <p className="text-xs text-muted-foreground">PNG, JPG o WebP</p>
              </button>
            </div>
          )}

          {designSrc && (
            <div className="glass-panel rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Move className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Controles</h3>
              </div>
              <div className="space-y-2 text-xs text-muted-foreground">
                <p><span className="font-bold text-foreground">Mover:</span> Arrastrá el diseño</p>
                <p><span className="font-bold text-foreground">Escalar:</span> Usá las esquinas</p>
                <p><span className="font-bold text-foreground">Rotar:</span> Usá el punto superior</p>
                <p><span className="font-bold text-foreground">Deseleccionar:</span> Clic fuera del diseño</p>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />

      <style>{`
        .tool-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: hsl(var(--muted));
          color: hsl(var(--muted-foreground));
          transition: all 0.15s;
        }
        .tool-btn:hover {
          background: hsl(var(--primary) / 0.15);
          color: hsl(var(--primary));
        }
      `}</style>
    </div>
  );
}
