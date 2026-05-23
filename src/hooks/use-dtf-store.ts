import { useCallback, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { getStorage, setStorage } from "@/lib/storage";
import type { PlacedStamp, StampItem } from "@/lib/skyline";

export interface DTFSettings {
  pricePerMeter: number;
  rollWidth: number;
  baseMargin: number;
  wholesaleMargin: number;
  pressPassThreshold: number;
  pressPassExtraCost: number;
  talleEnabled: boolean;
  talleSurcharge: number;
}

export interface Quote {
  id: string;
  clientName: string;
  orderName?: string;
  notes: string;
  stamps: StampItem[];
  placements: PlacedStamp[];
  totalHeight: number;
  linearMeters: number;
  totalPrice: number;
  rollWidth: number;
  createdAt: number;
  garmentsCount?: number;
  pricePerGarment?: number;
  pressPasses?: number;
  talleEnabled?: boolean;
}

const SETTINGS_KEY = "dtf-settings";

const DEFAULT_SETTINGS: DTFSettings = {
  pricePerMeter: 10000,
  rollWidth: 58,
  baseMargin: 2000,
  wholesaleMargin: 1200,
  pressPassThreshold: 2,
  pressPassExtraCost: 800,
  talleEnabled: false,
  talleSurcharge: 0,
};

export function useDTFSettings() {
  const [settings, setSettingsState] = useState<DTFSettings>(() => getStorage(SETTINGS_KEY, DEFAULT_SETTINGS));

  const setSettings = useCallback((newSettings: Partial<DTFSettings>) => {
    setSettingsState((prev) => {
      const merged = { ...prev, ...newSettings };
      setStorage(SETTINGS_KEY, merged);
      return merged;
    });
  }, []);

  return { settings, setSettings, settingsLoading: false };
}

export function useDTFQuotes(userId: string = "local") {
  const quotesKey = `dtf-quotes-${userId}`;

  const [quotes, setQuotesState] = useState<Quote[]>(() => getStorage(quotesKey, []));

  useEffect(() => {
    setQuotesState(getStorage(quotesKey, []));
  }, [quotesKey]);

  const saveQuote = useCallback(
    (quoteData: Omit<Quote, "id" | "createdAt">) => {
      const newQuote: Quote = {
        ...quoteData,
        id: uuidv4(),
        createdAt: Date.now(),
      };

      setQuotesState((prev) => {
        const updated = [newQuote, ...prev];
        setStorage(quotesKey, updated);
        return updated;
      });

      return newQuote;
    },
    [quotesKey],
  );

  const deleteQuote = useCallback(
    (id: string) => {
      setQuotesState((prev) => {
        const updated = prev.filter((q) => q.id !== id);
        setStorage(quotesKey, updated);
        return updated;
      });
    },
    [quotesKey],
  );

  return { quotes, saveQuote, deleteQuote };
}
