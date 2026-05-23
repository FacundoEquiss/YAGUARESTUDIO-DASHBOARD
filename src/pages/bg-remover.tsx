import { useCallback, useRef, useState } from "react";
import { Scissors, Upload, Download, Loader2, ImageOff, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Stage = "idle" | "processing" | "done";

export function BgRemoverPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<Stage>("idle");
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("imagen");
  const [progress, setProgress] = useState<string>("");

  const reset = useCallback(() => {
    setStage("idle");
    setOriginalUrl(null);
    setResultUrl(null);
    setProgress("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const processFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast({ title: "Archivo inválido", description: "Subí una imagen (PNG, JPG…).", variant: "destructive" });
        return;
      }
      setFileName(file.name.replace(/\.[^.]+$/, "") || "imagen");
      setOriginalUrl(URL.createObjectURL(file));
      setResultUrl(null);
      setStage("processing");
      setProgress("Cargando modelo de IA…");

      try {
        const { removeBackground } = await import("@imgly/background-removal");
        const blob = await removeBackground(file, {
          progress: (key: string, current: number, total: number) => {
            if (key.includes("fetch")) {
              setProgress(`Descargando IA… ${Math.round((current / total) * 100)}%`);
            } else {
              setProgress("Procesando imagen…");
            }
          },
        });
        setResultUrl(URL.createObjectURL(blob));
        setStage("done");
        toast({ title: "¡Listo!", description: "Fondo removido con éxito." });
      } catch (err) {
        console.error(err);
        toast({
          title: "Error",
          description: "No se pudo procesar la imagen. Probá con otra.",
          variant: "destructive",
        });
        setStage("idle");
      }
    },
    [toast],
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) void processFile(file);
  }

  function downloadResult() {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = `${fileName}-sin-fondo.png`;
    a.click();
  }

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-6 flex flex-col gap-6 pb-12 max-w-4xl">
      <header>
        <h1 className="text-3xl text-foreground font-display font-bold flex items-center gap-2">
          <Scissors className="w-7 h-7 text-primary" /> Quita Fondos
        </h1>
        <p className="text-muted-foreground mt-1 font-medium">
          Remové el fondo de cualquier imagen con IA. Ideal para logos y artes de clientes.
        </p>
      </header>

      {stage === "idle" ? (
        <Card
          className="border-dashed cursor-pointer hover:border-primary/40 transition-colors"
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
              <Upload className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold mb-1">Subí o arrastrá una imagen</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-2">
              PNG, JPG o WEBP. Todo el proceso ocurre en tu dispositivo: tu imagen no se sube a ningún
              servidor.
            </p>
            <p className="text-xs text-muted-foreground">
              La primera vez descarga el modelo de IA (puede tardar unos segundos).
            </p>
          </CardContent>
        </Card>
      ) : null}

      {stage === "processing" ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
            <h3 className="text-lg font-bold mb-1">Procesando…</h3>
            <p className="text-sm text-muted-foreground">{progress || "Trabajando…"}</p>
          </CardContent>
        </Card>
      ) : null}

      {stage === "done" && originalUrl && resultUrl ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">
                  Original
                </div>
                <div className="rounded-xl overflow-hidden bg-secondary/50 flex items-center justify-center aspect-square">
                  <img src={originalUrl} alt="Original" className="max-w-full max-h-full object-contain" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">
                  Sin fondo
                </div>
                <div
                  className="rounded-xl overflow-hidden flex items-center justify-center aspect-square"
                  style={{
                    backgroundImage:
                      "repeating-conic-gradient(#0000000d 0% 25%, transparent 0% 50%)",
                    backgroundSize: "20px 20px",
                  }}
                >
                  <img src={resultUrl} alt="Sin fondo" className="max-w-full max-h-full object-contain" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={downloadResult} size="lg" className="flex-1">
              <Download className="w-4 h-4 mr-2" /> Descargar PNG sin fondo
            </Button>
            <Button onClick={reset} variant="outline" size="lg">
              <RotateCcw className="w-4 h-4 mr-2" /> Procesar otra
            </Button>
          </div>
        </>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void processFile(file);
        }}
      />

      {stage === "idle" ? (
        <Card className="bg-secondary/30 border-none">
          <CardContent className="p-5 flex gap-3">
            <ImageOff className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <strong className="text-foreground">Tip:</strong> usá esta herramienta para limpiar el
              logo o arte que te pasa un cliente antes de llevarlo al generador de mockups o al cotizador.
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
