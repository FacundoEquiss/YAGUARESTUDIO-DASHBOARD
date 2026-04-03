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
  const hardUiTimeoutMs = 30000;

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
    let handled = false;

    const fail = (code: string, detail?: string) => {
      if (cancelled || handled) {
        return;
      }

      handled = true;
      setProcessing(false);
      setErrorMessage(describeError(code, detail));
    };

    const complete = async (session: { access_token?: string } | null) => {
      const accessToken = session?.access_token;
      if (!accessToken || cancelled || handled) {
        return;
      }

      const retryDelaysMs = [0, 500, 1200];

      for (let attempt = 0; attempt < retryDelaysMs.length; attempt += 1) {
        if (retryDelaysMs[attempt] > 0) {
          await new Promise((resolve) => window.setTimeout(resolve, retryDelaysMs[attempt]));
        }

        const syncError = await syncSupabaseSession(accessToken);
        if (!syncError) {
          handled = true;
          setProcessing(false);
          setLocation(nextPath);
          return;
        }

        if (attempt === retryDelaysMs.length - 1) {
          fail("oauth_sync", syncError);
          return;
        }
      }
    };

    const hardTimeout = window.setTimeout(() => {
      fail("oauth_sync_timeout");
    }, hardUiTimeoutMs);

    if (!supabase) {
      fail("supabase_not_configured");
      return () => {
        cancelled = true;
        window.clearTimeout(hardTimeout);
      };
    }

    const { data: listener } = supabase.auth.onAuthStateChange((event: string, session: { access_token?: string } | null) => {
      if (event !== "SIGNED_IN") {
        return;
      }

      void complete(session);
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (data?.session) {
        void complete(data.session);
      }
    });

    return () => {
      cancelled = true;
      window.clearTimeout(hardTimeout);
      listener.subscription.unsubscribe();
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
