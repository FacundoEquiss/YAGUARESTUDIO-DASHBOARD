import { useAuth } from "@/hooks/use-auth";
import { useFirestoreCollection } from "@/hooks/use-firestore-collection";

export type OrderStatus = "draft" | "in_progress" | "ready" | "delivered" | "cancelled";
export type PaymentStatus = "unpaid" | "partial" | "paid";

export interface OrderItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  clientId: string;
  clientName: string;
  orderName: string;
  items: OrderItem[];
  total: number;
  paidAmount: number;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  dueDate: string;
  notes: string;
  createdAt?: { seconds: number; nanoseconds: number } | null;
  updatedAt?: { seconds: number; nanoseconds: number } | null;
}

export type OrderInput = Omit<Order, "id" | "createdAt" | "updatedAt">;

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  draft: "Borrador",
  in_progress: "En proceso",
  ready: "Listo",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  draft: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  in_progress: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  ready: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  delivered: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  cancelled: "bg-red-500/15 text-red-400 border-red-500/30",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: "Sin cobrar",
  partial: "Parcial",
  paid: "Cobrado",
};

export function useOrders() {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid ?? null;
  return useFirestoreCollection<Order>(["users", uid, "orders"], {
    orderByField: "createdAt",
    orderDirection: "desc",
  });
}
