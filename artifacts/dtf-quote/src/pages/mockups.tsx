import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Stage, Layer, Image as KonvaImage, Transformer, Rect, Group } from "react-konva";
import Konva from "konva";
import {
  Download, Upload, RotateCcw, ZoomIn, ZoomOut, Shirt, Palette,
  FlipHorizontal, FlipVertical, Layers, Trash2, Eye, EyeOff,
  ChevronUp, ChevronDown, Plus,
} from "lucide-react";
import {
  garmentTemplates, getPrintArea,
  type GarmentTemplate, type GarmentColor,
} from "@/lib/garment-templates";
import { useUsage } from "@/hooks/use-usage";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { ToolSessionGate } from "@/components/tool-session-gate";
import { AnimatePresence } from "framer-motion";

interface DesignLayer {
  id: string;
  name: string;
  src: string;
  image: HTMLImageElement | null;
  x: number;
  y: number;
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  visible: boolean;
  side: "front" | "back";
}

const BASE = import.meta.env.BASE_URL || "/";

function garmentUrl(path: string) {
  const b = BASE.endsWith("/") ? BASE.slice(0, -1) : BASE;
  return `${b}${path}`;
}

function useLoadedImage(src: string | null): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!src) { setImg(null); return; }
    const el = new window.Image();
    el.crossOrigin = "anonymous";
    el.onload = () => setImg(el);
    el.onerror = () => setImg(null);
    el.src = src;
    return () => { el.onload = null; el.onerror = null; };
  }, [src]);
  return img;
}

const CANVAS_W = 500;
const CANVAS_H = 600;

interface MockupCanvasProps {
  garmentImg: HTMLImageElement | null;
  layers: DesignLayer[];
  side: "front" | "back";
  templateId: string;
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  onUpdateLayer: (id: string, updates: Partial<DesignLayer>) => void;
  stageRef: React.RefObject<Konva.Stage | null>;
  interactive: boolean;
}

function MockupCanvas({
  garmentImg, layers, side, templateId, selectedLayerId,
  onSelectLayer, onUpdateLayer, stageRef, interactive,
}: MockupCanvasProps) {
  const trRef = useRef<Konva.Transformer>(null);
  const nodeRefs = useRef<Map<string, Konva.Image>>(new Map());

  const pa = getPrintArea(templateId, side);
  const pxArea = {
    x: pa.x * CANVAS_W,
    y: pa.y * CANVAS_H,
    w: pa.width * CANVAS_W,
    h: pa.height * CANVAS_H,
  };

  const sideLayers = layers.filter((l) => l.side === side && l.visible);

  useEffect(() => {
    if (!trRef.current) return;
    if (selectedLayerId) {
      const node = nodeRefs.current.get(selectedLayerId);
      if (node) {
        trRef.current.nodes([node]);
        trRef.current.getLayer()?.batchDraw();
        return;
      }
    }
    trRef.current.nodes([]);
    trRef.current.getLayer()?.batchDraw();
  }, [selectedLayerId, sideLayers.length]);

  return (
    <Stage
      ref={stageRef}
      width={CANVAS_W}
      height={CANVAS_H}
      style={{ background: "#111" }}
      onMouseDown={(e) => {
        if (!interactive) return;
        const clicked = e.target;
        if (clicked === e.target.getStage() || clicked.getClassName() === "Rect" || clicked.getClassName() === "Image" && !clicked.draggable()) {
          onSelectLayer(null);
        }
      }}
      onTouchStart={(e) => {
        if (!interactive) return;
        const clicked = e.target;
        if (clicked === e.target.getStage() || clicked.getClassName() === "Rect") {
          onSelectLayer(null);
        }
      }}
    >
      <Layer>
        {garmentImg && (
          <KonvaImage
            image={garmentImg}
            x={0}
            y={0}
            width={CANVAS_W}
            height={CANVAS_H}
            listening={false}
          />
        )}

        <Group clipX={pxArea.x} clipY={pxArea.y} clipWidth={pxArea.w} clipHeight={pxArea.h}>
          {sideLayers.map((layer) => (
            <KonvaImage
              key={layer.id}
              ref={(node) => {
                if (node) nodeRefs.current.set(layer.id, node);
                else nodeRefs.current.delete(layer.id);
              }}
              image={layer.image!}
              x={layer.x}
              y={layer.y}
              width={layer.width}
              height={layer.height}
              scaleX={layer.scaleX}
              scaleY={layer.scaleY}
              rotation={layer.rotation}
              draggable={interactive}
              onClick={() => interactive && onSelectLayer(layer.id)}
              onTap={() => interactive && onSelectLayer(layer.id)}
              onDragEnd={(e) => {
                onUpdateLayer(layer.id, { x: e.target.x(), y: e.target.y() });
              }}
              onTransformEnd={() => {
                const node = nodeRefs.current.get(layer.id);
                if (!node) return;
                onUpdateLayer(layer.id, {
                  x: node.x(),
                  y: node.y(),
                  scaleX: node.scaleX(),
                  scaleY: node.scaleY(),
                  rotation: node.rotation(),
                });
              }}
            />
          ))}
        </Group>

        <Rect
          x={pxArea.x}
          y={pxArea.y}
          width={pxArea.w}
          height={pxArea.h}
          stroke="#f97316"
          strokeWidth={1}
          dash={[6, 4]}
          listening={false}
          opacity={0.5}
        />

        {interactive && selectedLayerId && (
          <Transformer
            ref={trRef}
            rotateEnabled={true}
            keepRatio={true}
            enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right"]}
            boundBoxFunc={(oldBox, newBox) => {
              if (Math.abs(newBox.width) < 10 || Math.abs(newBox.height) < 10) return oldBox;
              return newBox;
            }}
            borderStroke="#f97316"
            borderStrokeWidth={1.5}
            anchorStroke="#f97316"
            anchorFill="#242424"
            anchorSize={8}
            anchorCornerRadius={2}
          />
        )}
      </Layer>
    </Stage>
  );
}

