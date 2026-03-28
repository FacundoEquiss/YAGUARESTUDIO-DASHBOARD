import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";

export interface ClientItem {
  id: number;
  userId: number;
  name: string;
  email: string | null;
  phone: string | null;
  businessName: string | null;
  notes: string | null;
  orderCount: number;
  totalRevenue: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientDetail {
  client: ClientItem;
  orders: Array<{
    id: number;
    clientName: string;
    description: string | null;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
    status: string;
    dueDate: string | null;
    createdAt: string;
  }>;
  stats: {
    orderCount: number;
    totalRevenue: string;
  };
}

export interface ClientsListResult {
  clients: ClientItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ClientsFilters {
  search?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface CreateClientData {
  name: string;
  email?: string;
  phone?: string;
  businessName?: string;
  notes?: string;
}

export function useClients(filters: ClientsFilters = {}) {
  const [data, setData] = useState<ClientsListResult>({
    clients: [],
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
    if (filters.sortBy) params.set("sortBy", filters.sortBy);
    if (filters.sortDir) params.set("sortDir", filters.sortDir);
    if (filters.page) params.set("page", String(filters.page));
    if (filters.limit) params.set("limit", String(filters.limit));
    const qs = params.toString();
    const { data: result } = await apiFetch<ClientsListResult>(`/clients${qs ? `?${qs}` : ""}`);
    if (result) setData(result);
    setLoading(false);
  }, [filters.search, filters.sortBy, filters.sortDir, filters.page, filters.limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...data, loading, refresh };
}

export function useAllClients() {
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await apiFetch<ClientsListResult>("/clients?limit=50");
    if (data) setClients(data.clients);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { clients, loading, refresh };
}

export async function fetchClientDetail(id: number): Promise<ClientDetail | null> {
  const { data } = await apiFetch<ClientDetail>(`/clients/${id}`);
  return data ?? null;
}

export async function createClient(data: CreateClientData): Promise<{ client?: ClientItem; error?: string }> {
  const { data: result, error } = await apiFetch<{ client: ClientItem }>("/clients", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (error) return { error };
  return { client: result?.client };
}

export async function updateClient(id: number, data: Partial<CreateClientData>): Promise<{ client?: ClientItem; error?: string }> {
  const { data: result, error } = await apiFetch<{ client: ClientItem }>(`/clients/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  if (error) return { error };
  return { client: result?.client };
}

export async function deleteClient(id: number): Promise<{ error?: string }> {
  const { error } = await apiFetch(`/clients/${id}`, { method: "DELETE" });
  return { error };
}
