import { useEffect, useMemo, useState } from "react";
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

  const syncTimeoutMs = 12000;

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
    let cancelled = false;
    let settled = false;
    let syncing = false;

    const fail = (code: string, detail?: string) => {
      if (cancelled || settled) {
        return;
      }

      settled = true;
      setProcessing(false);
      setErrorMessage(describeError(code, detail));
    };

    const finishWithSession = async (accessToken?: string) => {
      if (!accessToken || cancelled || settled || syncing) {
        return;
      }

      syncing = true;
      let syncError: string | null = null;

      try {
        syncError = await Promise.race<string | null>([
          syncSupabaseSession(accessToken),
          new Promise<string>((resolve) => {
            window.setTimeout(() => resolve("oauth_sync_timeout"), syncTimeoutMs);
          }),
        ]);
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
      setLocation(nextPath);
    };

    const run = async () => {
      if (!supabase) {
        fail("supabase_not_configured");
        return;
      }

      const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") {
          void finishWithSession(session?.access_token);
          return;
        }

        if (event === "SIGNED_OUT") {
          fail("oauth_session");
        }
      });

      const timeout = window.setTimeout(() => {
        fail("oauth_session");
      }, 8000);

      try {
        // Force Supabase to process PKCE callback state before routing changes.
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn("Supabase getSession() error during callback", error);
        }

        await finishWithSession(data.session?.access_token);

        if (!settled) {
          // Retry briefly in case URL parsing/session persistence is still in-flight.
          for (let i = 0; i < 2 && !settled; i += 1) {
            await new Promise((resolve) => window.setTimeout(resolve, 500));
            const retry = await supabase.auth.getSession();
            await finishWithSession(retry.data.session?.access_token);
          }
        }
      } finally {
        window.clearTimeout(timeout);
        authListener.subscription.unsubscribe();
      }
    };

    run().catch((error) => {
      const message = error instanceof Error ? error.message : undefined;
      fail("oauth_unknown", message);
    });

    return () => {
      cancelled = true;
    };
  }, [nextPath, setLocation, syncSupabaseSession]);

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
