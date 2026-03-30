import { useLocation } from "wouter";
import { ArrowLeft, Compass, Home } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function NotFound() {
  const [, setLocation] = useLocation();
  const { currentUser } = useAuth();
  const fallbackRoute = currentUser ? "/dashboard" : "/";

  return (
    <div className="min-h-full flex items-center justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-xl glass-panel rounded-[2rem] border border-border p-8 text-center shadow-2xl shadow-black/10 sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Compass className="h-8 w-8" />
        </div>

        <div className="mt-6">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary/80">Error 404</p>
          <h1 className="mt-3 text-3xl font-display font-black text-foreground sm:text-4xl">
            No encontramos esa pagina
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
            La ruta que abriste no existe o todavia no esta disponible. Te llevo de vuelta a una seccion segura para seguir trabajando.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => setLocation(fallbackRoute)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-opacity hover:opacity-90"
          >
            <Home className="h-4 w-4" />
            {currentUser ? "Ir al dashboard" : "Volver al inicio"}
          </button>

          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
                return;
              }

              setLocation(fallbackRoute);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-card/60 px-5 py-3 text-sm font-bold text-foreground transition-colors hover:bg-card"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver atras
          </button>
        </div>
      </div>
    </div>
  );
}
