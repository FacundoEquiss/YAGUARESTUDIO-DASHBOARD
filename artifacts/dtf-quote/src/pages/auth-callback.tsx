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

    const run = async () => {
      const nextPath = getNextPath();

      if (!supabase) {
        if (!cancelled) {
          setLocation(`/auth?next=${encodeURIComponent(nextPath)}&error=supabase_not_configured`);
        }
        return;
      }

      const { data, error } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;

      if (error || !accessToken) {
        if (!cancelled) {
          setLocation(`/auth?next=${encodeURIComponent(nextPath)}&error=oauth_session`);
        }
        return;
      }

      const syncError = await syncSupabaseSession(accessToken);
      if (syncError) {
        if (!cancelled) {
          setLocation(`/auth?next=${encodeURIComponent(nextPath)}&error=oauth_sync`);
        }
        return;
      }

      if (!cancelled) {
        setLocation(nextPath);
      }
    };

    run().catch(() => {
      const nextPath = getNextPath();
      if (!cancelled) {
        setLocation(`/auth?next=${encodeURIComponent(nextPath)}&error=oauth_unknown`);
      }
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
