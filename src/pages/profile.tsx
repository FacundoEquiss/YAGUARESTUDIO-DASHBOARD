import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { LogOut, Save, User as UserIcon } from "lucide-react";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() || "YE";
}

export function ProfilePage() {
  const { currentUser, logout, updateDisplayName } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const snap = await getDoc(doc(db, "users", currentUser.uid));
      if (cancelled) return;
      const data = snap.data();
      setName((data?.name as string | undefined) ?? currentUser.displayName ?? "");
      setBusinessName((data?.businessName as string | undefined) ?? "");
      setPhone((data?.phone as string | undefined) ?? "");
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  async function handleSave() {
    if (!currentUser) return;
    if (name.trim().length < 2) {
      toast({ title: "Error", description: "Ingresá tu nombre.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await setDoc(
        doc(db, "users", currentUser.uid),
        {
          email: currentUser.email,
          name: name.trim(),
          businessName: businessName.trim(),
          phone: phone.trim(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      if (name.trim() !== currentUser.displayName) {
        await updateDisplayName(name.trim());
      }
      toast({ title: "Perfil actualizado" });
    } catch {
      toast({ title: "Error", description: "No se pudo guardar.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await logout();
    setLocation("/");
  }

  if (!currentUser) return null;

  const displayName = currentUser.displayName || currentUser.email?.split("@")[0] || "Usuario";

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12 space-y-6">
      <header className="flex items-center gap-2">
        <UserIcon className="w-5 h-5 text-muted-foreground" />
        <h1 className="text-2xl font-display font-black">Mi Perfil</h1>
      </header>

      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              {currentUser.photoURL ? <AvatarImage src={currentUser.photoURL} /> : null}
              <AvatarFallback className="text-base">{getInitials(displayName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="font-semibold truncate">{displayName}</div>
              <div className="text-sm text-muted-foreground truncate">{currentUser.email}</div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prof-name">Nombre</Label>
              <Input
                id="prof-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                placeholder="Tu nombre"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prof-business">Nombre del negocio</Label>
              <Input
                id="prof-business"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                disabled={loading}
                placeholder="Mi Emprendimiento Textil"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prof-phone">Teléfono (opcional)</Label>
              <Input
                id="prof-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={loading}
                placeholder="+54 9 11 …"
                inputMode="tel"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button onClick={handleSave} disabled={loading || saving} className="flex-1">
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Guardando…" : "Guardar cambios"}
            </Button>
            <Button onClick={handleLogout} variant="outline" className="flex-1">
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar sesión
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
