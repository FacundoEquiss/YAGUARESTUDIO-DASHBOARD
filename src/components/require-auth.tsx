import { useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { currentUser, loading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !currentUser) {
      const next = encodeURIComponent(location);
      setLocation(`/auth?next=${next}`);
    }
  }, [currentUser, loading, location, setLocation]);

  if (loading || !currentUser) return null;
  return <>{children}</>;
}
