import { packStamps, type StampItem, type PlacedStamp } from "@/lib/skyline";

export interface DtfPricingSettings {
  pricePerMeter: number;
  rollWidth: number;
  baseMargin: number;
  wholesaleMargin: number;
  pressPassThreshold: number;
  pressPassExtraCost: number;
  talleSurcharge: number;
}

export interface DtfPricingInput {
  garments: number;
  pressPasses: number;
  talleActive: boolean;
  stamps: StampItem[];
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
  placements: PlacedStamp[];
  errors: string[];
}

export class DtfPricingError extends Error {}

export function calculateDtfPricing(
  input: DtfPricingInput,
  settings: DtfPricingSettings,
): DtfPricingResult {
  const garments = Math.max(1, Number(input.garments) || 0);
  const pressPasses = Math.max(0, Number(input.pressPasses) || 0);
  const talleActive = Boolean(input.talleActive);

  const validStamps = input.stamps.filter((s) => s.w > 0 && s.h > 0 && s.qty > 0);

  if (validStamps.length === 0) {
    return {
      settings,
      garments,
      pressPasses,
      talleActive,
      totalHeight: 0,
      linearMeters: 0,
      rawCost: 0,
      dtfCostPerGarment: 0,
      pressPassExtra: 0,
      talleSurchargeAmount: 0,
      pricePerGarment: 0,
      totalOrder: 0,
      pricePerGarmentWholesale: 0,
      totalOrderWholesale: 0,
      placements: [],
      errors: [],
    };
  }

  const packed = packStamps(settings.rollWidth, validStamps);

  const linearMeters = packed.totalHeight / 100;
  const rawCost = linearMeters * settings.pricePerMeter;
  const dtfCostPerGarment = rawCost / garments;

  const pressPassExtra =
    pressPasses > settings.pressPassThreshold
      ? (pressPasses - settings.pressPassThreshold) * settings.pressPassExtraCost
      : 0;

  const talleSurchargeAmount = talleActive ? settings.talleSurcharge : 0;

  const pricePerGarment =
    Math.ceil(
      (dtfCostPerGarment + settings.baseMargin + pressPassExtra + talleSurchargeAmount) / 100,
    ) * 100;

  const pricePerGarmentWholesale =
    Math.ceil(
      (dtfCostPerGarment + settings.wholesaleMargin + pressPassExtra + talleSurchargeAmount) / 100,
    ) * 100;

  return {
    settings,
    garments,
    pressPasses,
    talleActive,
    totalHeight: packed.totalHeight,
    linearMeters,
    rawCost,
    dtfCostPerGarment,
    pressPassExtra,
    talleSurchargeAmount,
    pricePerGarment,
    totalOrder: pricePerGarment * garments,
    pricePerGarmentWholesale,
    totalOrderWholesale: pricePerGarmentWholesale * garments,
    placements: packed.placements,
    errors: packed.errors,
  };
}
