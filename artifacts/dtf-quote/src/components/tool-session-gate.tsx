import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ToolSessionGateProps {
  title: string;
  description: string;
  buttonLabel: string;
  remaining: number;
  loading?: boolean;
  onStart: () => void;
}

function formatRemaining(remaining: number): string {
  if (remaining === -1) {
    return "Tu plan tiene uso ilimitado para esta herramienta.";
  }

  if (remaining === 1) {
    return "Te queda 1 uso disponible en este período.";
  }

  return `Te quedan ${remaining} usos disponibles en este período.`;
}

export function ToolSessionGate({
  title,
  description,
  buttonLabel,
  remaining,
  loading = false,
  onStart,
}: ToolSessionGateProps) {
  return (
    <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background p-5 shadow-lg shadow-primary/5">
      <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
        <Sparkles className="h-3.5 w-3.5" />
        Iniciar herramienta
      </div>

      <h2 className="mt-3 text-xl font-display font-bold text-foreground">
        {title}
      </h2>

      <p className="mt-2 text-sm text-muted-foreground">
        {description}
      </p>

      <p className="mt-3 text-xs font-medium text-foreground/80">
        {formatRemaining(remaining)}
      </p>

      <Button
        type="button"
        size="lg"
        className="mt-4 rounded-2xl"
        disabled={loading}
        onClick={onStart}
      >
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="mr-2 h-4 w-4" />
        )}
        {buttonLabel}
      </Button>

      <p className="mt-3 text-xs text-muted-foreground">
        El uso se descuenta al iniciar esta sesión, no al final.
      </p>
    </div>
  );
}
