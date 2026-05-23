import type { OrderItem } from "@/hooks/use-orders";

export interface OrderDraft {
  clientName: string;
  orderName: string;
  items: OrderItem[];
  notes: string;
}

const KEY = "yaguar:order-draft";

export function setOrderDraft(draft: OrderDraft): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    /* ignore */
  }
}

export function takeOrderDraft(): OrderDraft | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    return JSON.parse(raw) as OrderDraft;
  } catch {
    return null;
  }
}
