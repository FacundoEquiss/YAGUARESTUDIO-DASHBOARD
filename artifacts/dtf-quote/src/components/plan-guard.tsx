import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useUsage } from "@/hooks/use-usage";
import { UpgradePrompt } from "./upgrade-prompt";
import { Lock } from "lucide-react";

interface PlanGuardProps {
  feature: "dtf_quotes" | "mockup_pngs" | "pdf_exports";
  featureLabel: string;
  children: React.ReactNode;
}

export function PlanGuard({ feature, featureLabel, children }: PlanGuardProps) {
  const { currentUser, subscription } = useAuth();
  const { canUse } = useUsage();
  const [showUpgrade, setShowUpgrade] = useState(false);

  const isGuest = currentUser?.role === "guest";
  const isMaster = currentUser?.role === "master";

  if (isMaster || isGuest) {
    return <>{children}</>;
  }

  if (!subscription) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center">
          <Lock className="w-7 h-7 text-orange-500" />
        </div>
        <div>
          <h3 className="font-bold text-foreground text-lg">Suscripción requerida</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Necesitás un plan activo para acceder a esta función.
          </p>
        </div>
        <button
          onClick={() => setShowUpgrade(true)}
          className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity"
        >
          Ver planes
        </button>
        <UpgradePrompt
          open={showUpgrade}
          onClose={() => setShowUpgrade(false)}
          feature={featureLabel}
        />
      </div>
    );
  }

  if (!canUse(feature)) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center">
          <Lock className="w-7 h-7 text-orange-500" />
        </div>
        <div>
          <h3 className="font-bold text-foreground text-lg">Límite alcanzado</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Ya usaste todas tus {featureLabel} de este período.
          </p>
        </div>
        <button
          onClick={() => setShowUpgrade(true)}
          className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity"
        >
          Mejorar plan
        </button>
        <UpgradePrompt
          open={showUpgrade}
          onClose={() => setShowUpgrade(false)}
          feature={featureLabel}
        />
      </div>
    );
  }

  return <>{children}</>;
}