export function MockupsPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<GarmentTemplate>(garmentTemplates[0]);
  const [selectedColor, setSelectedColor] = useState<GarmentColor>(garmentTemplates[0].colors[0]);
  const [layers, setLayers] = useState<DesignLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [mobileTab, setMobileTab] = useState<"front" | "back">("front");
  const [brandName, setBrandName] = useState("");
  const [mockupSessionStarted, setMockupSessionStarted] = useState(false);
  const [startingMockupSession, setStartingMockupSession] = useState(false);

  const frontStageRef = useRef<Konva.Stage>(null);
  const backStageRef = useRef<Konva.Stage>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputSideRef = useRef<"front" | "back">("front");

  const frontImgSrc = garmentUrl(selectedColor.frontImage);
  const backImgSrc = garmentUrl(selectedColor.backImage);
  const frontImg = useLoadedImage(frontImgSrc);
  const backImg = useLoadedImage(backImgSrc);

  const { canUse, increment, remaining } = useUsage();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const isMaster = currentUser?.role === "master";
  const isMockupSessionUnlocked = isMaster || mockupSessionStarted;

  const frontLayers = useMemo(() => layers.filter((l) => l.side === "front"), [layers]);
  const backLayers = useMemo(() => layers.filter((l) => l.side === "back"), [layers]);

  const selectedLayer = useMemo(() => layers.find((l) => l.id === selectedLayerId) ?? null, [layers, selectedLayerId]);

  useEffect(() => {
    setSelectedColor(selectedTemplate.colors[0]);
    setLayers([]);
    setSelectedLayerId(null);
  }, [selectedTemplate]);

  useEffect(() => {
    setLayers([]);
    setSelectedLayerId(null);
  }, [selectedColor]);

  const addDesignLayer = useCallback((file: File, side: "front" | "back") => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Formato no soportado", description: "Solo se aceptan imágenes (PNG, JPG, WebP)", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      const img = new window.Image();
      img.onload = () => {
        const pa = getPrintArea(selectedTemplate.id, side);
        const areaW = pa.width * CANVAS_W;
        const areaH = pa.height * CANVAS_H;
        const areaX = pa.x * CANVAS_W;
        const areaY = pa.y * CANVAS_H;

        const aspect = img.width / img.height;
        let w = areaW * 0.6;
        let h = w / aspect;
        if (h > areaH * 0.6) {
          h = areaH * 0.6;
          w = h * aspect;
        }

        const id = `layer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const newLayer: DesignLayer = {
          id,
          name: file.name.replace(/\.[^.]+$/, "").slice(0, 20),
          src,
          image: img,
          x: areaX + (areaW - w) / 2,
          y: areaY + (areaH - h) / 2,
          width: w,
          height: h,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
          visible: true,
          side,
        };
        setLayers((prev) => [...prev, newLayer]);
        setSelectedLayerId(id);
        if (window.innerWidth < 768) {
          setMobileTab(side);
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }, [selectedTemplate, toast]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    addDesignLayer(file, fileInputSideRef.current);
    e.target.value = "";
  }, [addDesignLayer]);

  const handleDrop = useCallback((e: React.DragEvent, side: "front" | "back") => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) addDesignLayer(file, side);
  }, [addDesignLayer]);

  const updateLayer = useCallback((id: string, updates: Partial<DesignLayer>) => {
    setLayers((prev) => prev.map((l) => l.id === id ? { ...l, ...updates } : l));
  }, []);

  const removeLayer = useCallback((id: string) => {
    setLayers((prev) => prev.filter((l) => l.id !== id));
    if (selectedLayerId === id) setSelectedLayerId(null);
  }, [selectedLayerId]);

  const moveLayerOrder = useCallback((id: string, dir: "up" | "down") => {
    setLayers((prev) => {
      const idx = prev.findIndex((l) => l.id === id);
      if (idx < 0) return prev;
      const swapIdx = dir === "up" ? idx + 1 : idx - 1;
      if (swapIdx < 0 || swapIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  }, []);

  const toggleLayerVisibility = useCallback((id: string) => {
    setLayers((prev) => prev.map((l) => l.id === id ? { ...l, visible: !l.visible } : l));
  }, []);

  const handleFlipH = useCallback(() => {
    if (!selectedLayerId) return;
    setLayers((prev) => prev.map((l) => l.id === selectedLayerId ? { ...l, scaleX: l.scaleX * -1 } : l));
  }, [selectedLayerId]);

  const handleFlipV = useCallback(() => {
    if (!selectedLayerId) return;
    setLayers((prev) => prev.map((l) => l.id === selectedLayerId ? { ...l, scaleY: l.scaleY * -1 } : l));
  }, [selectedLayerId]);

  const handleScale = useCallback((factor: number) => {
    if (!selectedLayerId) return;
    setLayers((prev) => prev.map((l) => l.id === selectedLayerId ? { ...l, scaleX: l.scaleX * factor, scaleY: l.scaleY * factor } : l));
  }, [selectedLayerId]);

  const handleResetAll = useCallback(() => {
    setLayers([]);
    setSelectedLayerId(null);
    setMockupSessionStarted(false);
  }, []);

  const handleStartMockupSession = useCallback(async () => {
    if (isMockupSessionUnlocked) {
      return;
    }

    if (!canUse("mockup_pngs")) {
      setShowUpgrade(true);
      return;
    }

    setStartingMockupSession(true);
    const sessionId = `mockup-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const ok = await increment("mockup_pngs", {
      source: "mockups",
      stage: "tool_unlock",
      sessionId,
    });
    setStartingMockupSession(false);

    if (!ok) {
      setShowUpgrade(true);
      return;
    }

    setMockupSessionStarted(true);
    toast({
      title: "Edición iniciada",
      description: "Ya podés cargar, editar y exportar este mockup.",
    });
  }, [canUse, increment, isMockupSessionUnlocked, toast]);

  const handleExport = useCallback(async () => {
    if (!frontStageRef.current || !backStageRef.current) return;

    if (!isMockupSessionUnlocked) {
      toast({
        title: "Primero iniciá la edición",
        description: "Así registramos el uso y desbloqueamos la herramienta.",
        variant: "destructive",
      });
      return;
    }

    setExporting(true);
    setSelectedLayerId(null);
    await new Promise((r) => setTimeout(r, 150));

    try {
      const scale = 2;
      const frontDataUrl = frontStageRef.current.toDataURL({ pixelRatio: scale, mimeType: "image/png" });
      const backDataUrl = backStageRef.current.toDataURL({ pixelRatio: scale, mimeType: "image/png" });

      const frontCanvas = document.createElement("canvas");
      const backCanvas = document.createElement("canvas");
      const fCtx = frontCanvas.getContext("2d")!;
      const bCtx = backCanvas.getContext("2d")!;

      const loadImg = (src: string): Promise<HTMLImageElement> =>
        new Promise((res) => {
          const img = new window.Image();
          img.onload = () => res(img);
          img.src = src;
        });

      const [fImg, bImg] = await Promise.all([loadImg(frontDataUrl), loadImg(backDataUrl)]);

      const imgW = fImg.width;
      const imgH = fImg.height;
      const centerW = Math.round(imgW * 0.35);
      const totalW = imgW + centerW + imgW;
      const totalH = imgH;

      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = totalW;
      exportCanvas.height = totalH;
      const ctx = exportCanvas.getContext("2d")!;

      ctx.fillStyle = "#111111";
      ctx.fillRect(0, 0, totalW, totalH);

      ctx.drawImage(fImg, 0, 0, imgW, imgH);
      ctx.drawImage(bImg, imgW + centerW, 0, imgW, imgH);

      const centerX = imgW + centerW / 2;
      const centerY = totalH / 2;

      const displayName = brandName.trim() || currentUser?.name || currentUser?.email?.split("@")[0] || "YAGUAR ESTUDIO";

      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.font = `bold ${Math.round(centerW * 0.12)}px Inter, system-ui, sans-serif`;
      const words = displayName.split(" ");
      const lineH = Math.round(centerW * 0.15);
      const startY = centerY - ((words.length - 1) * lineH) / 2;
      words.forEach((word, i) => {
        ctx.fillText(word, centerX, startY + i * lineH);
      });

      ctx.font = `${Math.round(centerW * 0.05)}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = "#666666";
      ctx.fillText("FRENTE", imgW / 2, totalH - 30);
      ctx.fillText("ESPALDA", imgW + centerW + imgW / 2, totalH - 30);

      const link = document.createElement("a");
      link.download = `mockup-${selectedTemplate.id}-${selectedColor.id}-${Date.now()}.png`;
      link.href = exportCanvas.toDataURL("image/png");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setMockupSessionStarted(false);
      toast({ title: "Mockup exportado", description: "Se descargó la imagen con frente y espalda" });
    } catch (err) {
      toast({ title: "Error al exportar", description: "No se pudo generar la imagen", variant: "destructive" });
    }
    setExporting(false);
  }, [isMockupSessionUnlocked, selectedTemplate, selectedColor, brandName, currentUser, toast]);

  const openFileInput = useCallback((side: "front" | "back") => {
    fileInputSideRef.current = side;
    fileInputRef.current?.click();
  }, []);

  const activeSideLayers = mobileTab === "front" ? frontLayers : backLayers;

  return (
    <div className="mockup-root">
      <AnimatePresence>
        {showUpgrade && (
          <UpgradePrompt feature="mockup_pngs" open={showUpgrade} onClose={() => setShowUpgrade(false)} />
        )}
      </AnimatePresence>

      {!isMockupSessionUnlocked && (
        <div className="mb-4">
          <ToolSessionGate
            title="Iniciar edición de mockup"
            description="Cuando la inicies, se habilitan las cargas, ediciones y la exportación, y se descuenta 1 uso del plan."
            buttonLabel="Iniciar edición de mockup"
            remaining={remaining.mockupPngs}
            loading={startingMockupSession}
            onStart={() => void handleStartMockupSession()}
          />
        </div>
      )}

      <div className={isMockupSessionUnlocked ? "" : "pointer-events-none select-none opacity-40 blur-[1px]"}>
      <div className="mockup-header">
        <div>
          <h1 className="mockup-title">Generador de Mockups</h1>
          <p className="mockup-subtitle">Visualizá tu diseño en prendas reales</p>
        </div>
        <div className="mockup-header-actions">
          {layers.length > 0 && (
            <button onClick={handleResetAll} className="mockup-btn-ghost" title="Limpiar todo">
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleExport}
            disabled={exporting || layers.length === 0}
            className="mockup-btn-primary"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{exporting ? "Exportando..." : "Descargar PNG"}</span>
          </button>
        </div>
      </div>

      <div className="mockup-workspace">
        {/* === LEFT: Controls panel === */}
        <div className="mockup-sidebar">
          {/* Garment type */}
          <div className="mockup-panel">
            <div className="mockup-panel-header">
              <Shirt className="w-4 h-4 text-orange-500" />
              <span>Prenda</span>
            </div>
            <div className="mockup-garment-grid">
              {garmentTemplates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t)}
                  className={`mockup-garment-btn ${selectedTemplate.id === t.id ? "active" : ""}`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div className="mockup-panel">
            <div className="mockup-panel-header">
              <Palette className="w-4 h-4 text-orange-500" />
              <span>Color</span>
            </div>
            <div className="mockup-color-grid">
              {selectedTemplate.colors.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedColor(c)}
                  title={c.label}
                  className={`mockup-color-swatch ${selectedColor.id === c.id ? "active" : ""}`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>

          {/* Brand name */}
          <div className="mockup-panel">
            <div className="mockup-panel-header">
              <span className="text-orange-500 font-bold text-xs">A</span>
              <span>Marca (exportación)</span>
            </div>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder={currentUser?.name || currentUser?.email?.split("@")[0] || "Tu marca"}
              className="mockup-input"
            />
          </div>

          {/* Layers */}
          <div className="mockup-panel mockup-panel-layers">
            <div className="mockup-panel-header">
              <Layers className="w-4 h-4 text-orange-500" />
              <span>Capas</span>
            </div>

            <div className="mockup-add-btns">
              <button onClick={() => openFileInput("front")} className="mockup-add-btn">
                <Plus className="w-3 h-3" /> Frente
              </button>
              <button onClick={() => openFileInput("back")} className="mockup-add-btn">
                <Plus className="w-3 h-3" /> Espalda
              </button>
            </div>

            {layers.length === 0 && (
              <p className="mockup-hint">Agregá diseños para comenzar</p>
            )}

            <div className="mockup-layers-list">
              {[...layers].reverse().map((layer) => (
                <div
                  key={layer.id}
                  className={`mockup-layer-item ${selectedLayerId === layer.id ? "active" : ""}`}
                  onClick={() => {
                    setSelectedLayerId(layer.id);
                    if (window.innerWidth < 768) setMobileTab(layer.side);
                  }}
                >
                  <div className="mockup-layer-info">
                    <span className={`mockup-layer-badge ${layer.side === "front" ? "front" : "back"}`}>
                      {layer.side === "front" ? "F" : "E"}
                    </span>
                    <span className="mockup-layer-name">{layer.name}</span>
                  </div>
                  <div className="mockup-layer-actions">
                    <button onClick={(e) => { e.stopPropagation(); toggleLayerVisibility(layer.id); }} title={layer.visible ? "Ocultar" : "Mostrar"}>
                      {layer.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); moveLayerOrder(layer.id, "up"); }} title="Subir">
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); moveLayerOrder(layer.id, "down"); }} title="Bajar">
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); removeLayer(layer.id); }} title="Eliminar" className="text-red-400">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tools */}
          {selectedLayer && (
            <div className="mockup-panel">
              <div className="mockup-panel-header">
                <span className="text-orange-500 text-xs font-bold">✦</span>
                <span>Herramientas</span>
              </div>
              <div className="mockup-tools-row">
                <button onClick={handleFlipH} className="mockup-tool-btn" title="Voltear horizontal">
                  <FlipHorizontal className="w-4 h-4" />
                </button>
                <button onClick={handleFlipV} className="mockup-tool-btn" title="Voltear vertical">
                  <FlipVertical className="w-4 h-4" />
                </button>
                <button onClick={() => handleScale(1.15)} className="mockup-tool-btn" title="Agrandar">
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button onClick={() => handleScale(0.85)} className="mockup-tool-btn" title="Achicar">
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button onClick={() => removeLayer(selectedLayer.id)} className="mockup-tool-btn text-red-400" title="Eliminar capa">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* === RIGHT: Canvas area === */}
        <div className="mockup-canvas-area">
          {/* Desktop: side by side */}
          <div className="mockup-dual-canvas hidden md:flex">
            <div className="mockup-canvas-wrapper">
              <div className="mockup-canvas-label">FRENTE</div>
              <div
                className="mockup-canvas-frame"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, "front")}
              >
                <MockupCanvas
                  garmentImg={frontImg}
                  layers={layers}
                  side="front"
                  templateId={selectedTemplate.id}
                  selectedLayerId={selectedLayer?.side === "front" ? selectedLayerId : null}
                  onSelectLayer={setSelectedLayerId}
                  onUpdateLayer={updateLayer}
                  stageRef={frontStageRef}
                  interactive={true}
                />
                {frontLayers.length === 0 && (
                  <div className="mockup-canvas-empty" onClick={() => openFileInput("front")}>
                    <Upload className="w-6 h-6 text-neutral-500" />
                    <span>Agregar diseño</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mockup-canvas-wrapper">
              <div className="mockup-canvas-label">ESPALDA</div>
              <div
                className="mockup-canvas-frame"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, "back")}
              >
                <MockupCanvas
                  garmentImg={backImg}
                  layers={layers}
                  side="back"
                  templateId={selectedTemplate.id}
                  selectedLayerId={selectedLayer?.side === "back" ? selectedLayerId : null}
                  onSelectLayer={setSelectedLayerId}
                  onUpdateLayer={updateLayer}
                  stageRef={backStageRef}
                  interactive={true}
                />
                {backLayers.length === 0 && (
                  <div className="mockup-canvas-empty" onClick={() => openFileInput("back")}>
                    <Upload className="w-6 h-6 text-neutral-500" />
                    <span>Agregar diseño</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile: tabbed */}
          <div className="mockup-mobile-canvas md:hidden">
            <div className="mockup-mobile-tabs">
              <button
                onClick={() => setMobileTab("front")}
                className={`mockup-mobile-tab ${mobileTab === "front" ? "active" : ""}`}
              >
                Frente
              </button>
              <button
                onClick={() => setMobileTab("back")}
                className={`mockup-mobile-tab ${mobileTab === "back" ? "active" : ""}`}
              >
                Espalda
              </button>
            </div>

            <div
              className="mockup-canvas-frame mobile"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, mobileTab)}
              style={{ position: "relative" }}
            >
              <div style={{ display: mobileTab === "front" ? "block" : "none" }}>
                <MockupCanvas
                  garmentImg={frontImg}
                  layers={layers}
                  side="front"
                  templateId={selectedTemplate.id}
                  selectedLayerId={selectedLayer?.side === "front" ? selectedLayerId : null}
                  onSelectLayer={setSelectedLayerId}
                  onUpdateLayer={updateLayer}
                  stageRef={frontStageRef}
                  interactive={mobileTab === "front"}
                />
              </div>
              <div style={{ display: mobileTab === "back" ? "block" : "none" }}>
                <MockupCanvas
                  garmentImg={backImg}
                  layers={layers}
                  side="back"
                  templateId={selectedTemplate.id}
                  selectedLayerId={selectedLayer?.side === "back" ? selectedLayerId : null}
                  onSelectLayer={setSelectedLayerId}
                  onUpdateLayer={updateLayer}
                  stageRef={backStageRef}
                  interactive={mobileTab === "back"}
                />
              </div>
              {activeSideLayers.filter(l => l.visible).length === 0 && (
                <div className="mockup-canvas-empty" onClick={() => openFileInput(mobileTab)}>
                  <Upload className="w-6 h-6 text-neutral-500" />
                  <span>Agregar diseño</span>
                </div>
              )}
            </div>

            {/* Mobile tools bar */}
            <div className="mockup-mobile-tools">
              <button onClick={() => openFileInput(mobileTab)} className="mockup-tool-btn">
                <Plus className="w-4 h-4" />
              </button>
              {selectedLayer && (
                <>
                  <button onClick={handleFlipH} className="mockup-tool-btn"><FlipHorizontal className="w-4 h-4" /></button>
                  <button onClick={handleFlipV} className="mockup-tool-btn"><FlipVertical className="w-4 h-4" /></button>
                  <button onClick={() => handleScale(1.15)} className="mockup-tool-btn"><ZoomIn className="w-4 h-4" /></button>
                  <button onClick={() => handleScale(0.85)} className="mockup-tool-btn"><ZoomOut className="w-4 h-4" /></button>
                  <button onClick={() => removeLayer(selectedLayer.id)} className="mockup-tool-btn text-red-400"><Trash2 className="w-4 h-4" /></button>
                </>
              )}
              <div className="flex-1" />
              <button onClick={handleExport} disabled={exporting || layers.length === 0} className="mockup-btn-primary text-xs px-3 py-1.5">
                <Download className="w-3.5 h-3.5" />
                PNG
              </button>
            </div>
          </div>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
      </div>

      <style>{mockupStyles}</style>
    </div>
  );
}

const mockupStyles = `
.mockup-root {
  min-height: 100%;
  padding: 16px;
  max-width: 1400px;
  margin: 0 auto;
}
@media (min-width: 768px) {
  .mockup-root { padding: 24px; }
}

.mockup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  gap: 12px;
}
.mockup-title {
  font-size: 1.25rem;
  font-weight: 900;
  font-family: var(--font-display, 'Outfit', sans-serif);
  color: hsl(var(--foreground));
}
.mockup-subtitle {
  font-size: 0.75rem;
  color: hsl(var(--muted-foreground));
  margin-top: 2px;
}
.mockup-header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.mockup-workspace {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
@media (min-width: 768px) {
  .mockup-workspace {
    flex-direction: row;
    gap: 20px;
  }
}

/* Sidebar */
.mockup-sidebar {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 12px;
}
@media (min-width: 768px) {
  .mockup-sidebar {
    flex-direction: column;
    flex-wrap: nowrap;
    width: 260px;
    min-width: 260px;
    max-height: calc(100dvh - 140px);
    overflow-y: auto;
  }
}

.mockup-panel {
  background: #1e1e1e;
  border: 1px solid #2a2a2a;
  border-radius: 14px;
  padding: 14px;
  flex: 1;
  min-width: 140px;
}
@media (min-width: 768px) {
  .mockup-panel { flex: none; min-width: auto; }
}
.mockup-panel-layers {
  flex-basis: 100%;
}

.mockup-panel-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  color: #e5e5e5;
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.mockup-garment-grid {
  display: flex;
  gap: 6px;
}
.mockup-garment-btn {
  flex: 1;
  padding: 8px 4px;
  border-radius: 10px;
  border: 1.5px solid #333;
  font-size: 0.7rem;
  font-weight: 700;
  color: #999;
  background: transparent;
  transition: all 0.15s;
  cursor: pointer;
}
.mockup-garment-btn:hover { border-color: #555; color: #ccc; }
.mockup-garment-btn.active {
  border-color: #f97316;
  color: #f97316;
  background: rgba(249, 115, 22, 0.08);
}

.mockup-color-grid {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.mockup-color-swatch {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  border: 2px solid #333;
  cursor: pointer;
  transition: all 0.15s;
}
.mockup-color-swatch:hover { transform: scale(1.1); }
.mockup-color-swatch.active {
  border-color: #f97316;
  box-shadow: 0 0 0 2px rgba(249,115,22,0.3);
  transform: scale(1.1);
}

.mockup-input {
  width: 100%;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid #333;
  background: #141414;
  color: #e5e5e5;
  font-size: 0.75rem;
  outline: none;
  transition: border-color 0.15s;
}
.mockup-input:focus { border-color: #f97316; }
.mockup-input::placeholder { color: #555; }

.mockup-add-btns {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}
.mockup-add-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 8px;
  border-radius: 8px;
  background: rgba(249,115,22,0.1);
  color: #f97316;
  font-size: 0.65rem;
  font-weight: 700;
  border: 1px solid rgba(249,115,22,0.2);
  cursor: pointer;
  transition: all 0.15s;
}
.mockup-add-btn:hover { background: rgba(249,115,22,0.18); }

.mockup-hint {
  font-size: 0.65rem;
  color: #555;
  text-align: center;
  padding: 8px 0;
}

.mockup-layers-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 200px;
  overflow-y: auto;
}

.mockup-layer-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
  background: transparent;
}
.mockup-layer-item:hover { background: #262626; }
.mockup-layer-item.active {
  background: rgba(249,115,22,0.1);
  border: 1px solid rgba(249,115,22,0.25);
}

.mockup-layer-info {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.mockup-layer-badge {
  font-size: 0.55rem;
  font-weight: 800;
  padding: 2px 5px;
  border-radius: 4px;
  flex-shrink: 0;
}
.mockup-layer-badge.front {
  background: rgba(249,115,22,0.15);
  color: #f97316;
}
.mockup-layer-badge.back {
  background: rgba(168,85,247,0.15);
  color: #a855f7;
}
.mockup-layer-name {
  font-size: 0.65rem;
  color: #ccc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mockup-layer-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}
.mockup-layer-actions button {
  padding: 3px;
  border-radius: 4px;
  color: #666;
  transition: all 0.1s;
  background: transparent;
  border: none;
  cursor: pointer;
}
.mockup-layer-actions button:hover { color: #ccc; background: #333; }
.mockup-layer-actions button.text-red-400:hover { color: #f87171; }

.mockup-tools-row {
  display: flex;
  gap: 4px;
}

.mockup-tool-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #262626;
  color: #999;
  border: 1px solid #333;
  cursor: pointer;
  transition: all 0.15s;
}
.mockup-tool-btn:hover {
  background: rgba(249,115,22,0.12);
  color: #f97316;
  border-color: rgba(249,115,22,0.3);
}

/* Canvas area */
.mockup-canvas-area {
  flex: 1;
  min-width: 0;
}

.mockup-dual-canvas {
  display: flex;
  gap: 20px;
  justify-content: center;
}

.mockup-canvas-wrapper {
  flex: 1;
  max-width: 500px;
}

.mockup-canvas-label {
  text-align: center;
  font-size: 0.65rem;
  font-weight: 800;
  color: #555;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.mockup-canvas-frame {
  position: relative;
  background: #111;
  border-radius: 16px;
  border: 1px solid #2a2a2a;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mockup-canvas-frame.mobile {
  min-height: 400px;
}

.mockup-canvas-empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 0.7rem;
  color: #555;
  cursor: pointer;
  z-index: 10;
  transition: all 0.15s;
}
.mockup-canvas-empty:hover {
  color: #999;
}

/* Mobile tabs */
.mockup-mobile-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
  background: #1a1a1a;
  border-radius: 12px;
  padding: 4px;
  border: 1px solid #2a2a2a;
}
.mockup-mobile-tab {
  flex: 1;
  padding: 8px;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 700;
  color: #666;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
}
.mockup-mobile-tab.active {
  background: rgba(249,115,22,0.12);
  color: #f97316;
}

.mockup-mobile-tools {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 0;
  margin-top: 8px;
}

/* Buttons */
.mockup-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  border-radius: 12px;
  background: #f97316;
  color: #fff;
  font-size: 0.8rem;
  font-weight: 700;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
  box-shadow: 0 4px 12px rgba(249,115,22,0.25);
}
.mockup-btn-primary:hover { opacity: 0.9; }
.mockup-btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }

.mockup-btn-ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #1e1e1e;
  color: #999;
  border: 1px solid #2a2a2a;
  cursor: pointer;
  transition: all 0.15s;
}
.mockup-btn-ghost:hover { color: #ccc; background: #262626; }
`;
