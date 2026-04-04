import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export type ServicePricingType = "fixed" | "hourly" | "volume";

export interface ServicePricingRule {
  id: string;
  label: string;
  minQty: number;
  maxQty?: number | null;
  unitPrice: number;
}

export interface ServiceItem {
  id: number;
  userId: number;
  name: string;
  category: string | null;
  pricingType: ServicePricingType;
  pricingRules: ServicePricingRule[];
  unit: string;
  baseCost: string;
  suggestedPrice: string;
  reportArea: string | null;
  reportConcept: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServicesListResult {
  services: ServiceItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ServicesFilters {
  search?: string;
  category?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface CreateServiceData {
  name: string;
  category?: string;
  pricingType?: ServicePricingType;
  pricingRules?: ServicePricingRule[];
  unit?: string;
  baseCost?: number;
  suggestedPrice?: number;
  reportArea?: string;
  reportConcept?: string;
  notes?: string;
  isActive?: boolean;
}

export function useServices(filters: ServicesFilters = {}) {
  const [data, setData] = useState<ServicesListResult>({
    services: [],
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.category) params.set("category", filters.category);
    if (filters.sortBy) params.set("sortBy", filters.sortBy);
    if (filters.sortDir) params.set("sortDir", filters.sortDir);
    if (filters.page) params.set("page", String(filters.page));
    if (filters.limit) params.set("limit", String(filters.limit));

    const qs = params.toString();
    const { data: result } = await apiFetch<ServicesListResult>(`/services${qs ? `?${qs}` : ""}`);
    if (result) setData(result);
    setLoading(false);
  }, [filters.search, filters.category, filters.sortBy, filters.sortDir, filters.page, filters.limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...data, loading, refresh };
}

export function useAllServices() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await apiFetch<ServicesListResult>("/services?limit=100");
    setServices(data?.services || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { services, loading, refresh };
}

export async function createService(data: CreateServiceData): Promise<{ service?: ServiceItem; error?: string }> {
  const { data: result, error } = await apiFetch<{ service: ServiceItem }>("/services", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (error) return { error };
  return { service: result?.service };
}

export async function updateService(id: number, data: Partial<CreateServiceData>): Promise<{ service?: ServiceItem; error?: string }> {
  const { data: result, error } = await apiFetch<{ service: ServiceItem }>(`/services/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  if (error) return { error };
  return { service: result?.service };
}

export async function deleteService(id: number): Promise<{ error?: string }> {
  const { error } = await apiFetch(`/services/${id}`, { method: "DELETE" });
  return { error };
}
