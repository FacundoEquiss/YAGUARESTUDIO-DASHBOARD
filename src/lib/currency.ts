export interface CurrencyConfig {
  locale: string;
  currency: string;
}

export const CURRENCIES: { code: string; label: string; locale: string }[] = [
  { code: "ARS", label: "Peso argentino ($)", locale: "es-AR" },
  { code: "USD", label: "Dólar (US$)", locale: "en-US" },
  { code: "CLP", label: "Peso chileno ($)", locale: "es-CL" },
  { code: "UYU", label: "Peso uruguayo ($)", locale: "es-UY" },
  { code: "MXN", label: "Peso mexicano ($)", locale: "es-MX" },
  { code: "COP", label: "Peso colombiano ($)", locale: "es-CO" },
  { code: "PEN", label: "Sol peruano (S/)", locale: "es-PE" },
  { code: "BRL", label: "Real (R$)", locale: "pt-BR" },
  { code: "EUR", label: "Euro (€)", locale: "es-ES" },
];

let config: CurrencyConfig = { locale: "es-AR", currency: "ARS" };

export function setCurrencyConfig(next: Partial<CurrencyConfig>): void {
  config = { ...config, ...next };
}

export function getCurrencyConfig(): CurrencyConfig {
  return config;
}

export function formatCurrency(amount: number): string {
  try {
    return new Intl.NumberFormat(config.locale, {
      style: "currency",
      currency: config.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  } catch {
    return `$${Math.round(amount || 0).toLocaleString()}`;
  }
}
