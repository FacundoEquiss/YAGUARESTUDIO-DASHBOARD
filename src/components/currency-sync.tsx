import { useEffect } from "react";
import { useBusinessSettings } from "@/hooks/use-business-settings";
import { CURRENCIES, setCurrencyConfig } from "@/lib/currency";

/** Applies the user's currency preference globally as soon as it loads. */
export function CurrencySync() {
  const { settings } = useBusinessSettings();
  useEffect(() => {
    const match = CURRENCIES.find((c) => c.code === settings.currency) ?? CURRENCIES[0];
    setCurrencyConfig({ currency: match.code, locale: match.locale });
  }, [settings.currency]);
  return null;
}
