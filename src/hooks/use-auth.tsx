import { createContext, useContext, type ReactNode } from "react";

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface AuthContextValue {
  currentUser: AuthUser | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  currentUser: null,
  loading: false,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  return <AuthContext.Provider value={{ currentUser: null, loading: false, logout: async () => {} }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
