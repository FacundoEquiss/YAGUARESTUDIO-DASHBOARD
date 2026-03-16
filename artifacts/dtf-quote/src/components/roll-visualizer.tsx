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
  // Convert totalHeight (cm) to meters for display
  const meters = (totalHeight / 100).toFixed(3);

  // viewBox: 0 0 width height
  // Adding small padding for border visibility
  const padding = 2;
  const vWidth = rollWidth + padding * 2;
  const vHeight = Math.max(totalHeight + padding * 2, 20); // Minimum visual height

  return (
    <div className={cn("w-full bg-white rounded-2xl border border-border shadow-inner overflow-hidden flex flex-col", className)}>
      {/* Header / Legend Area */}
      <div className="bg-secondary/50 px-4 py-3 border-b border-border flex justify-between items-center z-10">
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

      {/* SVG Canvas wrapper */}
      <div className="relative w-full max-h-[500px] overflow-y-auto custom-scrollbar p-6 bg-gradient-to-b from-white to-secondary/30">
        {placements.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm font-medium">
            Agrega estampas para ver la previsualización
          </div>
        ) : (
          <div className="rounded-3xl p-6 bg-gray-900 shadow-2xl inline-block">
            <svg
              viewBox={`0 0 ${vWidth} ${vHeight}`}
              className="w-full h-auto origin-top transition-all duration-500 ease-out drop-shadow-xl"
              preserveAspectRatio="xMidYMin meet"
              style={{ maxWidth: "100%", height: "auto" }}
            >
              {/* The Roll Background */}
              <rect
                x={padding}
                y={padding}
                width={rollWidth}
                height={totalHeight}
                fill="#FFFFFF"
                stroke="#D4A574"
                strokeWidth="1.5"
                rx="2"
              />

            {/* Grid Lines (Optional, for scale) */}
            <g stroke="#F3F0EC" strokeWidth="0.2">
              {Array.from({ length: Math.ceil(rollWidth / 10) }).map((_, i) => (
                <line key={`v-${i}`} x1={padding + i * 10} y1={padding} x2={padding + i * 10} y2={padding + totalHeight} />
              ))}
              {Array.from({ length: Math.ceil(totalHeight / 10) }).map((_, i) => (
                <line key={`h-${i}`} x1={padding} y1={padding + i * 10} x2={padding + rollWidth} y2={padding + i * 10} />
              ))}
            </g>

            {/* Stamps */}
            {placements.map((p) => (
              <g key={p.id} className="transition-all duration-300 hover:opacity-90 cursor-pointer">
                <rect
                  x={padding + p.x}
                  y={padding + p.y}
                  width={p.w}
                  height={p.h}
                  fill={p.color}
                  stroke="rgba(0,0,0,0.1)"
                  strokeWidth="0.3"
                  rx="0.5"
                />
                {/* Only show text if box is big enough to read comfortably */}
                {p.w > 4 && p.h > 3 && (
                  <text
                    x={padding + p.x + p.w / 2}
                    y={padding + p.y + p.h / 2}
                    fill="#7C5A3A"
                    fontSize={Math.min(p.w * 0.18, p.h * 0.25, 5)}
                    fontFamily="Outfit, sans-serif"
                    fontWeight="600"
                    textAnchor="middle"
                    dominantBaseline="central"
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
