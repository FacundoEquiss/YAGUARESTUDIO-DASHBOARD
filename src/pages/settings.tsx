import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  Settings as SettingsIcon,
  Building2,
  Calculator,
  Palette,
  Database,
  Save,
  Download,
  LogOut,
  Trash2,
  User as UserIcon,
  Sun,
  Moon,
  Loader2,
} from "lucide-react";
import { collection, getDocs } from "firebase/firestore";
import { deleteUser } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { useBusinessSettings, type BusinessSettings } from "@/hooks/use-business-settings";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/theme-provider";
import { CURRENCIES, setCurrencyConfig } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DtfSettingsSection } from "@/components/settings/dtf-settings-section";

type SectionId = "negocio" | "cotizador" | "apariencia" | "datos";

const SECTIONS: { id: SectionId; label: string; icon: typeof Building2 }[] = [
  { id: "negocio", label: "Mi negocio", icon: Building2 },
  { id: "cotizador", label: "Cotizador DTF", icon: Calculator },
  { id: "apariencia", label: "Apariencia", icon: Palette },
  { id: "datos", label: "Datos y cuenta", icon: Database },
];

function getHashSection(): SectionId {
  const h = (typeof window !== "undefined" ? window.location.hash.replace("#", "") : "") as SectionId;
  return SECTIONS.some((s) => s.id === h) ? h : "negocio";
}

