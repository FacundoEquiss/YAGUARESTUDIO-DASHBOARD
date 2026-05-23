import { useAuth } from "@/hooks/use-auth";
import { useFirestoreCollection } from "@/hooks/use-firestore-collection";

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  businessName: string;
  notes: string;
  createdAt?: { seconds: number; nanoseconds: number } | null;
  updatedAt?: { seconds: number; nanoseconds: number } | null;
}

export type ClientInput = Omit<Client, "id" | "createdAt" | "updatedAt">;

export function useClients() {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid ?? null;
  return useFirestoreCollection<Client>(["users", uid, "clients"], {
    orderByField: "createdAt",
    orderDirection: "desc",
  });
}
