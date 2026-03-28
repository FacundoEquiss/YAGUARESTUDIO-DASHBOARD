import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "./use-auth";

export interface UsageEventItem {
  id: number;
  eventType: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export function useUsageEvents(days = 7) {
  const { currentUser } = useAuth();
  const [events, setEvents] = useState<UsageEventItem[]>([]);
  const [loading, setLoading] = useState(false);

  const isGuest = currentUser?.role === "guest";

  const refresh = useCallback(async () => {
    if (!currentUser || isGuest) return;
    setLoading(true);
    const { data } = await apiFetch<{ events: UsageEventItem[] }>(
      `/usage/events?days=${days}`
    );
    if (data) {
      setEvents(data.events);
    }
    setLoading(false);
  }, [currentUser, isGuest, days]);

  useEffect(() => {
    if (currentUser && !isGuest) {
      refresh();
    }
  }, [currentUser, isGuest, refresh]);

  return { events, loading, refresh };
}
