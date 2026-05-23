import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Image as KonvaImage, Transformer } from "react-konva";
import type Konva from "konva";
import { Shirt, Upload, Download, Trash2, Scissors } from "lucide-react";
import { Link } from "wouter";
import { useImage } from "@/hooks/use-image";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface GarmentVariant {
  label: string;
  color: string;
  colorHex: string;
  front: string;
  back: string;
}

interface GarmentType {
  id: string;
  label: string;
  variants: GarmentVariant[];
}

const GARMENTS: GarmentType[] = [
  {
    id: "tshirt",
    label: "Remera",
    variants: [
      {
        label: "Blanca",
        color: "white",
        colorHex: "#f5f5f5",
        front: "/garments/tshirt-white-front.png",
        back: "/garments/tshirt-white-back.png",
      },
      {
        label: "Negra",
        color: "black",
        colorHex: "#1a1a1a",
        front: "/garments/tshirt-black-front.png",
        back: "/garments/tshirt-black-back.png",
      },
    ],
  },
  {
    id: "hoodie",
    label: "Buzo",
    variants: [
      {
        label: "Negro",
        color: "black",
        colorHex: "#1a1a1a",
        front: "/garments/hoodie-black-front.png",
        back: "/garments/hoodie-black-back.png",
      },
    ],
  },
];

const STAGE_SIZE = 460;

