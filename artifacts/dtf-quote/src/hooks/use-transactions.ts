import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";

export interface TransactionItem {
  id: number;
  userId: number;
  type: "income" | "expense";
  amount: string;
  description: string | null;
  category: string;
  clientId: number | null;
  supplierId: number | null;
  orderId: number | null;
  date: string;
  createdAt: string;
  updatedAt: string;
  clientName: string | null;
  supplierName: string | null;
}

export interface TransactionsListResult {
  transactions: TransactionItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TransactionSummary {
  monthIncome: string;
  monthExpenses: string;
  balance: string;
  incomeByCategory: { category: string; total: string }[];
  expenseByCategory: { category: string; total: string }[];
  monthlyChart: { month: string; income: string; expenses: string }[];
}

export interface BalancesResult {
  clientBalances: {
    clientId: number;
    clientName: string;
    totalIncome: string;
    totalExpense: string;
    transactionCount: number;
  }[];
  supplierBalances: {
    supplierId: number;
    supplierName: string;
    totalExpense: string;
    totalIncome: string;
    transactionCount: number;
  }[];
}

interface TransactionsFilters {
  type?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface CreateTransactionData {
  type: "income" | "expense";
  amount: number;
  description?: string;
  category: string;
  clientId?: number | null;
  supplierId?: number | null;
  orderId?: number | null;
  date?: string;
}

export function useTransactions(filters: TransactionsFilters = {}) {
  const [data, setData] = useState<TransactionsListResult>({
    transactions: [],
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.type) params.set("type", filters.type);
    if (filters.category) params.set("category", filters.category);
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.set("dateTo", filters.dateTo);
    if (filters.search) params.set("search", filters.search);
    if (filters.sortBy) params.set("sortBy", filters.sortBy);
    if (filters.sortDir) params.set("sortDir", filters.sortDir);
    if (filters.page) params.set("page", String(filters.page));
    if (filters.limit) params.set("limit", String(filters.limit));
    const qs = params.toString();
    const { data: result } = await apiFetch<TransactionsListResult>(`/transactions${qs ? `?${qs}` : ""}`);
    if (result) setData(result);
    setLoading(false);
  }, [filters.type, filters.category, filters.dateFrom, filters.dateTo, filters.search, filters.sortBy, filters.sortDir, filters.page, filters.limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...data, loading, refresh };
}

export function useTransactionSummary() {
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await apiFetch<TransactionSummary>("/transactions/summary");
    if (data) setSummary(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { summary, loading, refresh };
}

export function useBalances() {
  const [balances, setBalances] = useState<BalancesResult | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await apiFetch<BalancesResult>("/transactions/balances");
    if (data) setBalances(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { balances, loading, refresh };
}

export async function createTransaction(data: CreateTransactionData): Promise<{ transaction?: TransactionItem; error?: string }> {
  const { data: result, error } = await apiFetch<{ transaction: TransactionItem }>("/transactions", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (error) return { error };
  return { transaction: result?.transaction };
}

export async function updateTransaction(id: number, data: Partial<CreateTransactionData>): Promise<{ transaction?: TransactionItem; error?: string }> {
  const { data: result, error } = await apiFetch<{ transaction: TransactionItem }>(`/transactions/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  if (error) return { error };
  return { transaction: result?.transaction };
}

export async function deleteTransaction(id: number): Promise<{ error?: string }> {
  const { error } = await apiFetch(`/transactions/${id}`, { method: "DELETE" });
  return { error };
}
