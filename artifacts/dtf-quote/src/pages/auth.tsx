import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, LogIn, UserPlus, Users } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Tab = "login" | "register";

export function AuthPage() {
  const { login, register, loginAsGuest } = useAuth();
  const [tab, setTab] = useState<Tab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
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
      const err = register(email, password, name);
      if (err) setError(err);
    } else {
      const err = login(email, password);
      if (err) setError(err);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background px-6 py-14 max-w-md mx-auto">
      <div className="mb-10">
        <h1 className="text-4xl font-display font-bold text-primary">Cotizador DTF</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          powered by <span className="font-black text-foreground">YAGUAR</span> ESTUDIO
        </p>
      </div>

      <button
        onClick={loginAsGuest}
        className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-all mb-8 group text-left"
      >
        <div className="w-11 h-11 rounded-2xl bg-secondary flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
          <Users className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <div>
          <div className="font-bold text-foreground">Entrar como Invitado</div>
          <div className="text-xs text-muted-foreground mt-0.5">Sin cuenta · cotiza directamente</div>
        </div>
      </button>

      <div className="relative flex items-center gap-3 mb-6">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground font-medium px-1">o con cuenta</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <div className="flex bg-secondary rounded-2xl p-1 mb-6">
        {(["login", "register"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setError(null); }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
              tab === t
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white"
                : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
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
          {tab === "login" ? (
            <><LogIn className="w-5 h-5 mr-2" /> Iniciar Sesión</>
          ) : (
            <><UserPlus className="w-5 h-5 mr-2" /> Crear Cuenta</>
          )}
        </Button>
      </form>
    </div>
  );
}
