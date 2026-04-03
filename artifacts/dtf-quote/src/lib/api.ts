function normalizeApiBase(rawUrl?: string): string {
  if (!rawUrl) return "/api";

  const trimmed = rawUrl.trim().replace(/\/+$/, "");
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}

// En local por default apunta a la misma URL o puerto proxyado.
// En producción acepta VITE_API_URL con o sin sufijo /api.
const API_BASE = normalizeApiBase(import.meta.env.VITE_API_URL);

const RETRYABLE_AUTH_PATHS = new Set([
  "/auth/login",
  "/auth/register",
  "/auth/supabase/sync",
]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForApiReady(
  attempts = 8,
  delayMs = 1500
): Promise<boolean> {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const res = await fetch(`${API_BASE}/healthz/db`, {
        method: "GET",
        credentials: "include",
      });

      if (res.ok) {
        return true;
      }
    } catch {
      // El backend puede estar despertando o reiniciando.
    }

    if (attempt < attempts) {
      await sleep(delayMs);
    }
  }

  return false;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<{ data?: T; error?: string; status: number }> {
  const method = (options.method || "GET").toUpperCase();
  const shouldRetry = RETRYABLE_AUTH_PATHS.has(path) && method === "POST";
  const maxAttempts = shouldRetry ? 3 : 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
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
        const retryableStatus = res.status === 429 || res.status === 502 || res.status === 503 || res.status === 504;
        if (shouldRetry && retryableStatus && attempt < maxAttempts) {
          await sleep(200 * attempt);
          continue;
        }

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
      if (attempt < maxAttempts) {
        await sleep(200 * attempt);
        continue;
      }

      console.error("apiFetch connection error", { path, apiBase: API_BASE, error });
      return { error: "No se pudo conectar con la API", status: 0 };
    }
  }

  return { error: "No se pudo conectar con la API", status: 0 };
}
