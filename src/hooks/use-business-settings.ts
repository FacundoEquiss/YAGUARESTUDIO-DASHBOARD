import { useAuth } from "@/hooks/use-auth";
import { useFirestoreDoc } from "@/hooks/use-firestore-doc";

export interface BusinessSettings {
  businessName: string;
  taxId: string;
  currency: string;
  contactPhone: string;
  contactEmail: string;
  instagram: string;
  whatsappTemplate: string;
  signature: string;
}

export const DEFAULT_BUSINESS_SETTINGS: BusinessSettings = {
  businessName: "",
  taxId: "",
  currency: "ARS",
  contactPhone: "",
  contactEmail: "",
  instagram: "",
  whatsappTemplate: "",
  signature: "",
};

export function useBusinessSettings() {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid ?? null;
  const { data, loading, save } = useFirestoreDoc<BusinessSettings>([
    "users",
    uid,
    "settings",
    "business",
  ]);

  const settings: BusinessSettings = data
    ? { ...DEFAULT_BUSINESS_SETTINGS, ...data }
    : DEFAULT_BUSINESS_SETTINGS;

  return { settings, loading, save };
}
