const VALID_PROTECTED_PATHS = new Set([
  "/dashboard",
  "/app",
  "/mockups",
  "/history",
  "/settings",
  "/support",
  "/profile",
  "/orders",
  "/clients",
  "/suppliers",
  "/finance",
  "/reports",
  "/accounts",
  "/blog",
  "/bg-remover",
]);

export function sanitizeNextPath(rawNext: string | null): string {
  if (!rawNext || !rawNext.startsWith("/")) return "/dashboard";
  if (rawNext.startsWith("//")) return "/dashboard";
  return rawNext;
}

export function getProtectedRedirectTarget(pathname: string): string {
  const next = VALID_PROTECTED_PATHS.has(pathname) ? pathname : "/dashboard";
  return `/auth?next=${encodeURIComponent(next)}`;
}
