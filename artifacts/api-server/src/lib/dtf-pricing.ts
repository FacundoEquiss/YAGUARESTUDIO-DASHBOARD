import { db, dtfGlobalSettings, userDtfSettings } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface PricingStampInput {
  id?: string;
  w: number;
  h: number;
  qty: number;
  title?: string;
}

export interface DtfPricingInput {
  garments: number;
  pressPasses: number;
  talleActive: boolean;
  stamps: PricingStampInput[];
}

export interface DtfPricingSettings {
  pricePerMeter: number;
  rollWidth: number;
  baseMargin: number;
  wholesaleMargin: number;
  pressPassThreshold: number;
  pressPassExtraCost: number;
  talleSurcharge: number;
}

export interface PricingPlacement {
  itemIndex: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DtfPricingResult {
  settings: DtfPricingSettings;
  garments: number;
  pressPasses: number;
  talleActive: boolean;
  totalHeight: number;
  linearMeters: number;
  rawCost: number;
  dtfCostPerGarment: number;
  pressPassExtra: number;
  talleSurchargeAmount: number;
  pricePerGarment: number;
  totalOrder: number;
  pricePerGarmentWholesale: number;
  totalOrderWholesale: number;
  placements: PricingPlacement[];
}

interface SkylineSegment {
  x: number;
  w: number;
  h: number;
}

interface BoxToPack {
  w: number;
  h: number;
  itemIndex: number;
}

export class DtfPricingError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

async function getPricingSettingsForUser(userId: number): Promise<DtfPricingSettings> {
  const [userSettings] = await db
    .select()
    .from(userDtfSettings)
    .where(eq(userDtfSettings.userId, userId));

  if (userSettings) {
    return {
      pricePerMeter: Number(userSettings.pricePerMeter),
      rollWidth: Number(userSettings.rollWidth),
      baseMargin: Number(userSettings.baseMargin),
      wholesaleMargin: Number(userSettings.wholesaleMargin),
      pressPassThreshold: Number(userSettings.pressPassThreshold),
      pressPassExtraCost: Number(userSettings.pressPassExtraCost),
      talleSurcharge: Number(userSettings.talleSurcharge),
    };
  }

  const [globalSettings] = await db
    .select()
    .from(dtfGlobalSettings)
    .where(eq(dtfGlobalSettings.id, 1));

  return {
    pricePerMeter: Number(globalSettings?.pricePerMeter ?? 10000),
    rollWidth: Number(globalSettings?.rollWidth ?? 58),
    baseMargin: 2000,
    wholesaleMargin: 1200,
    pressPassThreshold: 2,
    pressPassExtraCost: 800,
    talleSurcharge: 0,
  };
}

function findBestPlacement(
  skyline: SkylineSegment[],
  usableWidth: number,
  w: number,
): { x: number; y: number } | null {
  if (w > usableWidth + 0.0001) return null;

  let bestY = Infinity;
  let bestX = -1;

  for (let i = 0; i < skyline.length; i += 1) {
    const seg = skyline[i];

    if (seg.x + w <= usableWidth + 0.0001) {
      let maxY = 0;

      for (let j = 0; j < skyline.length; j += 1) {
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

function updateSkyline(
  skyline: SkylineSegment[],
  x: number,
  w: number,
  newH: number,
): void {
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

  const merged: SkylineSegment[] = [];
  for (const seg of newSkyline) {
    const last = merged[merged.length - 1];
    if (
      last &&
      Math.abs(last.h - seg.h) < 0.0001 &&
      Math.abs(last.x + last.w - seg.x) < 0.0001
    ) {
      last.w += seg.w;
    } else {
      merged.push({ ...seg });
    }
  }

  skyline.length = 0;
  skyline.push(...merged);
}

function computePackedHeight(
  rollWidth: number,
  stamps: PricingStampInput[],
  gap = 0.15,
): { totalHeight: number; placements: PricingPlacement[] } {
  const usableWidth = rollWidth - gap * 2;
  if (usableWidth <= 0) {
    throw new DtfPricingError("El ancho de rollo configurado es inválido.");
  }

  const skyline: SkylineSegment[] = [{ x: 0, w: usableWidth, h: 0 }];
  const placements: PricingPlacement[] = [];
  const toPack: BoxToPack[] = [];

  stamps.forEach((stamp, index) => {
    if (stamp.w <= 0 || stamp.h <= 0 || stamp.qty <= 0) {
      return;
    }

    if (stamp.w > usableWidth) {
      throw new DtfPricingError(
        `La estampa ${stamp.w}x${stamp.h}cm excede el ancho útil del rollo (${usableWidth.toFixed(1)}cm).`,
      );
    }

    for (let i = 0; i < stamp.qty; i += 1) {
      toPack.push({ w: stamp.w, h: stamp.h, itemIndex: index });
    }
  });

  if (toPack.length === 0) {
    throw new DtfPricingError("Debes enviar al menos una estampa válida.");
  }

  toPack.sort((a, b) => {
    if (a.itemIndex !== b.itemIndex) return a.itemIndex - b.itemIndex;
    return Math.max(b.w, b.h) - Math.max(a.w, a.h);
  });

  let maxHeight = 0;

  for (const box of toPack) {
    const stampW = box.w + gap;
    const stampH = box.h + gap;
    const placement = findBestPlacement(skyline, usableWidth, stampW);

    if (!placement) {
      throw new DtfPricingError(
        `No se pudo ubicar una estampa de ${box.w}x${box.h}cm dentro del rollo.`,
      );
    }

    placements.push({
      itemIndex: box.itemIndex,
      x: gap + placement.x,
      y: gap + placement.y,
      w: box.w,
      h: box.h,
    });

    updateSkyline(skyline, placement.x, stampW, placement.y + stampH);
    maxHeight = Math.max(maxHeight, placement.y + stampH);
  }

  const totalHeight = Math.ceil((maxHeight + gap) * 10) / 10;
  return { totalHeight, placements };
}

export async function calculateDtfPricingForUser(
  userId: number,
  rawInput: DtfPricingInput,
): Promise<DtfPricingResult> {
  const settings = await getPricingSettingsForUser(userId);

  const garments = Math.max(1, Number(rawInput.garments) || 0);
  const pressPasses = Math.max(0, Number(rawInput.pressPasses) || 0);
  const talleActive = Boolean(rawInput.talleActive);

  if (!Array.isArray(rawInput.stamps)) {
    throw new DtfPricingError("El payload de estampas es inválido.");
  }

  const stamps = rawInput.stamps.map((stamp) => ({
    ...stamp,
    w: Number(stamp.w) || 0,
    h: Number(stamp.h) || 0,
    qty: Math.max(0, Math.floor(Number(stamp.qty) || 0)),
  }));

  const { totalHeight, placements } = computePackedHeight(settings.rollWidth, stamps);
  const linearMeters = totalHeight / 100;
  const rawCost = linearMeters * settings.pricePerMeter;
  const dtfCostPerGarment = rawCost / garments;

  const pressPassExtra =
    pressPasses > settings.pressPassThreshold
      ? (pressPasses - settings.pressPassThreshold) * settings.pressPassExtraCost
      : 0;

  const talleSurchargeAmount = talleActive ? settings.talleSurcharge : 0;

  const pricePerGarment =
    Math.ceil((dtfCostPerGarment + settings.baseMargin + pressPassExtra + talleSurchargeAmount) / 100) * 100;

  const pricePerGarmentWholesale =
    Math.ceil((dtfCostPerGarment + settings.wholesaleMargin + pressPassExtra + talleSurchargeAmount) / 100) * 100;

  const totalOrder = pricePerGarment * garments;
  const totalOrderWholesale = pricePerGarmentWholesale * garments;

  return {
    settings,
    garments,
    pressPasses,
    talleActive,
    totalHeight,
    linearMeters,
    rawCost,
    dtfCostPerGarment,
    pressPassExtra,
    talleSurchargeAmount,
    pricePerGarment,
    totalOrder,
    pricePerGarmentWholesale,
    totalOrderWholesale,
    placements,
  };
}
