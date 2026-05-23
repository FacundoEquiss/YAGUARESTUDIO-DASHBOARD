import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, Mail, Lock, User, Building2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getNextFromSearch(): string {
  if (typeof window === "undefined") return "/app";
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next");
  if (!next) return "/dashboard";
  try {
    const decoded = decodeURIComponent(next);
    return decoded.startsWith("/") ? decoded : "/dashboard";
  } catch {
    return "/dashboard";
  }
}

export function AuthPage() {
  const [, setLocation] = useLocation();
  const { currentUser, loading, login, loginWithGoogle, register, resetPassword } = useAuth();
  const { toast } = useToast();

  const next = useMemo(() => getNextFromSearch(), []);
  const [tab, setTab] = useState<"login" | "register">("login");
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  async function handleGoogle() {
    setGoogleSubmitting(true);
    const err = await loginWithGoogle();
    setGoogleSubmitting(false);
    if (err) {
      toast({ title: "No se pudo entrar con Google", description: err, variant: "destructive" });
      return;
    }
    setLocation(next);
  }

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [regBusiness, setRegBusiness] = useState("");
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (!loading && currentUser) {
      setLocation(next);
    }
  }, [currentUser, loading, next, setLocation]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    if (!EMAIL_REGEX.test(loginEmail)) {
      setLoginError("Ingresá un email válido.");
      return;
    }
    if (loginPassword.length < 6) {
      setLoginError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setLoginSubmitting(true);
    const err = await login(loginEmail.trim(), loginPassword);
    setLoginSubmitting(false);
    if (err) {
      setLoginError(err);
      return;
    }
    setLocation(next);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setRegError(null);
    if (regName.trim().length < 2) {
      setRegError("Ingresá tu nombre.");
      return;
    }
    if (regBusiness.trim().length < 2) {
      setRegError("Ingresá el nombre de tu negocio.");
      return;
    }
    if (!EMAIL_REGEX.test(regEmail)) {
      setRegError("Ingresá un email válido.");
      return;
    }
    if (regPassword.length < 6) {
      setRegError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setRegSubmitting(true);
    const err = await register({
      email: regEmail.trim(),
      password: regPassword,
      name: regName.trim(),
      businessName: regBusiness.trim(),
    });
    setRegSubmitting(false);
    if (err) {
      setRegError(err);
      return;
    }
    setLocation(next);
  }

  async function handleResetPassword() {
    if (!EMAIL_REGEX.test(loginEmail)) {
      toast({
        title: "Email requerido",
        description: "Escribí tu email arriba para que te mandemos el enlace.",
        variant: "destructive",
      });
      return;
    }
    setResetting(true);
    const err = await resetPassword(loginEmail.trim());
    setResetting(false);
    if (err) {
      toast({ title: "No se pudo enviar", description: err, variant: "destructive" });
      return;
    }
    toast({
      title: "Listo",
      description: "Te enviamos un email para restablecer la contraseña.",
    });
  }

  return (
    <div className="relative min-h-[100dvh] flex items-center justify-center px-4 py-12 overflow-hidden bg-background">
      <div className="auth-blobs" aria-hidden="true">
        <div className="auth-blob auth-blob-1" />
        <div className="auth-blob auth-blob-2" />
        <div className="auth-blob auth-blob-3" />
        <div className="auth-blob auth-blob-4" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-md rounded-3xl border border-border bg-card/80 backdrop-blur-xl p-8 shadow-2xl"
      >
        <div className="text-center mb-6">
          <button
            type="button"
            onClick={() => setLocation("/")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Volver al inicio
          </button>
          <h1 className="mt-3 text-2xl font-display font-black">
            <span className="font-black">YAGUAR</span> ESTUDIO
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tu panel privado para gestionar tu negocio textil.
          </p>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "register")} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Ingresar</TabsTrigger>
            <TabsTrigger value="register">Crear cuenta</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="mt-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    placeholder="tu@email.com"
                    className="pl-9"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="pl-9"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {loginError ? (
                <div className="text-sm text-destructive">{loginError}</div>
              ) : null}

              <Button type="submit" className="w-full" disabled={loginSubmitting}>
                {loginSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Ingresar <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>

              <button
                type="button"
                onClick={handleResetPassword}
                disabled={resetting}
                className="block w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {resetting ? "Enviando…" : "¿Olvidaste tu contraseña?"}
              </button>
            </form>

            <AuthDivider />
            <GoogleButton onClick={handleGoogle} loading={googleSubmitting} />
          </TabsContent>

          <TabsContent value="register" className="mt-6">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reg-name">Nombre</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reg-name"
                    type="text"
                    autoComplete="name"
                    placeholder="Juan Pérez"
                    className="pl-9"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-business">Nombre del negocio</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reg-business"
                    type="text"
                    autoComplete="organization"
                    placeholder="Mi Emprendimiento Textil"
                    className="pl-9"
                    value={regBusiness}
                    onChange={(e) => setRegBusiness(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reg-email"
                    type="email"
                    autoComplete="email"
                    placeholder="tu@email.com"
                    className="pl-9"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reg-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Mínimo 6 caracteres"
                    className="pl-9"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {regError ? (
                <div className="text-sm text-destructive">{regError}</div>
              ) : null}

              <Button type="submit" className="w-full" disabled={regSubmitting}>
                {regSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Crear cuenta <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>

              <p className="text-[11px] text-muted-foreground text-center">
                Es 100% gratis. Tus datos son privados y sólo vos los ves.
              </p>
            </form>

            <AuthDivider />
            <GoogleButton onClick={handleGoogle} loading={googleSubmitting} label="Registrarme con Google" />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}

function AuthDivider() {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-muted-foreground">o</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function GoogleButton({
  onClick,
  loading,
  label = "Continuar con Google",
}: {
  onClick: () => void;
  loading: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 h-11 rounded-xl border border-border bg-white text-gray-800 font-semibold text-sm hover:bg-gray-50 transition-colors disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>
          <GoogleIcon />
          {label}
        </>
      )}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.49h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.63z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.71a5.41 5.41 0 0 1 0-3.42V4.96H.96a9 9 0 0 0 0 8.08l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}
