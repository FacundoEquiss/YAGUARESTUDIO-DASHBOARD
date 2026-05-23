import { useAuth } from "@/hooks/use-auth";
import { useFirestoreCollection } from "@/hooks/use-firestore-collection";

export type PriceUnit = "fixed" | "hour" | "unit" | "month" | "session";

export interface Service {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  priceUnit: PriceUnit;
  active: boolean;
  createdAt?: { seconds: number; nanoseconds: number } | null;
  updatedAt?: { seconds: number; nanoseconds: number } | null;
}

export type ServiceInput = Omit<Service, "id" | "createdAt" | "updatedAt">;

export const PRICE_UNIT_LABELS: Record<PriceUnit, string> = {
  fixed: "Por servicio",
  hour: "Por hora",
  unit: "Por unidad",
  month: "Por mes",
  session: "Por clase / sesión",
};

export const SERVICE_CATEGORIES = [
  "Personalización textil",
  "Diseño gráfico",
  "Cursos",
  "Consultoría",
  "Mantenimiento",
  "Otros",
];

export function useServices() {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid ?? null;
  return useFirestoreCollection<Service>(["users", uid, "services"], {
    orderByField: "createdAt",
    orderDirection: "desc",
  });
}
