function normalizeApiBase(rawUrl?: string): string {
  if (!rawUrl) return "/api";

  const trimmed = rawUrl.trim().replace(/\/+$/, "");
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}

// En local por default apunta a la misma URL o puerto proxyado.
// En producción acepta VITE_API_URL con o sin sufijo /api.
const API_BASE = normalizeApiBase(import.meta.env.VITE_API_URL);

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<{ data?: T; error?: string; status: number }> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const payload = isJson ? await res.json() : await res.text();

    if (!res.ok) {
      if (isJson && payload && typeof payload === "object" && "error" in payload) {
        return {
          error: typeof payload.error === "string" ? payload.error : "Error del servidor",
          status: res.status,
        };
      }

      if (typeof payload === "string" && payload.trim()) {
        return { error: payload.trim(), status: res.status };
      }

      return { error: "Error del servidor", status: res.status };
    }

    return { data: payload as T, status: res.status };
  } catch (error) {
    console.error("apiFetch connection error", { path, apiBase: API_BASE, error });
    return { error: "No se pudo conectar con la API", status: 0 };
  }
}
