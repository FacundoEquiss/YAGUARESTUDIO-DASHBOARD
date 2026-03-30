import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, LogIn, UserPlus, Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
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
  return getSearchParams().get("next") || "/dashboard";
}

const PAGE_LABELS: Record<string, string> = {
  "/dashboard": "TRAZO",
  "/app": "TRAZO",
  "/mockups": "Generador de Mockups",
  "/history": "Historial",
  "/profile": "Mi Perfil",
};

export function AuthPage() {
  const { login, register } = useAuth();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<Tab>(getInitialTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const nextRoute = getNextRoute();
  const pageLabel = PAGE_LABELS[nextRoute] || "TRAZO";

  const handleSuccess = () => {
    setLocation(nextRoute);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (tab === "register") {
        if (!name.trim()) {
          setError("El nombre es requerido");
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError("La contraseña debe tener al menos 6 caracteres");
          setLoading(false);
          return;
        }
        const err = await register(email, password, name);
        if (err) setError(err);
        else handleSuccess();
      } else {
        const err = await login(email, password);
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
            <h1 className="text-4xl font-display font-bold text-primary">{pageLabel}</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              <span className="font-black text-foreground">Trazo</span> by Yaguar Estudio
            </p>
          </div>

          <div className="mb-6 rounded-2xl border border-primary/15 bg-primary/5 p-4">
            <div className="font-bold text-foreground">Acceso con cuenta</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Para guardar trabajo, controlar límites y activar el plan correcto en tu perfil.
            </div>
          </div>

          <div className="flex bg-secondary rounded-2xl p-1 mb-5">
            {(["login", "register"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(null); }}
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
                  key="name-field"
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
                      placeholder="Tu nombre o empresa"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
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
