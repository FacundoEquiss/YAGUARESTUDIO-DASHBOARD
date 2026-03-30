import type { CreateOrderData } from "@/hooks/use-orders";
import type { CreateTransactionData } from "@/hooks/use-transactions";

const ORDER_DRAFT_KEY = "orders:draft";
const FINANCE_DRAFT_KEY = "finance:draft";

function readDraft<T>(key: string): Partial<T> | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as Partial<T>;
  } catch {
    return null;
  }
}

function writeDraft<T>(key: string, value: Partial<T>) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(key, JSON.stringify(value));
}

function clearDraft(key: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(key);
}

export function loadOrderDraft(): Partial<CreateOrderData> | null {
  return readDraft<CreateOrderData>(ORDER_DRAFT_KEY);
}

export function saveOrderDraft(value: Partial<CreateOrderData>) {
  writeDraft<CreateOrderData>(ORDER_DRAFT_KEY, value);
}

export function clearOrderDraft() {
  clearDraft(ORDER_DRAFT_KEY);
}

export function loadFinanceDraft(): Partial<CreateTransactionData> | null {
  return readDraft<CreateTransactionData>(FINANCE_DRAFT_KEY);
}

export function saveFinanceDraft(value: Partial<CreateTransactionData>) {
  writeDraft<CreateTransactionData>(FINANCE_DRAFT_KEY, value);
}

export function clearFinanceDraft() {
  clearDraft(FINANCE_DRAFT_KEY);
}
