import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { getStorage, setStorage } from "@/lib/storage";
import { AUTH_EXPIRED_EVENT, apiFetch, setAccessToken, waitForApiReady } from "@/lib/api";
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

interface AuthContextValue {
  currentUser: AuthUser | null;
  subscription: SubscriptionInfo | null;
  loading: boolean;
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
  refreshSession: () => Promise<void>;
  updateProfile: (data: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sessionType = getStorage<string | null>(SESSION_KEY, null);
    if (sessionType === "guest") {
      setStorage<string | null>(SESSION_KEY, null);
    }

    void waitForApiReady();

    const restoreSession = async () => {
      if (sessionType === "api") {
        await waitForApiReady();
      }

      const { data } = await apiFetch<{ user: ApiUser; subscription: SubscriptionInfo | null }>("/auth/me");
      if (data?.user) {
        setCurrentUser(mapUser(data.user));
        setSubscription(data.subscription || null);
        setStorage(SESSION_KEY, "api");
      } else {
        setStorage<string | null>(SESSION_KEY, null);
      }
    };

    restoreSession()
      .catch(() => {
        setStorage<string | null>(SESSION_KEY, null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handleAuthExpired = () => {
      setCurrentUser(null);
      setSubscription(null);
      setStorage<string | null>(SESSION_KEY, null);
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<string | null> => {
    const apiReady = await waitForApiReady();

    const { data, error, status } = await apiFetch<{ user: ApiUser; accessToken?: string | null }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (error) {
      if (!apiReady && status === 0) {
        return "El servidor está despertando. Probá de nuevo en unos segundos.";
      }
      return error;
    }
    if (data?.user) {
      setAccessToken(data.accessToken || null);
      setCurrentUser(mapUser(data.user));
      setStorage(SESSION_KEY, "api");
      setStorage(POST_AUTH_WELCOME_KEY, { kind: "login", ts: Date.now() });

      const meRes = await apiFetch<{ subscription: SubscriptionInfo | null }>("/auth/me");
      setSubscription(meRes.data?.subscription || null);
    }
    return null;
  }, []);

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
    const apiReady = await waitForApiReady();

    const { data, error, status } = await apiFetch<{ user: ApiUser; accessToken?: string | null }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (error) {
      if (!apiReady && status === 0) {
        return "El servidor está despertando. Probá de nuevo en unos segundos.";
      }
      return error;
    }
    if (data?.user) {
      setAccessToken(data.accessToken || null);
      setCurrentUser(mapUser(data.user));
      setStorage(SESSION_KEY, "api");
      setStorage(POST_AUTH_WELCOME_KEY, { kind: "register", ts: Date.now() });

      const meRes = await apiFetch<{ subscription: SubscriptionInfo | null }>("/auth/me");
      setSubscription(meRes.data?.subscription || null);
    }
    return null;
  }, []);

  const refreshSession = useCallback(async () => {
    const { data } = await apiFetch<{ user: ApiUser; subscription: SubscriptionInfo | null }>("/auth/me");
    if (data?.user) {
      setCurrentUser(mapUser(data.user));
      setSubscription(data.subscription || null);
    }
  }, []);

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
  }, [currentUser]);

  return (
    <AuthContext.Provider value={{ currentUser, subscription, loading, login, register, logout, refreshSession, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
