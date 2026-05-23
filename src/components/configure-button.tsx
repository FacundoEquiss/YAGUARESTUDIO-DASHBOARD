import { useLocation } from "wouter";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Shortcut from a module to its section inside /settings. */
export function ConfigureButton({ section, title = "Configurar" }: { section: string; title?: string }) {
  const [, setLocation] = useLocation();
  return (
    <Button
      variant="outline"
      size="icon"
      className="h-11 w-11 shrink-0"
      onClick={() => setLocation(`/settings#${section}`)}
      title={title}
      aria-label={title}
    >
      <Settings2 className="w-4 h-4" />
    </Button>
  );
}
