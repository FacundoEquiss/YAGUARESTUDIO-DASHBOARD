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
  if (!next) return "/app";
  try {
    const decoded = decodeURIComponent(next);
    return decoded.startsWith("/") ? decoded : "/app";
  } catch {
    return "/app";
  }
}

export function AuthPage() {
  const [, setLocation] = useLocation();
  const { currentUser, loading, login, register, resetPassword } = useAuth();
  const { toast } = useToast();

  const next = useMemo(() => getNextFromSearch(), []);
  const [tab, setTab] = useState<"login" | "register">("login");

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
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
