// En local por default apunta a la misma URL o puerto proxyado, en prod usa VITE_API_URL (configurable en Vercel)
const API_BASE = import.meta.env.VITE_API_URL || "/api";

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
    const json = await res.json();
    if (!res.ok) {
      return { error: json.error || "Error del servidor", status: res.status };
    }
    return { data: json as T, status: res.status };
  } catch {
    return { error: "Error de conexión", status: 0 };
  }
}
