import { useState, useRef, useEffect } from "react";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface HelpTooltipProps {
  text: string;
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
  iconSize?: number;
}

export function HelpTooltip({ text, className, side = "top", iconSize = 14 }: HelpTooltipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const positionClasses: Record<string, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div ref={ref} className={cn("relative inline-flex", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="p-0.5 rounded-full text-muted-foreground/50 hover:text-muted-foreground transition-colors focus:outline-none"
        aria-label="Ayuda"
      >
        <HelpCircle style={{ width: iconSize, height: iconSize }} />
      </button>
      {open && (
        <div
          className={cn(
            "absolute z-[60] w-56 px-3 py-2 rounded-xl bg-gray-900/95 backdrop-blur border border-white/10 shadow-xl text-xs text-gray-200 leading-relaxed pointer-events-none",
            positionClasses[side]
          )}
        >
          {text}
        </div>
      )}
    </div>
  );
}
