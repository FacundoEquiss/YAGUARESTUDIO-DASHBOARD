export interface StampItem {
  id: string;
  w: number;
  h: number;
  qty: number;
  color?: string;
}

export interface PlacedStamp {
  id: string;
  itemIndex: number;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

interface SkylineSegment {
  x: number;
  w: number;
  h: number;
}

export const STAMP_COLORS = [
  "#F5D0B0",  // Soft Orange
  "#A5D4F5",  // Soft Blue
  "#A5E8C5",  // Soft Green
  "#D4C5F5",  // Soft Purple
  "#F5C5E5",  // Soft Pink
  "#F5E0B0",  // Soft Amber
  "#B0E8F5",  // Soft Cyan
  "#F5B0B0",  // Soft Red
];

export interface PackResult {
  placements: PlacedStamp[];
  totalHeight: number;
  errors: string[];
}

export function packStamps(
  rollWidth: number,
  items: StampItem[],
  gap: number = 0.1
): PackResult {
  const usableWidth = rollWidth - gap * 2;
  const skyline: SkylineSegment[] = [{ x: 0, w: usableWidth, h: 0 }];
  const placements: PlacedStamp[] = [];
  const errors: string[] = [];
  let maxHeight = 0;

  const toPack: {
    w: number;
    h: number;
    itemIndex: number;
    id: string;
    color: string;
    label: string;
  }[] = [];

  items.forEach((item, index) => {
    const color = STAMP_COLORS[index % STAMP_COLORS.length];

    if (item.w > usableWidth || item.h > usableWidth) {
      if (item.w > usableWidth) {
        errors.push(`La estampa ${item.w}×${item.h}cm es más ancha que el rollo (máx ${(usableWidth).toFixed(1)}cm).`);
      }
    }

    for (let i = 0; i < (item.qty || 0); i++) {
      toPack.push({
        w: item.w,
        h: item.h,
        itemIndex: index,
        id: `${item.id}-${i}`,
        color,
        label: `${item.w}×${item.h}`,
      });
    }
  });

  toPack.sort((a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h));

  for (const box of toPack) {
    const stampW = box.w + gap;
    const stampH = box.h + gap;

    const placement = findBestPlacement(skyline, usableWidth, stampW, stampH);

    if (placement) {
      const absX = gap + placement.x;
      const absY = gap + placement.y;

      placements.push({
        id: box.id,
        itemIndex: box.itemIndex,
        x: absX,
        y: absY,
        w: box.w,
        h: box.h,
        color: box.color,
      });

      updateSkyline(skyline, placement.x, stampW, placement.y + stampH);
      maxHeight = Math.max(maxHeight, placement.y + stampH);
    } else {
      errors.push(`No se pudo ubicar la estampa ${box.label}cm en el rollo.`);
    }
  }

  const finalHeight = Math.ceil((maxHeight + gap) * 10) / 10;
  return { placements, totalHeight: finalHeight, errors };
}

function findBestPlacement(
  skyline: SkylineSegment[],
  usableWidth: number,
  w: number,
  h: number
): { x: number; y: number } | null {
  if (w > usableWidth + 0.0001) return null;

  let bestY = Infinity;
  let bestX = -1;

  for (let i = 0; i < skyline.length; i++) {
    const seg = skyline[i];

    if (seg.x + w <= usableWidth + 0.0001) {
      let maxY = 0;

      for (let j = 0; j < skyline.length; j++) {
        const s = skyline[j];
        if (s.x < seg.x + w - 0.0001 && s.x + s.w > seg.x + 0.0001) {
          maxY = Math.max(maxY, s.h);
        }
      }

      if (maxY < bestY) {
        bestY = maxY;
        bestX = seg.x;
      }
    }
  }

  if (bestX === -1) return null;
  return { x: bestX, y: bestY };
}

function updateSkyline(skyline: SkylineSegment[], x: number, w: number, newH: number) {
  const newSkyline: SkylineSegment[] = [];
  const endX = x + w;

  for (const seg of skyline) {
    const segEndX = seg.x + seg.w;

    if (segEndX <= x + 0.0001) {
      newSkyline.push(seg);
    } else if (seg.x >= endX - 0.0001) {
      newSkyline.push(seg);
    } else {
      if (seg.x < x - 0.0001) {
        newSkyline.push({ x: seg.x, w: x - seg.x, h: seg.h });
      }
      if (segEndX > endX + 0.0001) {
        newSkyline.push({ x: endX, w: segEndX - endX, h: seg.h });
      }
    }
  }

  newSkyline.push({ x, w, h: newH });
  newSkyline.sort((a, b) => a.x - b.x);

  const merged: SkylineSegment[] = [newSkyline[0]];
  for (let i = 1; i < newSkyline.length; i++) {
    const last = merged[merged.length - 1];
    const curr = newSkyline[i];

    if (Math.abs(last.h - curr.h) < 0.0001 && Math.abs((last.x + last.w) - curr.x) < 0.0001) {
      last.w += curr.w;
    } else {
      merged.push(curr);
    }
  }

  skyline.length = 0;
  skyline.push(...merged);
}
