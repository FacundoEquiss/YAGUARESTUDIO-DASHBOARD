import { useAuth } from "@/hooks/use-auth";
import { useFirestoreCollection } from "@/hooks/use-firestore-collection";

export type TransactionType = "income" | "expense";
export type PaymentMethod = "cash" | "transfer" | "card" | "mercadopago" | "other";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: string;
  accountId: string;
  relatedOrderId: string;
  relatedClientId: string;
  relatedSupplierId: string;
  paymentMethod: PaymentMethod;
  notes: string;
  createdAt?: { seconds: number; nanoseconds: number } | null;
  updatedAt?: { seconds: number; nanoseconds: number } | null;
}

export type TransactionInput = Omit<Transaction, "id" | "createdAt" | "updatedAt">;

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  card: "Tarjeta",
  mercadopago: "Mercado Pago",
  other: "Otro",
};

export const INCOME_CATEGORIES = [
  "Ventas",
  "Cobro pendiente",
  "Servicios",
  "Otros ingresos",
];

export const EXPENSE_CATEGORIES = [
  "Insumos DTF",
  "Telas / Prendas",
  "Servicios",
  "Alquiler",
  "Impuestos",
  "Marketing",
  "Sueldos",
  "Logística",
  "Otros gastos",
];

export function useTransactions() {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid ?? null;
  return useFirestoreCollection<Transaction>(["users", uid, "transactions"], {
    orderByField: "date",
    orderDirection: "desc",
  });
}
