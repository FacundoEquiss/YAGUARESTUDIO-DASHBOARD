import { apiFetch } from "@/lib/api";
import type { DtfPricingInput } from "@/hooks/use-orders";

export interface DtfPricingResult {
  settings: {
    pricePerMeter: number;
    rollWidth: number;
    baseMargin: number;
    wholesaleMargin: number;
    pressPassThreshold: number;
    pressPassExtraCost: number;
    talleSurcharge: number;
  };
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
  placements: Array<{
    itemIndex: number;
    x: number;
    y: number;
    w: number;
    h: number;
  }>;
}

export async function fetchAuthoritativeDtfPricing(
  input: DtfPricingInput,
): Promise<{ pricing?: DtfPricingResult; error?: string }> {
  const { data, error } = await apiFetch<{ pricing: DtfPricingResult }>(
    "/pricing/dtf-quote",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );

  if (error) {
    return { error };
  }

  return { pricing: data?.pricing };
}
