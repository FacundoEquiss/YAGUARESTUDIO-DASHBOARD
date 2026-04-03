import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  User,
  Mail,
  Phone,
  Building2,
  Calendar,
  Save,
  Lock,
  LogOut,
  Crown,
  Camera,
  ArrowLeft,
  Loader2,
  Check,
} from "lucide-react";
import { useAuth, type AuthUser } from "@/hooks/use-auth";
import { useUsage } from "@/hooks/use-usage";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UpgradePrompt } from "@/components/upgrade-prompt";

function getSubscriptionStatusLabel(status?: string | null): string {
  switch ((status || "").toLowerCase()) {
    case "active":
      return "Activo";
    case "pending":
      return "Pendiente";
    case "paused":
      return "Pausado";
    case "cancelled":
      return "Cancelado";
    default:
      return "Sin plan";
  }
}

function getSubscriptionStatusClass(status?: string | null): string {
  switch ((status || "").toLowerCase()) {
    case "active":
      return "text-green-400";
    case "pending":
      return "text-amber-400";
    case "paused":
      return "text-yellow-400";
    case "cancelled":
      return "text-red-400";
    default:
      return "text-muted-foreground";
  }
}

export function ProfilePage() {
  const [, setLocation] = useLocation();
  const { currentUser, subscription, logout, updateProfile, refreshSession } = useAuth();
  const { usage, limits, refresh: refreshUsage } = useUsage();
  const { toast } = useToast();

  const [name, setName] = useState(currentUser?.name || "");
  const [username, setUsername] = useState(currentUser?.username || "");
  const [lastName, setLastName] = useState(currentUser?.lastName || "");
  const [phone, setPhone] = useState(currentUser?.phone || "");
  const [businessName, setBusinessName] = useState(currentUser?.businessName || "");
  const [birthDate, setBirthDate] = useState(currentUser?.birthDate || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [syncingSubscription, setSyncingSubscription] = useState(false);

  const isGuest = currentUser?.role === "guest";
  const isMaster = currentUser?.role === "master";

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || "");
      setUsername(currentUser.username || "");
      setLastName(currentUser.lastName || "");
      setPhone(currentUser.phone || "");
      setBusinessName(currentUser.businessName || "");
      setBirthDate(currentUser.birthDate || "");
    }
  }, [currentUser]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("billing") !== "returned") return;

    const pendingPreapprovalId = window.sessionStorage.getItem("mp:pending-preapproval-id");
    const pendingPlanSlug = window.sessionStorage.getItem("mp:pending-plan-slug");
    const cleanupUrl = () => {
      window.sessionStorage.removeItem("mp:pending-preapproval-id");
      window.sessionStorage.removeItem("mp:pending-plan-slug");
      window.history.replaceState({}, document.title, "/profile");
    };

    if (!pendingPreapprovalId && !pendingPlanSlug) {
      refreshSession().finally(cleanupUrl);
      return;
    }

    let cancelled = false;
    setSyncingSubscription(true);

    const pollForWebhookSync = async () => {
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const [{ data }] = await Promise.all([
          apiFetch<{ subscription: { planSlug?: string; status?: string } | null }>("/auth/me"),
          refreshSession(),
          refreshUsage(),
        ]);

        if (data?.subscription?.planSlug === pendingPlanSlug && data.subscription.status === "active") {
          return "active";
        }

        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      return "pending";
    };

    if (!pendingPreapprovalId && pendingPlanSlug) {
      pollForWebhookSync()
        .then((status) => {
          if (cancelled) return;

          toast({
            title: status === "active" ? "Suscripción activada" : "Suscripción en revisión",
            description: status === "active"
              ? "Tu plan quedó actualizado correctamente."
              : "Mercado Pago devolvió el checkout, pero la activación todavía no está confirmada.",
            variant: status === "active" ? "default" : "destructive",
          });
        })
        .finally(() => {
          if (!cancelled) {
            setSyncingSubscription(false);
            cleanupUrl();
          }
        });

      return () => {
        cancelled = true;
      };
    }

    apiFetch<{ result?: { localStatus?: string } }>("/subscription/sync", {
      method: "POST",
      body: JSON.stringify({ preapprovalId: pendingPreapprovalId }),
    })
      .then(async ({ data, error }) => {
        if (cancelled) return;

        if (error) {
          if (pendingPlanSlug) {
            const status = await pollForWebhookSync();

            if (cancelled) return;

            toast({
              title: status === "active" ? "Suscripción activada" : "Suscripción pendiente",
              description: status === "active"
                ? "Tu plan quedó actualizado correctamente."
                : "Volvimos de Mercado Pago, pero la activación todavía no se pudo confirmar.",
              variant: status === "active" ? "default" : "destructive",
            });
            return;
          }

          toast({
            title: "Suscripción pendiente",
            description: "Volvimos de Mercado Pago, pero todavía no se pudo confirmar el estado de tu plan.",
            variant: "destructive",
          });
          return;
        }

        await Promise.all([refreshSession(), refreshUsage()]);

        const localStatus = data?.result?.localStatus;
        if (localStatus === "active") {
          toast({
            title: "Suscripción activada",
            description: "Tu plan quedó actualizado correctamente.",
          });
        } else {
          const status = pendingPlanSlug ? await pollForWebhookSync() : "pending";

          if (cancelled) return;

          toast({
            title: status === "active" ? "Suscripción activada" : "Suscripción en revisión",
            description: status === "active"
              ? "Tu plan quedó actualizado correctamente."
              : "Mercado Pago devolvió el checkout, pero la activación todavía no está confirmada.",
            variant: status === "active" ? "default" : "destructive",
          });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSyncingSubscription(false);
          cleanupUrl();
        }
      });

    return () => {
      cancelled = true;
    };
  }, [refreshSession, refreshUsage, toast]);

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const { data, error } = await apiFetch<{ user: Partial<AuthUser> }>("/auth/profile", {
        method: "PUT",
        body: JSON.stringify({ name, username, lastName, phone, businessName, birthDate }),
      });
      if (error) {
        toast({ title: "Error", description: error, variant: "destructive" });
      } else if (data?.user) {
        updateProfile(data.user);
        setSaved(true);
        toast({ title: "Perfil actualizado", description: "Los cambios se guardaron correctamente." });
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      toast({ title: "Error", description: "No se pudo guardar el perfil.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast({ title: "Error", description: "Completá ambos campos.", variant: "destructive" });
      return;
    }
    setChangingPassword(true);
    try {
      const { error } = await apiFetch("/auth/password", {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (error) {
        toast({ title: "Error", description: error, variant: "destructive" });
      } else {
        toast({ title: "Contraseña actualizada", description: "Tu contraseña fue cambiada exitosamente." });
        setCurrentPassword("");
        setNewPassword("");
      }
    } catch {
      toast({ title: "Error", description: "No se pudo cambiar la contraseña.", variant: "destructive" });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  if (isGuest) {
    return (
      <div className="px-4 py-6 sm:px-6 sm:py-6 flex flex-col items-center justify-center min-h-[60vh] gap-5 text-center">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
          <User className="w-8 h-8 text-primary opacity-40" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Modo Invitado</h2>
        <p className="text-muted-foreground text-sm max-w-sm">
          Creá una cuenta o iniciá sesión para acceder a tu perfil, guardar tus datos y administrar tu suscripción.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs">
          <Button onClick={() => setLocation("/auth?tab=register&next=/profile")} className="rounded-xl w-full">
            Crear Cuenta
          </Button>
          <Button onClick={() => setLocation("/auth?next=/profile")} variant="outline" className="rounded-xl w-full">
            Iniciar Sesión
          </Button>
        </div>
      </div>
    );
  }

  const initials = [name?.[0], lastName?.[0]].filter(Boolean).join("").toUpperCase() || currentUser?.email?.[0]?.toUpperCase() || "?";

  const periodEndDate = subscription?.periodEnd
    ? new Date(subscription.periodEnd).toLocaleDateString("es-AR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setLocation("/dashboard")}
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Mi Perfil</h1>
          <p className="text-sm text-muted-foreground">Administrá tu cuenta y preferencias</p>
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-6 flex items-center gap-5">
        <div className="relative shrink-0">
          {currentUser?.profilePhotoUrl ? (
            <img
              src={currentUser.profilePhotoUrl}
              alt="Foto de perfil"
              className="w-20 h-20 rounded-full object-cover border-2 border-primary/20"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
              <span className="text-2xl font-display font-bold text-primary">{initials}</span>
            </div>
          )}
          <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-lg">
            <Camera className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold text-foreground truncate">
            {name} {lastName}
          </p>
          <p className="text-sm text-muted-foreground truncate">{currentUser?.email}</p>
          {isMaster && (
            <span className="inline-flex items-center gap-1 mt-1 text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              <Crown className="w-3 h-3" /> Administrador
            </span>
          )}
        </div>
      </div>

      {!isMaster && (
        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-bold text-foreground">Suscripción</h3>
            </div>
            {subscription?.planSlug !== "premium" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUpgrade(true)}
                className="rounded-xl text-xs"
                disabled={syncingSubscription}
              >
                {syncingSubscription ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                ) : (
                  <Crown className="w-3.5 h-3.5 mr-1" />
                )}
                {syncingSubscription ? "Sincronizando..." : "Mejorar plan"}
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">Plan actual</p>
              <p className="text-sm font-bold text-primary">{subscription?.planName || "Gratis"}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">Estado</p>
              <p className={`text-sm font-bold ${getSubscriptionStatusClass(subscription?.status)}`}>
                {getSubscriptionStatusLabel(subscription?.status)}
              </p>
            </div>
            {periodEndDate && (
              <div className="bg-white/5 rounded-xl p-3 col-span-2">
                <p className="text-xs text-muted-foreground mb-1">Próxima renovación</p>
                <p className="text-sm font-bold text-foreground">{periodEndDate}</p>
              </div>
            )}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Los planes pagos se autorizan en Mercado Pago y luego se sincronizan automáticamente con tu cuenta.
          </p>
          {subscription && limits.dtfQuotes !== -1 && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Cotizaciones</span>
                <span className="font-bold text-foreground">{usage.dtfQuotes} / {limits.dtfQuotes}</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.min(100, (usage.dtfQuotes / limits.dtfQuotes) * 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Mockups</span>
                <span className="font-bold text-foreground">{usage.mockupPngs} / {limits.mockupPngs}</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.min(100, (usage.mockupPngs / limits.mockupPngs) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="glass-panel rounded-2xl p-5 space-y-5">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          Información Personal
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Nombre
            </Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Nombre de usuario
            </Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} placeholder="yaguar.estudio" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Apellido
            </Label>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Tu apellido" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5" /> Correo electrónico
          </Label>
          <Input value={currentUser?.email || ""} disabled className="opacity-60" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> Teléfono
            </Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+54 11 1234-5678" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Fecha de nacimiento
            </Label>
            <Input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" /> Nombre de tu negocio / marca
          </Label>
          <Input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Mi Emprendimiento Textil"
          />
        </div>

        <Button
          onClick={handleSaveProfile}
          disabled={saving}
          className="w-full rounded-xl"
          size="lg"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
          ) : saved ? (
            <Check className="w-5 h-5 mr-2" />
          ) : (
            <Save className="w-5 h-5 mr-2" />
          )}
          {saved ? "Guardado" : "Guardar Cambios"}
        </Button>
      </div>

      <div className="glass-panel rounded-2xl p-5 space-y-4">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Lock className="w-5 h-5 text-primary" />
          Cambiar Contraseña
        </h3>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-muted-foreground">Contraseña actual</Label>
          <Input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Tu contraseña actual"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-muted-foreground">Nueva contraseña</Label>
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
          />
        </div>
        <Button
          onClick={handleChangePassword}
          disabled={changingPassword}
          variant="outline"
          className="w-full rounded-xl"
        >
          {changingPassword ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Lock className="w-4 h-4 mr-2" />
          )}
          Cambiar Contraseña
        </Button>
      </div>

      <div className="glass-panel rounded-2xl p-5">
        <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
          <LogOut className="w-5 h-5 text-destructive" />
          Sesión
        </h3>
        <Button
          onClick={handleLogout}
          variant="destructive"
          className="w-full rounded-xl"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Cerrar Sesión
        </Button>
      </div>

      <div className="text-center text-xs text-muted-foreground pb-4">
        Cuenta creada el{" "}
        {currentUser?.createdAt
          ? new Date(currentUser.createdAt).toLocaleDateString("es-AR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          : "—"}
      </div>

      <UpgradePrompt
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        feature="herramientas y límites"
        mode="plans"
      />
    </div>
  );
}
