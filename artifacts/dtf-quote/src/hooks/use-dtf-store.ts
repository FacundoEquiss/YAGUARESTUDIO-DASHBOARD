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

async function fetchSettingsFromAPI(): Promise<DTFSettings> {
  const res = await fetch("/api/settings");
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json();
  return {
    pricePerMeter: data.pricePerMeter,
    rollWidth: data.rollWidth,
  };
}

async function pushSettingsToAPI(settings: Partial<DTFSettings>): Promise<DTFSettings> {
  const res = await fetch("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json();
  return {
    pricePerMeter: data.pricePerMeter,
    rollWidth: data.rollWidth,
  };
}

export function useDTFSettings() {
  const [settings, setSettingsState] = useState<DTFSettings>(() =>
    getStorage(SETTINGS_KEY, DEFAULT_SETTINGS)
  );
  const [settingsLoading, setSettingsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchSettingsFromAPI()
      .then((remote) => {
        if (!cancelled) {
          setSettingsState(remote);
          setStorage(SETTINGS_KEY, remote);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setSettingsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const setSettings = useCallback(async (newSettings: Partial<DTFSettings>) => {
    const merged = { ...settings, ...newSettings };
    setSettingsState(merged);
    setStorage(SETTINGS_KEY, merged);
    try {
      const confirmed = await pushSettingsToAPI(newSettings);
      setSettingsState(confirmed);
      setStorage(SETTINGS_KEY, confirmed);
    } catch (err) {
      console.error("Failed to sync settings to API:", err);
    }
  }, [settings]);

  return { settings, setSettings, settingsLoading };
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