export function MockupsPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const artRef = useRef<Konva.Image>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  const [garmentIdx, setGarmentIdx] = useState(0);
  const [variantIdx, setVariantIdx] = useState(0);
  const [side, setSide] = useState<"front" | "back">("front");
  const [artUrl, setArtUrl] = useState<string | null>(null);
  const [selected, setSelected] = useState(false);
  const [artNode, setArtNode] = useState({ x: STAGE_SIZE / 2 - 70, y: STAGE_SIZE / 2 - 70, width: 140, height: 140 });

  const garment = GARMENTS[garmentIdx];
  const variant = garment.variants[Math.min(variantIdx, garment.variants.length - 1)];
  const garmentUrl = side === "front" ? variant.front : variant.back;

  const [garmentImg] = useImage(garmentUrl);
  const [artImg, artStatus] = useImage(artUrl);

  // Attach transformer to the art node when selected.
  useEffect(() => {
    if (selected && artRef.current && transformerRef.current) {
      transformerRef.current.nodes([artRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    } else if (transformerRef.current) {
      transformerRef.current.nodes([]);
    }
  }, [selected, artImg]);

  // When a new art loads, scale it to a sensible default size keeping aspect ratio.
  useEffect(() => {
    if (artImg && artStatus === "loaded") {
      const maxDim = 160;
      const ratio = artImg.width / artImg.height;
      let w = maxDim;
      let h = maxDim;
      if (ratio > 1) h = maxDim / ratio;
      else w = maxDim * ratio;
      setArtNode({ x: STAGE_SIZE / 2 - w / 2, y: STAGE_SIZE / 2 - h / 2, width: w, height: h });
      setSelected(true);
    }
  }, [artImg, artStatus]);

  function handleUpload(file: File) {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Archivo inválido", description: "Subí una imagen.", variant: "destructive" });
      return;
    }
    setArtUrl(URL.createObjectURL(file));
  }

  function removeArt() {
    setArtUrl(null);
    setSelected(false);
  }

  function exportPng() {
    if (!stageRef.current) return;
    setSelected(false);
    // Wait a tick so the transformer handles disappear before exporting.
    setTimeout(() => {
      const uri = stageRef.current!.toDataURL({ pixelRatio: 2 });
      const a = document.createElement("a");
      a.href = uri;
      a.download = `mockup-${garment.id}-${variant.color}-${side}.png`;
      a.click();
      toast({ title: "Mockup descargado" });
    }, 60);
  }

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-6 flex flex-col gap-6 pb-12 max-w-5xl">
      <header>
        <h1 className="text-3xl text-foreground font-display font-bold flex items-center gap-2">
          <Shirt className="w-7 h-7 text-primary" /> Generador de Mockups
        </h1>
        <p className="text-muted-foreground mt-1 font-medium">
          Subí tu arte, posicionalo sobre la prenda y descargá el mockup listo.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        {/* Canvas */}
        <Card>
          <CardContent className="p-4 flex items-center justify-center">
            <div
              className="rounded-xl overflow-hidden"
              style={{ background: variant.color === "white" ? "#e9e9e9" : "#0f0f0f" }}
            >
              <Stage
                ref={stageRef}
                width={STAGE_SIZE}
                height={STAGE_SIZE}
                onMouseDown={(e) => {
                  if (e.target === e.target.getStage()) setSelected(false);
                }}
                onTouchStart={(e) => {
                  if (e.target === e.target.getStage()) setSelected(false);
                }}
              >
                <Layer>
                  {garmentImg ? (
                    <KonvaImage image={garmentImg} width={STAGE_SIZE} height={STAGE_SIZE} listening={false} />
                  ) : null}
                  {artImg ? (
                    <KonvaImage
                      ref={artRef}
                      image={artImg}
                      x={artNode.x}
                      y={artNode.y}
                      width={artNode.width}
                      height={artNode.height}
                      draggable
                      onClick={() => setSelected(true)}
                      onTap={() => setSelected(true)}
                      onDragEnd={(e) => {
                        setArtNode((n) => ({ ...n, x: e.target.x(), y: e.target.y() }));
                      }}
                      onTransformEnd={() => {
                        const node = artRef.current;
                        if (!node) return;
                        const scaleX = node.scaleX();
                        const scaleY = node.scaleY();
                        node.scaleX(1);
                        node.scaleY(1);
                        setArtNode({
                          x: node.x(),
                          y: node.y(),
                          width: Math.max(20, node.width() * scaleX),
                          height: Math.max(20, node.height() * scaleY),
                        });
                      }}
                    />
                  ) : null}
                  {selected ? (
                    <Transformer
                      ref={transformerRef}
                      rotateEnabled
                      keepRatio
                      boundBoxFunc={(oldBox, newBox) => (newBox.width < 20 ? oldBox : newBox)}
                    />
                  ) : null}
                </Layer>
              </Stage>
            </div>
          </CardContent>
        </Card>

        {/* Controls */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">
                  Prenda
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {GARMENTS.map((g, i) => (
                    <button
                      key={g.id}
                      onClick={() => {
                        setGarmentIdx(i);
                        setVariantIdx(0);
                      }}
                      className={cn(
                        "px-3 py-2 rounded-xl text-sm font-semibold border transition-colors",
                        i === garmentIdx
                          ? "bg-primary/12 text-primary border-primary/30"
                          : "border-border text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">
                  Color
                </div>
                <div className="flex gap-2 flex-wrap">
                  {garment.variants.map((v, i) => (
                    <button
                      key={v.color}
                      onClick={() => setVariantIdx(i)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border transition-colors",
                        i === variantIdx
                          ? "bg-primary/12 text-primary border-primary/30"
                          : "border-border text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <span
                        className="w-4 h-4 rounded-full border border-border"
                        style={{ background: v.colorHex }}
                      />
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">
                  Vista
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(["front", "back"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSide(s)}
                      className={cn(
                        "px-3 py-2 rounded-xl text-sm font-semibold border transition-colors",
                        s === side
                          ? "bg-primary/12 text-primary border-primary/30"
                          : "border-border text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {s === "front" ? "Frente" : "Dorso"}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Tu arte
              </div>
              {!artUrl ? (
                <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-2" /> Subir arte
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" /> Cambiar
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={removeArt}
                    className="text-destructive hover:text-destructive"
                    aria-label="Quitar arte"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Tocá el arte para moverlo o redimensionarlo. ¿Tiene fondo?{" "}
                <Link href="/bg-remover" className="text-primary hover:underline">
                  Quitalo acá
                </Link>
                .
              </p>
            </CardContent>
          </Card>

          <Button onClick={exportPng} size="lg" className="w-full" disabled={!artUrl}>
            <Download className="w-4 h-4 mr-2" /> Descargar mockup
          </Button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
