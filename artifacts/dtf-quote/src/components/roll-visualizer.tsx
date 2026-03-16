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

  const getDarkerColor = (hexColor: string): string => {
    const hex = hexColor.replace("#", "");
    const r = Math.max(0, parseInt(hex.slice(0, 2), 16) - 40);
    const g = Math.max(0, parseInt(hex.slice(2, 4), 16) - 40);
    const b = Math.max(0, parseInt(hex.slice(4, 6), 16) - 40);
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  };

  return (
    <div className={cn("w-full bg-white rounded-2xl border border-border shadow-inner overflow-hidden flex flex-col", className)}>
      {/* Header */}
      <div className="bg-secondary/50 px-4 py-3 border-b border-border flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">ANCHO:</span>
          <span className="text-sm font-bold text-foreground bg-white px-2 py-1 rounded-md shadow-sm">
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
      <div className="relative w-full max-h-[500px] overflow-y-auto custom-scrollbar p-6 bg-gradient-to-b from-white to-secondary/30 flex justify-center">
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
                  <linearGradient key={`grad-${idx}`} id={`stampGradient-${idx}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{ stopColor: p.color, stopOpacity: 0.9 }} />
                    <stop offset="100%" style={{ stopColor: p.color, stopOpacity: 1 }} />
                  </linearGradient>
                ))}
              </defs>

              {/* Roll background — straight corners */}
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

              {/* Stamps — centered horizontally with gradient and contour */}
              {placements.map((p, idx) => (
                <g key={p.id}>
                  {/* Gradient fill */}
                  <rect
                    x={padding + p.x + centerOffsetX}
                    y={padding + p.y}
                    width={p.w}
                    height={p.h}
                    fill={`url(#stampGradient-${idx})`}
                    stroke={getDarkerColor(p.color)}
                    strokeWidth="0.4"
                    rx="0.5"
                  />
                  {/* Text label */}
                  {p.w > 3 && p.h > 2.5 && (
                    <text
                      x={padding + p.x + centerOffsetX + p.w / 2}
                      y={padding + p.y + p.h / 2}
                      fill="#9B8B7E"
                      fontSize={Math.min(p.w * 0.12, p.h * 0.18, 2.2)}
                      fontFamily="Outfit, sans-serif"
                      fontWeight="500"
                      textAnchor="middle"
                      dominantBaseline="central"
                      opacity="0.8"
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