export function SettingsPage() {
  const [active, setActive] = useState<SectionId>(getHashSection);

  useEffect(() => {
    const onHash = () => setActive(getHashSection());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  function selectSection(id: SectionId) {
    setActive(id);
    if (typeof window !== "undefined") window.history.replaceState(null, "", `#${id}`);
  }

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-6 flex flex-col gap-6 pb-12 max-w-5xl">
      <header className="flex items-center gap-2">
        <SettingsIcon className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-3xl font-display font-bold">Configuración</h1>
          <p className="text-muted-foreground text-sm">Ajustá tu negocio y tus preferencias.</p>
        </div>
      </header>

      {/* Section nav */}
      <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => selectSection(s.id)}
            className={cn(
              "shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-colors",
              active === s.id
                ? "bg-primary/12 text-primary border-primary/30"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            <s.icon className="w-4 h-4" />
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex gap-8">
        {/* Desktop sidebar nav */}
        <nav className="hidden lg:flex flex-col gap-1 w-52 shrink-0">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => selectSection(s.id)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left",
                active === s.id
                  ? "bg-primary/12 text-primary font-bold"
                  : "text-muted-foreground hover:bg-white/8 hover:text-foreground",
              )}
            >
              <s.icon className="w-4 h-4 shrink-0" />
              {s.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 min-w-0">
          {active === "negocio" && <BusinessSection />}
          {active === "cotizador" && <DtfSettingsSection />}
          {active === "apariencia" && <AppearanceSection />}
          {active === "datos" && <DataSection />}
        </div>
      </div>
    </div>
  );
}

function BusinessSection() {
  const { settings, loading, save } = useBusinessSettings();
  const { toast } = useToast();
  const [form, setForm] = useState<BusinessSettings>(settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading) setForm(settings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  async function handleSave() {
    setSaving(true);
    try {
      await save(form);
      const match = CURRENCIES.find((c) => c.code === form.currency) ?? CURRENCIES[0];
      setCurrencyConfig({ currency: match.code, locale: match.locale });
      toast({ title: "Datos guardados", description: "Tu información de negocio se actualizó." });
    } catch {
      toast({ title: "Error", description: "No se pudo guardar.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="text-base font-bold">Datos de tu negocio</h3>
          <p className="text-sm text-muted-foreground -mt-2">
            Aparecen en tus cotizaciones y presupuestos.
          </p>

          <div className="space-y-2">
            <Label htmlFor="biz-name">Nombre del negocio</Label>
            <Input
              id="biz-name"
              value={form.businessName}
              onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
              placeholder="Mi Emprendimiento Textil"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="biz-tax">CUIT / Identificación fiscal (opcional)</Label>
            <Input
              id="biz-tax"
              value={form.taxId}
              onChange={(e) => setForm((f) => ({ ...f, taxId: e.target.value }))}
              placeholder="20-12345678-9"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="biz-currency">Moneda</Label>
            <Select value={form.currency} onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}>
              <SelectTrigger id="biz-currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Se usa para mostrar todos los precios de la app.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="text-base font-bold">Contacto</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="biz-phone">Teléfono / WhatsApp</Label>
              <Input
                id="biz-phone"
                value={form.contactPhone}
                onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
                placeholder="+54 9 11 …"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="biz-email">Email</Label>
              <Input
                id="biz-email"
                type="email"
                value={form.contactEmail}
                onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
                placeholder="contacto@minegocio.com"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="biz-ig">Instagram</Label>
            <Input
              id="biz-ig"
              value={form.instagram}
              onChange={(e) => setForm((f) => ({ ...f, instagram: e.target.value }))}
              placeholder="@minegocio"
            />
          </div>
        </CardContent>
      </Card>

      <Button size="lg" className="w-full rounded-2xl" onClick={handleSave} disabled={saving || loading}>
        <Save className="w-5 h-5 mr-2" />
        {saving ? "Guardando…" : "Guardar datos del negocio"}
      </Button>
    </div>
  );
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const options = [
    { id: "dark", label: "Oscuro", icon: Moon },
    { id: "light", label: "Claro", icon: Sun },
  ] as const;

  return (
    <div className="space-y-6 max-w-lg">
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="text-base font-bold">Tema</h3>
          <p className="text-sm text-muted-foreground -mt-2">Elegí cómo se ve la app.</p>
          <div className="grid grid-cols-2 gap-3">
            {options.map((o) => (
              <button
                key={o.id}
                onClick={() => setTheme(o.id)}
                className={cn(
                  "flex flex-col items-center gap-2 p-5 rounded-2xl border transition-colors",
                  theme === o.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                <o.icon className="w-6 h-6" />
                <span className="text-sm font-bold">{o.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const EXPORT_COLLECTIONS = [
  "clients",
  "suppliers",
  "orders",
  "products",
  "services",
  "transactions",
  "financialAccounts",
];

function DataSection() {
  const { currentUser, logout } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [exporting, setExporting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const uid = currentUser?.uid;

  async function handleExport() {
    if (!uid) return;
    setExporting(true);
    try {
      const data: Record<string, unknown> = {
        exportedAt: new Date().toISOString(),
        account: { uid, email: currentUser?.email },
      };
      for (const name of EXPORT_COLLECTIONS) {
        const snap = await getDocs(collection(db, "users", uid, name));
        data[name] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `yaguar-estudio-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Backup descargado", description: "Guardá el archivo en un lugar seguro." });
    } catch {
      toast({ title: "Error", description: "No se pudo exportar.", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteAccount() {
    if (!auth.currentUser) return;
    setDeleting(true);
    try {
      await deleteUser(auth.currentUser);
      toast({ title: "Cuenta eliminada" });
      setLocation("/");
    } catch (error: unknown) {
      const code = (error as { code?: string }).code;
      if (code === "auth/requires-recent-login") {
        toast({
          title: "Verificación requerida",
          description: "Por seguridad, cerrá sesión y volvé a entrar antes de eliminar la cuenta.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Error", description: "No se pudo eliminar la cuenta.", variant: "destructive" });
      }
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  async function handleLogout() {
    await logout();
    setLocation("/");
  }

  return (
    <div className="space-y-6 max-w-lg">
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="text-base font-bold">Tu cuenta</h3>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold">
              {(currentUser?.displayName || currentUser?.email || "Y").slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="font-semibold truncate">{currentUser?.displayName || "Usuario"}</div>
              <div className="text-sm text-muted-foreground truncate">{currentUser?.email}</div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setLocation("/profile")}>
              <UserIcon className="w-4 h-4 mr-2" /> Editar perfil
            </Button>
            <Button variant="outline" className="flex-1" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" /> Cerrar sesión
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-3">
          <h3 className="text-base font-bold">Tus datos</h3>
          <p className="text-sm text-muted-foreground">
            Descargá una copia de toda tu información (clientes, pedidos, productos, finanzas) en un
            archivo.
          </p>
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            {exporting ? "Generando…" : "Exportar mis datos"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardContent className="p-6 space-y-3">
          <h3 className="text-base font-bold text-destructive">Zona de peligro</h3>
          <p className="text-sm text-muted-foreground">
            Eliminar tu cuenta es permanente. Te recomendamos exportar tus datos antes.
          </p>
          <Button
            variant="outline"
            className="border-destructive/40 text-destructive hover:bg-destructive/10"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" /> Eliminar mi cuenta
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tu cuenta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción es permanente. Perderás el acceso a tu cuenta. Asegurate de exportar tus
              datos primero.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Eliminando…" : "Sí, eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
