import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "./use-auth";

export interface UsageData {
  dtfQuotes: number;
  mockupPngs: number;
  pdfExports: number;
}

export interface UsageLimits {
  dtfQuotes: number;
  mockupPngs: number;
  pdfExports: number;
}

type UsageType = "dtf_quotes" | "mockup_pngs" | "pdf_exports";
type UsageMetadata = Record<string, unknown>;

interface UsageContextValue {
  usage: UsageData;
  limits: UsageLimits;
  remaining: UsageData;
  loading: boolean;
  canUse: (type: UsageType) => boolean;
  increment: (type: UsageType, metadata?: UsageMetadata) => Promise<boolean>;
  refresh: () => Promise<void>;
}

const DEFAULT_USAGE: UsageData = { dtfQuotes: 0, mockupPngs: 0, pdfExports: 0 };
const UNLIMITED: UsageLimits = { dtfQuotes: -1, mockupPngs: -1, pdfExports: -1 };

const UsageContext = createContext<UsageContextValue | null>(null);

export function UsageProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const [usage, setUsage] = useState<UsageData>(DEFAULT_USAGE);
  const [limits, setLimits] = useState<UsageLimits>(UNLIMITED);
  const [remaining, setRemaining] = useState<UsageData>(UNLIMITED);
  const [loading, setLoading] = useState(false);

  const isGuest = currentUser?.role === "guest";
  const isMaster = currentUser?.role === "master";

  const refresh = useCallback(async () => {
    if (!currentUser || isGuest || isMaster) return;
    setLoading(true);
    const { data } = await apiFetch<{
      usage: UsageData;
      limits: UsageLimits;
      remaining: UsageData;
    }>("/usage");
    if (data) {
      setUsage(data.usage);
      setLimits(data.limits);
      setRemaining(data.remaining);
    }
    setLoading(false);
  }, [currentUser, isGuest, isMaster]);

  useEffect(() => {
    if (currentUser && !isGuest && !isMaster) {
      refresh();
    }
  }, [currentUser, isGuest, isMaster, refresh]);

  const canUse = useCallback(
    (type: UsageType) => {
      if (isMaster) return true;
      if (!currentUser || isGuest) return false;
      const key = type === "dtf_quotes" ? "dtfQuotes" : type === "mockup_pngs" ? "mockupPngs" : "pdfExports";
      return limits[key] === -1 || remaining[key] > 0;
    },
    [currentUser, isGuest, isMaster, limits, remaining]
  );

  const increment = useCallback(
    async (type: UsageType, metadata?: UsageMetadata): Promise<boolean> => {
      if (isMaster) return true;
      if (!currentUser || isGuest) return false;
      const { data, error } = await apiFetch<{ current: number; limit: number; remaining: number }>(
        "/usage/increment",
        { method: "POST", body: JSON.stringify({ type, metadata }) }
      );
      if (error) return false;
      if (data) {
        const key = type === "dtf_quotes" ? "dtfQuotes" : type === "mockup_pngs" ? "mockupPngs" : "pdfExports";
        setUsage((prev) => ({ ...prev, [key]: data.current }));
        setRemaining((prev) => ({ ...prev, [key]: data.remaining }));
      }
      return true;
    },
    [currentUser, isGuest, isMaster]
  );

  return (
    <UsageContext.Provider value={{ usage, limits, remaining, loading, canUse, increment, refresh }}>
      {children}
    </UsageContext.Provider>
  );
}

export function useUsage() {
  const ctx = useContext(UsageContext);
  if (!ctx) throw new Error("useUsage must be used within UsageProvider");
  return ctx;
}
