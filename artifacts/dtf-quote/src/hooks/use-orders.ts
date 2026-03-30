import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";

export interface CostItem {
  id: number;
  title: string;
  amount: string;
}

export interface CostItemInput {
  title: string;
  amount: number;
}

export interface OrderItem {
  id: number;
  userId: number;
  clientId: number | null;
  clientName: string;
  title: string | null;
  description: string | null;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  status: string;
  dueDate: string | null;
  notes: string | null;
  costItems: CostItem[];
  paidAmount?: string;
  expenseAmount?: string;
  balanceDue?: string;
  netResult?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderStats {
  activeOrders: number;
  monthOrders: number;
}

export interface OrdersListResult {
  orders: OrderItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface OrdersFilters {
  status?: string;
  search?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface CreateOrderData {
  clientName: string;
  clientId?: number | null;
  title?: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status?: string;
  dueDate?: string | null;
  notes?: string;
  costItems?: CostItemInput[];
}

export function useOrders(filters: OrdersFilters = {}) {
  const [data, setData] = useState<OrdersListResult>({
    orders: [],
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.search) params.set("search", filters.search);
    if (filters.sortBy) params.set("sortBy", filters.sortBy);
    if (filters.sortDir) params.set("sortDir", filters.sortDir);
    if (filters.page) params.set("page", String(filters.page));
    if (filters.limit) params.set("limit", String(filters.limit));
    const qs = params.toString();
    const { data: result } = await apiFetch<OrdersListResult>(`/orders${qs ? `?${qs}` : ""}`);
    if (result) setData(result);
    setLoading(false);
  }, [filters.status, filters.search, filters.sortBy, filters.sortDir, filters.page, filters.limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...data, loading, refresh };
}

export function useOrderStats() {
  const [stats, setStats] = useState<OrderStats>({ activeOrders: 0, monthOrders: 0 });
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await apiFetch<OrderStats>("/orders/stats");
    if (data) setStats(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...stats, loading, refresh };
}

export function useAllOrders() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await apiFetch<OrdersListResult>("/orders?limit=50");
    if (data) setOrders(data.orders);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { orders, loading, refresh };
}

export async function createOrder(data: CreateOrderData): Promise<{ order?: OrderItem; error?: string }> {
  const { data: result, error } = await apiFetch<{ order: OrderItem }>("/orders", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (error) return { error };
  return { order: result?.order };
}

export async function updateOrder(id: number, data: Partial<CreateOrderData>): Promise<{ order?: OrderItem; error?: string }> {
  const { data: result, error } = await apiFetch<{ order: OrderItem }>(`/orders/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  if (error) return { error };
  return { order: result?.order };
}

export async function deleteOrder(id: number): Promise<{ error?: string }> {
  const { error } = await apiFetch(`/orders/${id}`, { method: "DELETE" });
  return { error };
}
