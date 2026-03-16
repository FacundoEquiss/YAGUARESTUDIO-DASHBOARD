// 2D Strip Packing using a Skyline heuristic
// Objective: Pack rectangles (stamps) into a fixed-width continuous roll minimizing the total height used.

export interface StampItem {
  id: string;
  w: number; // width in cm
  h: number; // height in cm
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
  "#F2C4A0",
  "#E8B896",
  "#F5D0B0",
  "#DBA882",
  "#C99B78",
  "#F0C8A8",
  "#E5B08A",
  "#D4A07A",
];

export function packStamps(
  rollWidth: number,
  items: StampItem[],
  gap: number = 0.1
): { placements: PlacedStamp[]; totalHeight: number } {
  // Initialize skyline with a single flat segment at y=0 spanning the roll width
  const skyline: SkylineSegment[] = [{ x: 0, w: rollWidth, h: 0 }];
  const placements: PlacedStamp[] = [];
  let maxHeight = 0;

  // Flatten items based on quantity
  const toPack: {
    w: number;
    h: number;
    originalW: number;
    originalH: number;
    itemIndex: number;
    id: string;
    color: string;
  }[] = [];

  items.forEach((item, index) => {
    const color = STAMP_COLORS[index % STAMP_COLORS.length];
    for (let i = 0; i < (item.qty || 0); i++) {
      toPack.push({
        w: item.w + gap,
        h: item.h + gap,
        originalW: item.w,
        originalH: item.h,
        itemIndex: index,
        id: `${item.id}-${i}`,
        color,
      });
    }
  });

  // Sort pieces. A common good heuristic for bottom-left skyline is sorting by height descending, then width descending.
  // Alternatively, max dimension descending. Let's use max dimension to pack big items first.
  toPack.sort((a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h));

  for (const box of toPack) {
    // Try both orientations and pick the one that results in the lowest placement
    const p1 = findBestPlacement(skyline, rollWidth, box.w, box.h);
    const p2 = findBestPlacement(skyline, rollWidth, box.h, box.w);

    let chosen: { x: number; y: number; w: number; h: number } | null = null;

    if (p1 && p2) {
      if (p1.y <= p2.y) chosen = { ...p1, w: box.w, h: box.h };
      else chosen = { ...p2, w: box.h, h: box.w };
    } else if (p1) {
      chosen = { ...p1, w: box.w, h: box.h };
    } else if (p2) {
      chosen = { ...p2, w: box.h, h: box.w };
    }

    if (chosen) {
      placements.push({
        id: box.id,
        itemIndex: box.itemIndex,
        x: chosen.x,
        y: chosen.y,
        w: chosen.w - gap, // store original size for rendering
        h: chosen.h - gap, // store original size for rendering
        color: box.color,
      });

      updateSkyline(skyline, chosen.x, chosen.w, chosen.y + chosen.h);
      maxHeight = Math.max(maxHeight, chosen.y + chosen.h);
    } else {
      console.warn(`Could not fit box ${box.w}x${box.h} in roll width ${rollWidth}`);
    }
  }

  // Round up to nearest mm (0.1cm) for cleanliness
  const finalHeight = Math.ceil(maxHeight * 10) / 10;
  return { placements, totalHeight: finalHeight };
}

function findBestPlacement(
  skyline: SkylineSegment[],
  rollWidth: number,
  w: number,
  h: number
): { x: number; y: number } | null {
  if (w > rollWidth) return null;

  let bestY = Infinity;
  let bestX = -1;

  for (let i = 0; i < skyline.length; i++) {
    const seg = skyline[i];
    
    // Can we place it starting at this segment's x?
    if (seg.x + w <= rollWidth + 0.0001) { // Floating point tolerance
      let maxY = 0;
      let canPlace = true;

      // Check all segments that overlap with [seg.x, seg.x + w]
      for (let j = 0; j < skyline.length; j++) {
        const s = skyline[j];
        // Overlap condition: start of one is before end of other, AND end of one is after start of other
        if (s.x < seg.x + w - 0.0001 && s.x + s.w > seg.x + 0.0001) {
          maxY = Math.max(maxY, s.h);
        }
      }

      if (canPlace && maxY < bestY) {
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

    // Segment completely before insertion
    if (segEndX <= x + 0.0001) {
      newSkyline.push(seg);
    }
    // Segment completely after insertion
    else if (seg.x >= endX - 0.0001) {
      newSkyline.push(seg);
    }
    // Segment overlaps
    else {
      if (seg.x < x - 0.0001) {
        // Left leftover
        newSkyline.push({ x: seg.x, w: x - seg.x, h: seg.h });
      }
      if (segEndX > endX + 0.0001) {
        // Right leftover
        newSkyline.push({ x: endX, w: segEndX - endX, h: seg.h });
      }
    }
  }

  // Add the new horizontal segment
  newSkyline.push({ x, w, h: newH });

  // Sort from left to right
  newSkyline.sort((a, b) => a.x - b.x);

  // Merge adjacent segments with the same height to optimize
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

  // Mutate original array
  skyline.length = 0;
  skyline.push(...merged);
}
