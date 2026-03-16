import { useState, useEffect, useCallback } from "react";
import { getStorage, setStorage } from "@/lib/storage";
import { StampItem, PlacedStamp } from "@/lib/skyline";
import { v4 as uuidv4 } from "uuid";

export interface DTFSettings {
  pricePerMeter: number;
  rollWidth: number;
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
}

const SETTINGS_KEY = "dtf-settings";

const DEFAULT_SETTINGS: DTFSettings = {
  pricePerMeter: 10000,
  rollWidth: 58,
};

export function useDTFSettings() {
  const [settings, setSettingsState] = useState<DTFSettings>(() =>
    getStorage(SETTINGS_KEY, DEFAULT_SETTINGS)
  );

  const setSettings = useCallback((newSettings: Partial<DTFSettings>) => {
    setSettingsState((prev) => {
      const updated = { ...prev, ...newSettings };
      setStorage(SETTINGS_KEY, updated);
      return updated;
    });
  }, []);

  return { settings, setSettings };
}

export function useDTFQuotes(userId: string = "guest") {
  const quotesKey = `dtf-quotes-${userId}`;

  const [quotes, setQuotesState] = useState<Quote[]>(() =>
    getStorage(quotesKey, [])
  );

  useEffect(() => {
    setQuotesState(getStorage(quotesKey, []));
  }, [quotesKey]);

  const saveQuote = useCallback((quoteData: Omit<Quote, "id" | "createdAt">) => {
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
  }, [quotesKey]);

  const deleteQuote = useCallback((id: string) => {
    setQuotesState((prev) => {
      const updated = prev.filter((q) => q.id !== id);
      setStorage(quotesKey, updated);
      return updated;
    });
  }, [quotesKey]);

  return { quotes, saveQuote, deleteQuote };
}
