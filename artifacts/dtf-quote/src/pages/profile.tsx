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

export function ProfilePage() {
  const [, setLocation] = useLocation();
  const { currentUser, subscription, logout, updateProfile } = useAuth();
  const { usage, limits } = useUsage();
  const { toast } = useToast();

  const [name, setName] = useState(currentUser?.name || "");
  const [lastName, setLastName] = useState(currentUser?.lastName || "");
  const [phone, setPhone] = useState(currentUser?.phone || "");
  const [businessName, setBusinessName] = useState(currentUser?.businessName || "");
  const [birthDate, setBirthDate] = useState(currentUser?.birthDate || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const isGuest = currentUser?.role === "guest";
  const isMaster = currentUser?.role === "master";

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || "");
      setLastName(currentUser.lastName || "");
      setPhone(currentUser.phone || "");
      setBusinessName(currentUser.businessName || "");
      setBirthDate(currentUser.birthDate || "");
    }
  }, [currentUser]);

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const { data, error } = await apiFetch<{ user: Partial<AuthUser> }>("/auth/profile", {
        method: "PUT",
        body: JSON.stringify({ name, lastName, phone, businessName, birthDate }),
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
      <div className="px-5 py-8 flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
          <User className="w-8 h-8 text-primary opacity-40" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Modo Invitado</h2>
        <p className="text-muted-foreground text-sm max-w-sm">
          Creá una cuenta para acceder a tu perfil, guardar tus datos y administrar tu suscripción.
        </p>
        <Button onClick={() => setLocation("/auth?tab=register")} className="rounded-xl">
          Crear Cuenta
        </Button>
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
    <div className="px-4 py-6 md:px-10 md:py-10 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setLocation("/app")}
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

      {subscription && !isMaster && (
        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Crown className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground">Suscripción</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">Plan actual</p>
              <p className="text-sm font-bold text-primary">{subscription.planName}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">Estado</p>
              <p className="text-sm font-bold text-green-400">Activo</p>
            </div>
            {periodEndDate && (
              <div className="bg-white/5 rounded-xl p-3 col-span-2">
                <p className="text-xs text-muted-foreground mb-1">Próxima renovación</p>
                <p className="text-sm font-bold text-foreground">{periodEndDate}</p>
              </div>
            )}
          </div>
          {limits.dtfQuotes !== -1 && (
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
    </div>
  );
}
