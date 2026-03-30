import { useLocation } from "wouter";
import { ArrowRight, BookOpen, Clock3, Home, Scissors, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

type ComingSoonFeature = "blog" | "bg-remover";

const FEATURE_COPY: Record<ComingSoonFeature, {
  title: string;
  description: string;
  bullets: string[];
  icon: typeof BookOpen;
}> = {
  blog: {
    title: "Blog educativo en preparacion",
    description:
      "Estamos armando un espacio con guias, tutoriales y contenido practico para DTF, sublimacion y personalizacion textil.",
    bullets: [
      "Guias paso a paso para produccion y ventas.",
      "Contenido pensado para clientes, marcas y talleres.",
      "Avisos cuando publiquemos las primeras notas.",
    ],
    icon: BookOpen,
  },
  "bg-remover": {
    title: "Quita fondos en preparacion",
    description:
      "Estamos cerrando los ultimos detalles para que puedas limpiar artes y preparar imagenes listas para mockups y cotizaciones.",
    bullets: [
      "Recorte rapido para piezas de catalogo.",
      "Flujo pensado para artes de DTF y mockups.",
      "Salida consistente antes del lanzamiento publico.",
    ],
    icon: Scissors,
  },
};

export function ComingSoonPage({ feature }: { feature: ComingSoonFeature }) {
  const [, setLocation] = useLocation();
  const { currentUser } = useAuth();
  const copy = FEATURE_COPY[feature];
  const Icon = copy.icon;

  const primaryRoute = currentUser ? "/dashboard" : "/";
  const secondaryRoute = currentUser ? "/app" : "/auth?tab=register";

  return (
    <div className="min-h-full flex items-center justify-center px-4 py-10 sm:px-6 sm:py-14">
      <div className="w-full max-w-3xl glass-panel rounded-[2rem] border border-border p-7 sm:p-10 shadow-2xl shadow-black/10">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary">
          <Clock3 className="h-3.5 w-3.5" />
          Proximamente
        </div>

        <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <Icon className="h-8 w-8" />
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-display font-black text-foreground sm:text-4xl">
              {copy.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              {copy.description}
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {copy.bullets.map((bullet) => (
            <div
              key={bullet}
              className="rounded-2xl border border-border bg-card/50 px-4 py-4 text-sm text-foreground/90"
            >
              <div className="mb-2 flex items-center gap-2 text-primary">
                <Sparkles className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-[0.18em]">
                  En camino
                </span>
              </div>
              <p className="leading-6">{bullet}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => setLocation(primaryRoute)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-opacity hover:opacity-90"
          >
            <Home className="h-4 w-4" />
            {currentUser ? "Volver al dashboard" : "Volver al inicio"}
          </button>

          <button
            type="button"
            onClick={() => setLocation(secondaryRoute)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-card/60 px-5 py-3 text-sm font-bold text-foreground transition-colors hover:bg-card"
          >
            {currentUser ? "Seguir con las herramientas listas" : "Crear cuenta para el lanzamiento"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
