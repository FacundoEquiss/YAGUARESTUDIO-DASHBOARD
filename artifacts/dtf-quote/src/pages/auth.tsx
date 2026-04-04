import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, LogIn, UserPlus, Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { sanitizeNextPath } from "@/lib/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Tab = "login" | "register";

function getSearchParams() {
  const params = new URLSearchParams(window.location.search);
  return params;
}

function getInitialTab(): Tab {
  return getSearchParams().get("tab") === "register" ? "register" : "login";
}

function getNextRoute(): string {
  return sanitizeNextPath(getSearchParams().get("next"));
}

const MIN_PASSWORD_LENGTH = 6;

export function AuthPage() {
  const { login, register } = useAuth();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<Tab>(getInitialTab);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const nextRoute = getNextRoute();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleSuccess = () => {
    setLocation(nextRoute);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();

      if (!emailRegex.test(normalizedEmail)) {
        setError("Ingresá un correo válido");
        setLoading(false);
        return;
      }

      if (password.length < MIN_PASSWORD_LENGTH) {
        setError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`);
        setLoading(false);
        return;
      }

      if (tab === "register") {
        const trimmedName = name.trim();
        if (trimmedName.length < 2) {
          setError("Ingresá tu nombre (mínimo 2 caracteres)");
          setLoading(false);
          return;
        }

        if (password !== confirmPassword) {
          setError("Las contraseñas no coinciden");
          setLoading(false);
          return;
        }

        const err = await register({
          email: normalizedEmail,
          password,
          name: trimmedName,
        });
        if (err) setError(err);
        else handleSuccess();
      } else {
        const err = await login(normalizedEmail, password);
        if (err) setError(err);
        else handleSuccess();
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card-wrapper">
      <div className="auth-card">
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al inicio
        </button>

        <div className="mb-8">
          <h1 className="text-4xl font-display font-bold text-primary">TRAZO</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            <span className="font-black text-foreground">Trazo</span> by Yaguar Estudio
          </p>
        </div>

        <div className="mb-6 rounded-2xl border border-primary/15 bg-primary/5 p-4">
          <div className="font-bold text-foreground">Acceso con cuenta</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Iniciá sesión para entrar al dashboard y administrar tu negocio.
          </div>
        </div>

        <div className="flex bg-secondary rounded-2xl p-1 mb-5">
          {(["login", "register"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                setError(null);
                setConfirmPassword("");
              }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                tab === t
                  ? "bg-gray-800 text-white shadow-sm"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {t === "login" ? "Iniciar Sesión" : "Crear Cuenta"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence mode="wait">
            {tab === "register" && (
              <motion.div
                key="register-name"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-1.5 pb-1">
                  <Label htmlFor="auth-name" className="font-bold flex items-center gap-1.5">
                    <User className="w-4 h-4" /> Nombre
                  </Label>
                  <Input
                    id="auth-name"
                    placeholder="Tu nombre"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={tab === "register"}
                    autoFocus={tab === "register"}
                  />
                  <p className="text-xs text-muted-foreground pt-1">
                    Vas a poder completar más datos del perfil después de crear la cuenta.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-1.5">
            <Label htmlFor="auth-email" className="font-bold flex items-center gap-1.5">
              <Mail className="w-4 h-4" /> Correo
            </Label>
            <Input
              id="auth-email"
              type="email"
              placeholder="tucorreo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus={tab === "login"}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="auth-password" className="font-bold flex items-center gap-1.5">
              <Lock className="w-4 h-4" /> Contraseña
            </Label>
            <Input
              id="auth-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <AnimatePresence mode="wait">
            {tab === "register" && (
              <motion.div
                key="register-confirm-password"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-1.5 pb-1">
                  <Label htmlFor="auth-confirm-password" className="font-bold flex items-center gap-1.5">
                    <Lock className="w-4 h-4" /> Confirmar contraseña
                  </Label>
                  <Input
                    id="auth-confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required={tab === "register"}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-xl font-medium"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <Button type="submit" size="lg" className="w-full rounded-2xl" disabled={loading}>
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : tab === "login" ? (
              <><LogIn className="w-5 h-5 mr-2" /> Iniciar Sesión</>
            ) : (
              <><UserPlus className="w-5 h-5 mr-2" /> Crear Cuenta</>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
