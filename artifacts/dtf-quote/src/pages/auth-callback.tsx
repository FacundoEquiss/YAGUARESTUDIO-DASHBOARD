import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { sanitizeNextPath } from "@/lib/routing";
import { supabase } from "@/lib/supabase";

function getNextPath() {
  const params = new URLSearchParams(window.location.search);
  return sanitizeNextPath(params.get("next"));
}

export function AuthCallbackPage() {
  const [, setLocation] = useLocation();
  const { syncSupabaseSession } = useAuth();

  useEffect(() => {
    let cancelled = false;
    let settled = false;
    let syncing = false;

    const nextPath = getNextPath();

    const fail = (code: string) => {
      if (cancelled || settled) {
        return;
      }

      settled = true;
      setLocation(`/auth?next=${encodeURIComponent(nextPath)}&error=${code}`);
    };

    const finishWithSession = async (accessToken?: string) => {
      if (!accessToken || cancelled || settled || syncing) {
        return;
      }

      syncing = true;
      const syncError = await syncSupabaseSession(accessToken);
      syncing = false;

      if (cancelled || settled) {
        return;
      }

      settled = true;

      if (syncError) {
        setLocation(`/auth?next=${encodeURIComponent(nextPath)}&error=oauth_sync`);
        return;
      }

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

    run().catch(() => {
      fail("oauth_unknown");
    });

    return () => {
      cancelled = true;
    };
  }, [setLocation, syncSupabaseSession]);

  return (
    <div className="auth-card-wrapper">
      <div className="auth-card flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Procesando inicio de sesión con Google...</p>
      </div>
    </div>
  );
}
