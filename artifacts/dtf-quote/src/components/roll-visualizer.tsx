import React from "react";
import { PlacedStamp } from "@/lib/skyline";
import { cn } from "@/lib/utils";

interface StampLegendItem {
  w: number;
  h: number;
  qty: number;
  color: string;
}

interface RollVisualizerProps {
  rollWidth: number;
  totalHeight: number;
  placements: PlacedStamp[];
  legend?: StampLegendItem[];
  className?: string;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function getDarkerColor(hex: string): string {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - 55);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - 55);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - 55);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export function RollVisualizer({
  rollWidth,
  totalHeight,
  placements,
  legend,
  className,
}: RollVisualizerProps) {
  const meters = (totalHeight / 100).toFixed(3);

  const padding = 2;
  const vWidth = rollWidth + padding * 2;
  const vHeight = Math.max(totalHeight + padding * 2, 20);

  const centerOffsetX = React.useMemo(() => {
    if (placements.length === 0) return 0;
    const maxUsedX = Math.max(...placements.map(p => p.x + p.w));
    return (rollWidth - maxUsedX) / 2;
  }, [placements, rollWidth]);

  return (
    <div className={cn("w-full bg-card rounded-2xl border border-border shadow-inner overflow-hidden flex flex-col", className)}>
      {/* Header */}
      <div className="bg-secondary/50 px-4 py-3 border-b border-border flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">ANCHO:</span>
          <span className="text-sm font-bold text-foreground bg-card px-2 py-1 rounded-md shadow-sm border border-border">
            {rollWidth} cm
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">LARGO:</span>
          <span className="text-sm font-bold text-primary bg-primary/10 px-2 py-1 rounded-md">
            {meters} m
          </span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full max-h-[500px] overflow-y-auto custom-scrollbar p-6 bg-secondary/20 flex justify-center">
        {placements.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm font-medium">
            Agrega estampas para ver la previsualización
          </div>
        ) : (
          <div className="rounded-2xl p-5 bg-gray-900 shadow-2xl w-full">
            <svg
              viewBox={`0 0 ${vWidth} ${vHeight}`}
              className="w-full h-auto origin-top transition-all duration-500 ease-out"
              preserveAspectRatio="xMidYMin meet"
            >
              <defs>
                {placements.map((p, idx) => (
                  <linearGradient key={`grad-${idx}`} id={`stampGradient-${idx}`} x1="0%" y1="0%" x2="30%" y2="100%">
                    <stop offset="0%" style={{ stopColor: hexToRgba(p.color, 0.95) }} />
                    <stop offset="100%" style={{ stopColor: hexToRgba(p.color, 0.72) }} />
                  </linearGradient>
                ))}
              </defs>

              {/* Roll background */}
              <rect
                x={padding}
                y={padding}
                width={rollWidth}
                height={totalHeight}
                fill="#FFFAF5"
                stroke="#E8D4C0"
                strokeWidth="0.8"
                rx="0"
              />

              {/* Stamps — centered, gradient fill, thin contrasted border */}
              {placements.map((p, idx) => (
                <g key={p.id}>
                  <rect
                    x={padding + p.x + centerOffsetX}
                    y={padding + p.y}
                    width={p.w}
                    height={p.h}
                    fill={`url(#stampGradient-${idx})`}
                    stroke={getDarkerColor(p.color)}
                    strokeWidth="0.15"
                    rx="0.4"
                  />
                  {p.w > 3 && p.h > 2.5 && (
                    <text
                      x={padding + p.x + centerOffsetX + p.w / 2}
                      y={padding + p.y + p.h / 2}
                      fill="#2C1810"
                      fontSize={Math.min(p.w * 0.12, p.h * 0.18, 2.2)}
                      fontFamily="Outfit, sans-serif"
                      fontWeight="600"
                      textAnchor="middle"
                      dominantBaseline="central"
                      opacity="0.75"
                    >
                      {Math.round(p.w)}×{Math.round(p.h)}
                    </text>
                  )}
                </g>
              ))}
            </svg>
          </div>
        )}
      </div>

      {legend && legend.length > 0 && (
        <div className="px-4 py-3 border-t border-border flex flex-wrap gap-3 justify-center">
          {legend.map((item, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
              <span className="font-medium">{item.qty} × {item.w}×{item.h}cm</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
