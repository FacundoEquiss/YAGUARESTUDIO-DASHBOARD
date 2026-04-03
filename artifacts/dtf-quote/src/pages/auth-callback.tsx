import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { sanitizeNextPath } from "@/lib/routing";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

function getNextPath() {
  const params = new URLSearchParams(window.location.search);
  return sanitizeNextPath(params.get("next"));
}

export function AuthCallbackPage() {
  const [, setLocation] = useLocation();
  const { syncSupabaseSession } = useAuth();
  const [processing, setProcessing] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const nextPath = useMemo(() => getNextPath(), []);
  const runGuardRef = useRef(false);

  const hardUiTimeoutMs = 10000;
  const syncTimeoutMs = 8000;

  const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, timeoutCode: string): Promise<T> => {
    return await Promise.race<T>([
      promise,
      new Promise<T>((_, reject) => {
        window.setTimeout(() => reject(new Error(timeoutCode)), timeoutMs);
      }),
    ]);
  };

  const getTokensFromHash = (): { accessToken: string; refreshToken: string } | null => {
    const hash = window.location.hash;
    if (!hash || !hash.startsWith("#")) {
      return null;
    }

    const params = new URLSearchParams(hash.slice(1));
    const accessToken = params.get("access_token")?.trim() || "";
    const refreshToken = params.get("refresh_token")?.trim() || "";

    if (!accessToken || !refreshToken) {
      return null;
    }

    return { accessToken, refreshToken };
  };

  const clearHash = () => {
    if (!window.location.hash) {
      return;
    }

    const newUrl = `${window.location.pathname}${window.location.search}`;
    window.history.replaceState(null, document.title, newUrl);
  };

  const getCodeFromQuery = (): string | null => {
    const code = new URLSearchParams(window.location.search).get("code");
    const trimmed = code?.trim();
    return trimmed ? trimmed : null;
  };

  const clearCodeFromQuery = () => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("code")) {
      return;
    }

    params.delete("code");
    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;
    window.history.replaceState(null, document.title, nextUrl);
  };

  const exchangeLockKey = (code: string) => `oauth:pkce:exchange-lock:${code}`;

  const hasExchangeLock = (code: string): boolean => {
    try {
      return window.sessionStorage.getItem(exchangeLockKey(code)) === "1";
    } catch {
      return false;
    }
  };

  const setExchangeLock = (code: string) => {
    try {
      window.sessionStorage.setItem(exchangeLockKey(code), "1");
    } catch {
      // Ignore storage errors and keep flow running.
    }
  };

  const clearExchangeLock = (code: string) => {
    try {
      window.sessionStorage.removeItem(exchangeLockKey(code));
    } catch {
      // Ignore storage errors and keep flow running.
    }
  };

  const describeError = (code: string, detail?: string): string => {
    if (detail && detail.trim().length > 0) {
      return detail;
    }

    switch (code) {
      case "supabase_not_configured":
        return "La integración con Google no está configurada correctamente. Contactá al soporte.";
      case "oauth_session":
        return "No pudimos validar tu sesión de Google. Intentá nuevamente.";
      case "oauth_sync_timeout":
        return "La sincronización tardó demasiado. Revisá tu conexión e intentá de nuevo.";
      case "oauth_sync":
        return "No se pudo sincronizar tu usuario con la plataforma.";
      default:
        return "Ocurrió un error inesperado al iniciar sesión con Google.";
    }
  };

  useEffect(() => {
    if (runGuardRef.current) {
      return;
    }
    runGuardRef.current = true;

    let cancelled = false;
    let settled = false;
    let syncing = false;
    let hardUiTimeout: number | undefined;

    const fail = (code: string, detail?: string) => {
      if (cancelled || settled) {
        return;
      }

      settled = true;
      setProcessing(false);
      setErrorMessage(describeError(code, detail));
      if (hardUiTimeout) {
        window.clearTimeout(hardUiTimeout);
      }
    };

    const finishWithSession = async (accessToken?: string) => {
      if (!accessToken || cancelled || settled || syncing) {
        return;
      }

      syncing = true;
      let syncError: string | null = null;

      try {
        syncError = await withTimeout(syncSupabaseSession(accessToken), syncTimeoutMs, "oauth_sync_timeout");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error de sincronización";
        fail("oauth_sync", message);
      } finally {
        syncing = false;
      }

      if (cancelled || settled) {
        return;
      }

      if (syncError) {
        if (syncError === "oauth_sync_timeout") {
          fail("oauth_sync_timeout");
          return;
        }

        fail("oauth_sync", syncError);
        return;
      }

      settled = true;
      if (hardUiTimeout) {
        window.clearTimeout(hardUiTimeout);
      }

      setLocation(nextPath);
    };

    hardUiTimeout = window.setTimeout(() => {
      // This timer is independent from Supabase promises and guarantees loader shutdown.
      fail("oauth_sync_timeout");
    }, hardUiTimeoutMs);

    const run = async () => {
      if (!supabase) {
        fail("supabase_not_configured");
        return;
      }

      try {
        const code = getCodeFromQuery();

        if (code) {
          if (hasExchangeLock(code)) {
            const resumed = await withTimeout(
              supabase.auth.getSession(),
              3000,
              "oauth_get_session_timeout"
            );

            await finishWithSession(resumed.data.session?.access_token);
            if (!settled) {
              fail("oauth_session", "El callback de autenticación se ejecutó más de una vez. Reintentá el login.");
            }
            return;
          }

          setExchangeLock(code);
          const exchange = await withTimeout(
            supabase.auth.exchangeCodeForSession(code),
            6000,
            "oauth_exchange_timeout"
          );

          clearCodeFromQuery();

          if (exchange.error) {
            clearExchangeLock(code);
            fail("oauth_session", exchange.error.message);
            return;
          }

          await finishWithSession(exchange.data.session?.access_token);
        }

        if (!settled) {
          const hashTokens = getTokensFromHash();

          if (hashTokens) {
            const setSessionResult = await withTimeout(
              supabase.auth.setSession({
                access_token: hashTokens.accessToken,
                refresh_token: hashTokens.refreshToken,
              }),
              4000,
              "oauth_set_session_timeout"
            );

            if (setSessionResult.error) {
              fail("oauth_session", setSessionResult.error.message);
              return;
            }

            clearHash();
            await finishWithSession(setSessionResult.data.session?.access_token);
          }
        }

        if (!settled) {
          const currentSession = await withTimeout(
            supabase.auth.getSession(),
            3000,
            "oauth_get_session_timeout"
          );

          if (currentSession.error) {
            fail("oauth_session", currentSession.error.message);
            return;
          }

          await finishWithSession(currentSession.data.session?.access_token);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "oauth_unknown";
        fail("oauth_session", message);
      }
    };

    run().catch((error) => {
      const message = error instanceof Error ? error.message : undefined;
      fail("oauth_unknown", message);
    });

    return () => {
      cancelled = true;
      if (hardUiTimeout) {
        window.clearTimeout(hardUiTimeout);
      }
    };
  }, [hardUiTimeoutMs, nextPath, setLocation, syncSupabaseSession]);

  return (
    <div className="auth-card-wrapper">
      <div className="auth-card flex flex-col items-center justify-center gap-3">
        {processing ? (
          <>
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Procesando inicio de sesión con Google...</p>
          </>
        ) : (
          <>
            <AlertCircle className="w-8 h-8 text-destructive" />
            <p className="text-sm text-center text-destructive">{errorMessage || "No se pudo completar el acceso"}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-2"
              onClick={() => setLocation(`/auth?next=${encodeURIComponent(nextPath)}&error=oauth_sync`)}
            >
              Volver a intentar
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
