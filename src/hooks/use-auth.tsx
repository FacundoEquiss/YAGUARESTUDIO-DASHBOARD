import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface UserProfile {
  name: string;
  businessName: string;
  phone?: string;
  photoURL?: string;
}

interface RegisterPayload {
  email: string;
  password: string;
  name: string;
  businessName: string;
}

interface AuthContextValue {
  currentUser: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  register: (payload: RegisterPayload) => Promise<string | null>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<string | null>;
  updateDisplayName: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function mapUser(user: User): AuthUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
  };
}

function friendlyAuthError(code: string | undefined): string {
  switch (code) {
    case "auth/invalid-email":
      return "El email no es válido.";
    case "auth/email-already-in-use":
      return "Ya existe una cuenta con ese email.";
    case "auth/weak-password":
      return "La contraseña es muy débil. Usá al menos 6 caracteres.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Email o contraseña incorrectos.";
    case "auth/too-many-requests":
      return "Demasiados intentos. Probá de nuevo más tarde.";
    case "auth/network-request-failed":
      return "Sin conexión. Revisá tu internet.";
    default:
      return "No se pudo completar la solicitud. Intentá de nuevo.";
  }
}

async function ensureUserDoc(user: User, profile?: Partial<UserProfile>): Promise<void> {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return;

  const initial: Record<string, unknown> = {
    email: user.email,
    name: profile?.name ?? user.displayName ?? "",
    businessName: profile?.businessName ?? "",
    phone: profile?.phone ?? "",
    photoURL: profile?.photoURL ?? user.photoURL ?? "",
    createdAt: serverTimestamp(),
  };
  await setDoc(ref, initial);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user ? mapUser(user) : null);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<string | null> => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return null;
    } catch (error: unknown) {
      const code = (error as { code?: string }).code;
      return friendlyAuthError(code);
    }
  }, []);

  const register = useCallback(async (payload: RegisterPayload): Promise<string | null> => {
    try {
      const credential = await createUserWithEmailAndPassword(auth, payload.email, payload.password);
      await updateProfile(credential.user, { displayName: payload.name });
      await ensureUserDoc(credential.user, {
        name: payload.name,
        businessName: payload.businessName,
      });
      setCurrentUser(mapUser(credential.user));
      return null;
    } catch (error: unknown) {
      const code = (error as { code?: string }).code;
      return friendlyAuthError(code);
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<string | null> => {
    try {
      await sendPasswordResetEmail(auth, email);
      return null;
    } catch (error: unknown) {
      const code = (error as { code?: string }).code;
      return friendlyAuthError(code);
    }
  }, []);

  const updateDisplayName = useCallback(async (name: string) => {
    if (!auth.currentUser) return;
    await updateProfile(auth.currentUser, { displayName: name });
    await updateDoc(doc(db, "users", auth.currentUser.uid), { name });
    setCurrentUser(mapUser(auth.currentUser));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ currentUser, loading, login, register, logout, resetPassword, updateDisplayName }),
    [currentUser, loading, login, register, logout, resetPassword, updateDisplayName],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
