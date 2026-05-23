import { useAuth } from "@/hooks/use-auth";
import { useFirestoreCollection } from "@/hooks/use-firestore-collection";

export type AccountType = "bank" | "wallet" | "cash" | "other";

export interface FinancialAccount {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  description: string;
  createdAt?: { seconds: number; nanoseconds: number } | null;
  updatedAt?: { seconds: number; nanoseconds: number } | null;
}

export type FinancialAccountInput = Omit<FinancialAccount, "id" | "createdAt" | "updatedAt">;

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  bank: "Cuenta bancaria",
  wallet: "Billetera virtual",
  cash: "Efectivo",
  other: "Otro",
};

export function useFinancialAccounts() {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid ?? null;
  return useFirestoreCollection<FinancialAccount>(["users", uid, "financialAccounts"], {
    orderByField: "createdAt",
    orderDirection: "desc",
  });
}
