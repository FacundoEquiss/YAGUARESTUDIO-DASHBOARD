import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { getStorage, setStorage } from "@/lib/storage";
import { apiFetch } from "@/lib/api";

export interface AuthUser {
  id: string;
  email: string;
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

const GUEST_USER: AuthUser = {
  id: "guest",
  email: "",
  name: "Invitado",
  role: "guest",
};

const SESSION_KEY = "dtf:session";

interface ApiUser {
  id: number;
  email: string;
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
  register: (email: string, password: string, name: string) => Promise<string | null>;
  loginAsGuest: () => void;
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
      setCurrentUser(GUEST_USER);
      setLoading(false);
      return;
    }

    apiFetch<{ user: ApiUser; subscription: SubscriptionInfo | null }>("/auth/me")
      .then(({ data }) => {
        if (data?.user) {
          setCurrentUser(mapUser(data.user));
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
    const { data, error } = await apiFetch<{ user: ApiUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (error) return error;
    if (data?.user) {
      setCurrentUser(mapUser(data.user));
      setStorage(SESSION_KEY, "api");

      const meRes = await apiFetch<{ subscription: SubscriptionInfo | null }>("/auth/me");
      setSubscription(meRes.data?.subscription || null);
    }
    return null;
  }, []);

  const register = useCallback(async (email: string, password: string, name: string): Promise<string | null> => {
    const { data, error } = await apiFetch<{ user: ApiUser }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    });
    if (error) return error;
    if (data?.user) {
      setCurrentUser(mapUser(data.user));
      setStorage(SESSION_KEY, "api");

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
    if (currentUser?.role !== "guest") {
      await apiFetch("/auth/logout", { method: "POST" });
    }
    setStorage<string | null>(SESSION_KEY, null);
    setCurrentUser(null);
    setSubscription(null);
  }, [currentUser]);

  return (
    <AuthContext.Provider value={{ currentUser, subscription, loading, login, register, loginAsGuest, logout, refreshSession, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
