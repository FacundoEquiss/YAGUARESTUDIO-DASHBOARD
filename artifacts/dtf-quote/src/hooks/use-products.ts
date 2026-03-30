import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export interface ProductItem {
  id: number;
  userId: number;
  supplierId: number | null;
  name: string;
  sku: string | null;
  category: string | null;
  unit: string;
  salePrice: string;
  costPrice: string;
  currentStock: string;
  minStock: string;
  notes: string | null;
  isActive: boolean;
  supplierName?: string | null;
  lowStock?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductStockMovementItem {
  id: number;
  movementType: string;
  quantity: string;
  unitCost: string;
  notes: string | null;
  createdAt: string;
  supplierId: number | null;
  supplierName: string | null;
  orderId: number | null;
}

export interface ProductDetailResult {
  product: ProductItem;
  movements: ProductStockMovementItem[];
}

export interface CreateProductData {
  supplierId?: number | null;
  name: string;
  sku?: string;
  category?: string;
  unit?: string;
  salePrice?: number;
  costPrice?: number;
  currentStock?: number;
  minStock?: number;
  notes?: string;
  isActive?: boolean;
}

export interface CreateStockMovementData {
  movementType: "purchase" | "sale" | "adjustment_in" | "adjustment_out";
  quantity: number;
  unitCost?: number;
  notes?: string;
  supplierId?: number | null;
  orderId?: number | null;
}

interface ProductFilters {
  search?: string;
  category?: string;
  lowStock?: boolean;
}

export function useProducts(filters: ProductFilters = {}) {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.category) params.set("category", filters.category);
    if (filters.lowStock) params.set("lowStock", "true");
    const { data } = await apiFetch<{ products: ProductItem[] }>(`/products${params.toString() ? `?${params}` : ""}`);
    setProducts(data?.products || []);
    setLoading(false);
  }, [filters.search, filters.category, filters.lowStock]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { products, loading, refresh };
}

export async function fetchProductDetail(id: number): Promise<ProductDetailResult | null> {
  const { data } = await apiFetch<ProductDetailResult>(`/products/${id}`);
  return data || null;
}

export async function createProduct(data: CreateProductData) {
  const { data: result, error } = await apiFetch<{ product: ProductItem }>("/products", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return { product: result?.product, error };
}

export async function updateProduct(id: number, data: Partial<CreateProductData>) {
  const { data: result, error } = await apiFetch<{ product: ProductItem }>(`/products/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return { product: result?.product, error };
}

export async function deleteProduct(id: number) {
  const { error } = await apiFetch(`/products/${id}`, { method: "DELETE" });
  return { error };
}

export async function createProductStockMovement(id: number, data: CreateStockMovementData) {
  const { data: result, error } = await apiFetch<{ product: ProductItem; movement: ProductStockMovementItem }>(`/products/${id}/movements`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return { product: result?.product, movement: result?.movement, error };
}
