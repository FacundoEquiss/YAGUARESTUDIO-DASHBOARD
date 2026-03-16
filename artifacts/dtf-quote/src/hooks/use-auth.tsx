import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { getStorage, setStorage } from "@/lib/storage";
import { v4 as uuidv4 } from "uuid";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "master" | "user" | "guest";
}

interface StoredUser {
  id: string;
  email: string;
  name: string;
  password: string;
}

const MASTER_USER: AuthUser = {
  id: "master",
  email: "yaguarestudio@gmail.com",
  name: "YAGUAR ESTUDIO",
  role: "master",
};

const MASTER_PASSWORD = "Sanignacio43391475";

const GUEST_USER: AuthUser = {
  id: "guest",
  email: "",
  name: "Invitado",
  role: "guest",
};

const USERS_KEY = "dtf:users";
const SESSION_KEY = "dtf:session";

interface AuthContextValue {
  currentUser: AuthUser | null;
  login: (email: string, password: string) => string | null;
  register: (email: string, password: string, name: string) => string | null;
  loginAsGuest: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    const sessionId = getStorage<string | null>(SESSION_KEY, null);
    if (!sessionId) return null;
    if (sessionId === "master") return MASTER_USER;
    if (sessionId === "guest") return GUEST_USER;
    const users = getStorage<StoredUser[]>(USERS_KEY, []);
    const found = users.find((u) => u.id === sessionId);
    if (found) return { id: found.id, email: found.email, name: found.name, role: "user" };
    return null;
  });

  const loginAsGuest = useCallback(() => {
    setStorage(SESSION_KEY, "guest");
    setCurrentUser(GUEST_USER);
  }, []);

  const login = useCallback((email: string, password: string): string | null => {
    if (email.trim().toLowerCase() === MASTER_USER.email.toLowerCase()) {
      if (password === MASTER_PASSWORD) {
        setStorage(SESSION_KEY, "master");
        setCurrentUser(MASTER_USER);
        return null;
      }
      return "Contraseña incorrecta";
    }
    const users = getStorage<StoredUser[]>(USERS_KEY, []);
    const user = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user) return "No existe una cuenta con ese correo";
    if (user.password !== password) return "Contraseña incorrecta";
    setStorage(SESSION_KEY, user.id);
    setCurrentUser({ id: user.id, email: user.email, name: user.name, role: "user" });
    return null;
  }, []);

  const register = useCallback((email: string, password: string, name: string): string | null => {
    if (email.trim().toLowerCase() === MASTER_USER.email.toLowerCase()) {
      return "Ese correo no está disponible";
    }
    const users = getStorage<StoredUser[]>(USERS_KEY, []);
    if (users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
      return "Ya existe una cuenta con ese correo";
    }
    const newUser: StoredUser = {
      id: uuidv4(),
      email: email.trim().toLowerCase(),
      name: name.trim(),
      password,
    };
    setStorage(USERS_KEY, [...users, newUser]);
    setStorage(SESSION_KEY, newUser.id);
    setCurrentUser({ id: newUser.id, email: newUser.email, name: newUser.name, role: "user" });
    return null;
  }, []);

  const logout = useCallback(() => {
    setStorage<string | null>(SESSION_KEY, null);
    setCurrentUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, login, register, loginAsGuest, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
