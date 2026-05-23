import { useAuth } from "@/hooks/use-auth";
import { useFirestoreCollection } from "@/hooks/use-firestore-collection";

export interface Product {
  id: string;
  name: string;
  category: string;
  sku: string;
  size: string;
  color: string;
  stock: number;
  minStock: number;
  unitCost: number;
  unitPrice: number;
  supplierId: string;
  supplierName: string;
  notes: string;
  createdAt?: { seconds: number; nanoseconds: number } | null;
  updatedAt?: { seconds: number; nanoseconds: number } | null;
}

export type ProductInput = Omit<Product, "id" | "createdAt" | "updatedAt">;

export const PRODUCT_CATEGORIES = [
  "Remeras",
  "Buzos",
  "Gorras",
  "Pantalones",
  "Tela DTF",
  "Tintas",
  "Otros",
];

export function useProducts() {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid ?? null;
  return useFirestoreCollection<Product>(["users", uid, "products"], {
    orderByField: "createdAt",
    orderDirection: "desc",
  });
}
