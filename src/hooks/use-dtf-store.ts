import { useCallback, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { getStorage, setStorage } from "@/lib/storage";
import type { PlacedStamp, StampItem } from "@/lib/skyline";
import { useAuth } from "@/hooks/use-auth";
import { useFirestoreDoc } from "@/hooks/use-firestore-doc";

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

export const DEFAULT_SETTINGS: DTFSettings = {
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
  const { currentUser } = useAuth();
  const uid = currentUser?.uid ?? null;
  const { data, loading, exists, save } = useFirestoreDoc<DTFSettings>([
    "users",
    uid,
    "dtfSettings",
    "default",
  ]);

  const settings: DTFSettings = data ? { ...DEFAULT_SETTINGS, ...data } : DEFAULT_SETTINGS;

  // Seed default settings the first time the user opens the calculator.
  useEffect(() => {
    if (!uid || loading || exists) return;
    void save(DEFAULT_SETTINGS);
  }, [uid, loading, exists, save]);

  const setSettings = useCallback(
    async (next: Partial<DTFSettings>) => {
      if (!uid) return;
      await save(next);
    },
    [uid, save],
  );

  return { settings, setSettings, settingsLoading: loading };
}

export function useDTFQuotes() {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid ?? "anonymous";
  const quotesKey = `dtf-quotes-${uid}`;

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
