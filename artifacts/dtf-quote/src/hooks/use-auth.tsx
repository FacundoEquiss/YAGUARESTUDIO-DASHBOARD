import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { getStorage, setStorage } from "@/lib/storage";
import { AUTH_EXPIRED_EVENT, AUTH_RECOVERY_EVENT, apiFetch, setAccessToken, waitForApiReady } from "@/lib/api";
import { supabase } from "@/lib/supabase";

export interface AuthUser {
  id: string;
  email: string;
  username?: string | null;
  name: string;
  lastName?: string | null;
  role: "master" | "user" | "guest";
  phone?: string | null;
  businessName?: string | null;
  birthDate?: string | null;
  profilePhotoUrl?: string | null;
  createdAt?: string | null;
}

export interface SubscriptionInfo {
  planName: string;
  planSlug: string;
  limits: { dtfQuotes: number; mockupPngs: number; pdfExports: number };
  status: string;
  periodEnd: string;
}

const SESSION_KEY = "dtf:session";
const POST_AUTH_WELCOME_KEY = "dtf:post-auth-welcome";

interface ApiUser {
  id: number;
  email: string;
  username?: string | null;
  name: string;
  lastName?: string | null;
  role: string;
  phone?: string | null;
  businessName?: string | null;
  birthDate?: string | null;
  profilePhotoUrl?: string | null;
  createdAt?: string | null;
}

function mapUser(u: ApiUser): AuthUser {
  return {
    id: String(u.id),
    email: u.email,
    username: u.username,
    name: u.name,
    lastName: u.lastName,
    role: u.role as "master" | "user",
    phone: u.phone,
    businessName: u.businessName,
    birthDate: u.birthDate,
    profilePhotoUrl: u.profilePhotoUrl,
    createdAt: u.createdAt,
  };
}

function getServerUnavailableMessage(status: number, error: string | null): string {
  if (status === 0) {
    return "El servidor está despertando. Probá de nuevo en unos segundos.";
  }

  return error || "No se pudo completar la solicitud.";
}

interface AuthContextValue {
  currentUser: AuthUser | null;
  subscription: SubscriptionInfo | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<string | null>;
  register: (payload: {
    email: string;
    password: string;
    name: string;
    lastName?: string;
    username?: string;
    birthDate?: string;
    phone?: string;
    businessName?: string;
  }) => Promise<string | null>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  retrySessionRestore: () => Promise<void>;
  updateProfile: (data: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    const { data } = await apiFetch<{ user: ApiUser; subscription: SubscriptionInfo | null; accessToken?: string | null }>("/auth/me", {
      suppressAuthExpired: true,
      timeoutMs: 10000,
    });
    if (data?.user) {
      setAccessToken(data.accessToken || null);
      setCurrentUser(mapUser(data.user));
      setSubscription(data.subscription || null);
      setStorage(SESSION_KEY, "api");
      setError(null);
      return true;
    }

    return false;
  }, []);

  const restoreSession = useCallback(async (retries = 2) => {
    const sessionType = getStorage<string | null>(SESSION_KEY, null);
    if (sessionType === "guest") {
      setStorage<string | null>(SESSION_KEY, null);
    }

    if (sessionType !== "api") {
      setLoading(false);
      return;
    }

    setError(null);
    await waitForApiReady();

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const { data, error: meError, status } = await apiFetch<{ user: ApiUser; subscription: SubscriptionInfo | null }>("/auth/me");
      if (data?.user) {
        setCurrentUser(mapUser(data.user));
        setSubscription(data.subscription || null);
        setStorage(SESSION_KEY, "api");
        setLoading(false);
        setError(null);
        return;
      }

      if (status === 401) {
        setStorage<string | null>(SESSION_KEY, null);
        setCurrentUser(null);
        setSubscription(null);
        setLoading(false);
        setError("Sesion expirada. Inicia sesion nuevamente.");
        return;
      }

      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
      } else {
        setStorage<string | null>(SESSION_KEY, null);
        setCurrentUser(null);
        setSubscription(null);
        setLoading(false);
        setError(meError || "No se pudo restaurar la sesion. Intenta nuevamente.");
      }
    }
  }, []);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    const handleAuthExpired = () => {
      setCurrentUser(null);
      setSubscription(null);
      setStorage<string | null>(SESSION_KEY, null);
      setLoading(false);
      setError("Sesion expirada. Inicia sesion nuevamente.");
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    };
  }, []);

  useEffect(() => {
    const handleAuthRecovery = () => {
      if (currentUser) {
        void refreshSession().then((ok) => {
          if (!ok) {
            setAccessToken(null);
            setCurrentUser(null);
            setSubscription(null);
            setStorage<string | null>(SESSION_KEY, null);
            setError("Sesion expirada. Inicia sesion nuevamente.");
          }
        });
      }
    };

    window.addEventListener(AUTH_RECOVERY_EVENT, handleAuthRecovery);
    return () => {
      window.removeEventListener(AUTH_RECOVERY_EVENT, handleAuthRecovery);
    };
  }, [currentUser, refreshSession]);

  const login = useCallback(async (email: string, password: string): Promise<string | null> => {
    setError(null);

    const { data, error, status } = await apiFetch<{ user: ApiUser; accessToken?: string | null }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (error) {
      return getServerUnavailableMessage(status, error);
    }
    if (data?.user) {
      setAccessToken(data.accessToken || null);
      setCurrentUser(mapUser(data.user));
      setStorage(SESSION_KEY, "api");
      setStorage(POST_AUTH_WELCOME_KEY, { kind: "login", ts: Date.now() });
      setLoading(false);

      void refreshSession();
    }
    return null;
  }, [refreshSession]);

  const register = useCallback(async (payload: {
    email: string;
    password: string;
    name: string;
    lastName?: string;
    username?: string;
    birthDate?: string;
    phone?: string;
    businessName?: string;
  }): Promise<string | null> => {
    setError(null);

    const { data, error, status } = await apiFetch<{ user: ApiUser; accessToken?: string | null }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (error) {
      return getServerUnavailableMessage(status, error);
    }
    if (data?.user) {
      setAccessToken(data.accessToken || null);
      setCurrentUser(mapUser(data.user));
      setStorage(SESSION_KEY, "api");
      setStorage(POST_AUTH_WELCOME_KEY, { kind: "register", ts: Date.now() });
      setLoading(false);

      void refreshSession();
    }
    return null;
  }, [refreshSession]);

  const retrySessionRestore = useCallback(async () => {
    setLoading(true);
    setError(null);
    await restoreSession();
  }, [restoreSession]);

  const updateProfile = useCallback((data: Partial<AuthUser>) => {
    setCurrentUser(prev => prev ? { ...prev, ...data } : prev);
  }, []);

  const logout = useCallback(async () => {
    if (currentUser) {
      await apiFetch("/auth/logout", { method: "POST" });
    }
    if (supabase) {
      await supabase.auth.signOut();
    }
    setAccessToken(null);
    setStorage<string | null>(SESSION_KEY, null);
    setCurrentUser(null);
    setSubscription(null);
    setError(null);
  }, [currentUser]);

  return (
    <AuthContext.Provider value={{ currentUser, subscription, loading, error, login, register, logout, refreshSession, retrySessionRestore, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
