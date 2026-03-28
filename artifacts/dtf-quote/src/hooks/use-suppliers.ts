import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";

export interface SupplierItem {
  id: number;
  userId: number;
  name: string;
  email: string | null;
  phone: string | null;
  businessName: string | null;
  category: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SuppliersListResult {
  suppliers: SupplierItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface SuppliersFilters {
  search?: string;
  category?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface CreateSupplierData {
  name: string;
  email?: string;
  phone?: string;
  businessName?: string;
  category?: string;
  notes?: string;
}

export function useSuppliers(filters: SuppliersFilters = {}) {
  const [data, setData] = useState<SuppliersListResult>({
    suppliers: [],
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
    const { data: result } = await apiFetch<SuppliersListResult>(`/suppliers${qs ? `?${qs}` : ""}`);
    if (result) setData(result);
    setLoading(false);
  }, [filters.search, filters.category, filters.sortBy, filters.sortDir, filters.page, filters.limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...data, loading, refresh };
}

export async function createSupplier(data: CreateSupplierData): Promise<{ supplier?: SupplierItem; error?: string }> {
  const { data: result, error } = await apiFetch<{ supplier: SupplierItem }>("/suppliers", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (error) return { error };
  return { supplier: result?.supplier };
}

export async function updateSupplier(id: number, data: Partial<CreateSupplierData>): Promise<{ supplier?: SupplierItem; error?: string }> {
  const { data: result, error } = await apiFetch<{ supplier: SupplierItem }>(`/suppliers/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  if (error) return { error };
  return { supplier: result?.supplier };
}

export async function deleteSupplier(id: number): Promise<{ error?: string }> {
  const { error } = await apiFetch(`/suppliers/${id}`, { method: "DELETE" });
  return { error };
}

export function useAllSuppliers() {
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await apiFetch<SuppliersListResult>("/suppliers?limit=50");
    if (data) setSuppliers(data.suppliers);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { suppliers, loading, refresh };
}
