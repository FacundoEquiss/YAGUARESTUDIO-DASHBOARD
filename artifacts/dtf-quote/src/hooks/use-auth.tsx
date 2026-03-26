import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { getStorage, setStorage } from "@/lib/storage";
import { apiFetch } from "@/lib/api";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "master" | "user" | "guest";
}

export interface SubscriptionInfo {
  planName: string;
  planSlug: string;
  limits: { dtfQuotes: number; mockupPngs: number; pdfExports: number };
  status: string;
  periodEnd: string;
}

const GUEST_USER: AuthUser = {
  id: "guest",
  email: "",
  name: "Invitado",
  role: "guest",
};

const SESSION_KEY = "dtf:session";

interface AuthContextValue {
  currentUser: AuthUser | null;
  subscription: SubscriptionInfo | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  register: (email: string, password: string, name: string) => Promise<string | null>;
  loginAsGuest: () => void;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sessionType = getStorage<string | null>(SESSION_KEY, null);
    if (sessionType === "guest") {
      setCurrentUser(GUEST_USER);
      setLoading(false);
      return;
    }

    apiFetch<{ user: { id: number; email: string; name: string; role: string }; subscription: SubscriptionInfo | null }>("/auth/me")
      .then(({ data }) => {
        if (data?.user) {
          setCurrentUser({
            id: String(data.user.id),
            email: data.user.email,
            name: data.user.name,
            role: data.user.role as "master" | "user",
          });
          setSubscription(data.subscription || null);
          setStorage(SESSION_KEY, "api");
        } else {
          setStorage<string | null>(SESSION_KEY, null);
        }
      })
      .catch(() => {
        setStorage<string | null>(SESSION_KEY, null);
      })
      .finally(() => setLoading(false));
  }, []);

  const loginAsGuest = useCallback(() => {
    setStorage(SESSION_KEY, "guest");
    setCurrentUser(GUEST_USER);
    setSubscription(null);
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<string | null> => {
    const { data, error } = await apiFetch<{ user: { id: number; email: string; name: string; role: string } }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (error) return error;
    if (data?.user) {
      setCurrentUser({
        id: String(data.user.id),
        email: data.user.email,
        name: data.user.name,
        role: data.user.role as "master" | "user",
      });
      setStorage(SESSION_KEY, "api");

      const meRes = await apiFetch<{ subscription: SubscriptionInfo | null }>("/auth/me");
      setSubscription(meRes.data?.subscription || null);
    }
    return null;
  }, []);

  const register = useCallback(async (email: string, password: string, name: string): Promise<string | null> => {
    const { data, error } = await apiFetch<{ user: { id: number; email: string; name: string; role: string } }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    });
    if (error) return error;
    if (data?.user) {
      setCurrentUser({
        id: String(data.user.id),
        email: data.user.email,
        name: data.user.name,
        role: data.user.role as "master" | "user",
      });
      setStorage(SESSION_KEY, "api");

      const meRes = await apiFetch<{ subscription: SubscriptionInfo | null }>("/auth/me");
      setSubscription(meRes.data?.subscription || null);
    }
    return null;
  }, []);

  const refreshSession = useCallback(async () => {
    const { data } = await apiFetch<{ user: { id: number; email: string; name: string; role: string }; subscription: SubscriptionInfo | null }>("/auth/me");
    if (data?.user) {
      setCurrentUser({
        id: String(data.user.id),
        email: data.user.email,
        name: data.user.name,
        role: data.user.role as "master" | "user",
      });
      setSubscription(data.subscription || null);
    }
  }, []);

  const logout = useCallback(async () => {
    if (currentUser?.role !== "guest") {
      await apiFetch("/auth/logout", { method: "POST" });
    }
    setStorage<string | null>(SESSION_KEY, null);
    setCurrentUser(null);
    setSubscription(null);
  }, [currentUser]);

  return (
    <AuthContext.Provider value={{ currentUser, subscription, loading, login, register, loginAsGuest, logout, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
