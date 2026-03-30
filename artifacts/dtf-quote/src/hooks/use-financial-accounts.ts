import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export interface FinancialAccountItem {
  id: number;
  userId: number;
  name: string;
  accountType: string;
  currency: string;
  openingBalance: string;
  notes: string | null;
  isActive: boolean;
  incomeTotal?: string;
  expenseTotal?: string;
  currentBalance?: string;
  transactionCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFinancialAccountData {
  name: string;
  accountType?: string;
  currency?: string;
  openingBalance?: number;
  notes?: string;
  isActive?: boolean;
}

export function useFinancialAccounts(search = "") {
  const [accounts, setAccounts] = useState<FinancialAccountItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const { data } = await apiFetch<{ accounts: FinancialAccountItem[] }>(`/financial-accounts${params.toString() ? `?${params}` : ""}`);
    setAccounts(data?.accounts || []);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { accounts, loading, refresh };
}

export function useAllFinancialAccounts() {
  return useFinancialAccounts();
}

export async function createFinancialAccount(data: CreateFinancialAccountData) {
  const { data: result, error } = await apiFetch<{ account: FinancialAccountItem }>("/financial-accounts", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return { account: result?.account, error };
}

export async function updateFinancialAccount(id: number, data: Partial<CreateFinancialAccountData>) {
  const { data: result, error } = await apiFetch<{ account: FinancialAccountItem }>(`/financial-accounts/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return { account: result?.account, error };
}

export async function deleteFinancialAccount(id: number) {
  const { error } = await apiFetch(`/financial-accounts/${id}`, { method: "DELETE" });
  return { error };
}
