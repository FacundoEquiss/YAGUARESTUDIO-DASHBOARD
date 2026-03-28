import { useState, useEffect, useCallback } from "react";
import { getStorage, setStorage } from "@/lib/storage";
import { StampItem, PlacedStamp } from "@/lib/skyline";
import { v4 as uuidv4 } from "uuid";
import { apiFetch } from "@/lib/api";

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

interface UserSettingsResponse {
  id: number | null;
  userId: number;
  pricePerMeter: number;
  rollWidth: number;
  baseMargin: number;
  wholesaleMargin: number;
  pressPassThreshold: number;
  pressPassExtraCost: number;
  talleEnabled: boolean;
  talleSurcharge: number;
}

function mapApiData(raw: UserSettingsResponse): DTFSettings {
  return {
    pricePerMeter: raw.pricePerMeter ?? DEFAULT_SETTINGS.pricePerMeter,
    rollWidth: raw.rollWidth ?? DEFAULT_SETTINGS.rollWidth,
    baseMargin: raw.baseMargin ?? DEFAULT_SETTINGS.baseMargin,
    wholesaleMargin: raw.wholesaleMargin ?? DEFAULT_SETTINGS.wholesaleMargin,
    pressPassThreshold: raw.pressPassThreshold ?? DEFAULT_SETTINGS.pressPassThreshold,
    pressPassExtraCost: raw.pressPassExtraCost ?? DEFAULT_SETTINGS.pressPassExtraCost,
    talleEnabled: raw.talleEnabled ?? DEFAULT_SETTINGS.talleEnabled,
    talleSurcharge: raw.talleSurcharge ?? DEFAULT_SETTINGS.talleSurcharge,
  };
}

async function fetchUserSettings(): Promise<DTFSettings> {
  const { data, error } = await apiFetch<UserSettingsResponse>("/user-settings");
  if (error || !data) throw new Error(error || "No data");
  return mapApiData(data);
}

async function pushUserSettings(settings: Partial<DTFSettings>): Promise<DTFSettings> {
  const { data, error } = await apiFetch<UserSettingsResponse>("/user-settings", {
    method: "PUT",
    body: JSON.stringify(settings),
  });
  if (error || !data) throw new Error(error || "No data");
  return mapApiData(data);
}

export function useDTFSettings() {
  const [settings, setSettingsState] = useState<DTFSettings>(() =>
    getStorage(SETTINGS_KEY, DEFAULT_SETTINGS)
  );
  const [settingsLoading, setSettingsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchUserSettings()
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
      const confirmed = await pushUserSettings(newSettings);
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
