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

export const STAMP_COLORS = [
  "#FF9E4D",
  "#6DB3F2",
  "#5FD3BC",
  "#C9A3FF",
  "#FF8FD6",
  "#FFD580",
  "#66E3FF",
  "#FF7070",
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
  const placements: PlacedStamp[] = [];
  const errors: string[] = [];

  // Build valid groups in original item order
  const groups = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.w > 0 && item.h > 0 && (item.qty ?? 0) > 0);

  // Check width constraints
  groups.forEach(({ item }) => {
    if (item.w > usableWidth) {
      errors.push(
        `La estampa ${item.w}×${item.h}cm es más ancha que el rollo (máx ${usableWidth.toFixed(1)}cm).`
      );
    }
  });

  // Sort by area descending so larger stamps appear at the top
  const sorted = [...groups].sort(
    (a, b) => b.item.w * b.item.h - a.item.w * a.item.h
  );

  let currentY = gap;

  for (const { item, index } of sorted) {
    const color = STAMP_COLORS[index % STAMP_COLORS.length];

    if (item.w > usableWidth) continue;

    const slotW = item.w + gap;
    const slotH = item.h + gap;
    const stampsPerRow = Math.max(1, Math.floor(usableWidth / slotW));

    let col = 0;
    let rowBaseY = currentY;

    for (let i = 0; i < (item.qty ?? 0); i++) {
      if (col > 0 && col >= stampsPerRow) {
        col = 0;
        rowBaseY += slotH;
      }

      placements.push({
        id: `${item.id}-${i}`,
        itemIndex: index,
        x: gap + col * slotW,
        y: rowBaseY,
        w: item.w,
        h: item.h,
        color,
      });

      col++;
    }

    // Advance baseline to after this group's last row
    currentY = rowBaseY + slotH;
  }

  const finalHeight = Math.ceil(currentY * 10) / 10;
  return { placements, totalHeight: finalHeight, errors };
}
