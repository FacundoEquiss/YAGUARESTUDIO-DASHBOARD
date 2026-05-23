import { useAuth } from "@/hooks/use-auth";
import { useFirestoreCollection } from "@/hooks/use-firestore-collection";

export interface Supplier {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  category: string;
  notes: string;
  createdAt?: { seconds: number; nanoseconds: number } | null;
  updatedAt?: { seconds: number; nanoseconds: number } | null;
}

export type SupplierInput = Omit<Supplier, "id" | "createdAt" | "updatedAt">;

export function useSuppliers() {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid ?? null;
  return useFirestoreCollection<Supplier>(["users", uid, "suppliers"], {
    orderByField: "createdAt",
    orderDirection: "desc",
  });
}
