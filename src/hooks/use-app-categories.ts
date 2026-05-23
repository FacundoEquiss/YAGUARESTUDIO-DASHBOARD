import { useAuth } from "@/hooks/use-auth";
import { useFirestoreDoc } from "@/hooks/use-firestore-doc";

export type CategoryKind = "income" | "expense" | "product" | "service" | "supplier";

export interface AppCategories {
  income: string[];
  expense: string[];
  product: string[];
  service: string[];
  supplier: string[];
}

export const DEFAULT_CATEGORIES: AppCategories = {
  income: ["Ventas", "Cobro pendiente", "Servicios", "Otros ingresos"],
  expense: [
    "Insumos DTF",
    "Telas / Prendas",
    "Servicios",
    "Alquiler",
    "Impuestos",
    "Marketing",
    "Sueldos",
    "Logística",
    "Otros gastos",
  ],
  product: ["Remeras", "Buzos", "Gorras", "Pantalones", "Tela DTF", "Tintas", "Otros"],
  service: ["Personalización textil", "Diseño gráfico", "Cursos", "Consultoría", "Mantenimiento", "Otros"],
  supplier: ["Insumos DTF", "Telas", "Plotter / Estampado", "Tintas", "Prendas", "Logística", "Otros"],
};

export const CATEGORY_KIND_LABELS: Record<CategoryKind, string> = {
  income: "Ingresos",
  expense: "Gastos",
  product: "Productos",
  service: "Servicios",
  supplier: "Proveedores",
};

export function useAppCategories() {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid ?? null;
  const { data, loading, save } = useFirestoreDoc<Partial<AppCategories>>([
    "users",
    uid,
    "settings",
    "categories",
  ]);

  const categories: AppCategories = {
    income: data?.income?.length ? data.income : DEFAULT_CATEGORIES.income,
    expense: data?.expense?.length ? data.expense : DEFAULT_CATEGORIES.expense,
    product: data?.product?.length ? data.product : DEFAULT_CATEGORIES.product,
    service: data?.service?.length ? data.service : DEFAULT_CATEGORIES.service,
    supplier: data?.supplier?.length ? data.supplier : DEFAULT_CATEGORIES.supplier,
  };

  return { categories, loading, save };
}
