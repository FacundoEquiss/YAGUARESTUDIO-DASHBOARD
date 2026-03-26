import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, X, Check, Zap } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useUsage } from "@/hooks/use-usage";
import { apiFetch } from "@/lib/api";

interface UpgradePromptProps {
  open: boolean;
  onClose: () => void;
  feature: string;
}

interface PlanLimits {
  dtfQuotes: number;
  mockupPngs: number;
  pdfExports: number;
}

interface ApiPlan {
  id: number;
  name: string;
  slug: string;
  limits: PlanLimits;
  price: number;
  isActive: boolean;
}

interface DisplayPlan {
  slug: string;
  name: string;
  price: number;
  features: string[];
  color: string;
  popular?: boolean;
}

function formatLimit(n: number, label: string): string {
  return n === -1 ? `${label} ilimitadas` : `${n} ${label}/mes`;
}

function apiPlanToDisplay(p: ApiPlan): DisplayPlan {
  const colors: Record<string, string> = {
    free: "from-gray-400 to-gray-500",
    standard: "from-blue-500 to-indigo-600",
    premium: "from-orange-500 to-red-500",
  };
  return {
    slug: p.slug,
    name: p.name,
    price: p.price,
    features: [
      formatLimit(p.limits.dtfQuotes, "cotizaciones"),
      formatLimit(p.limits.mockupPngs, "mockups PNG"),
      formatLimit(p.limits.pdfExports, "fichas PDF"),
    ],
    color: colors[p.slug] || "from-gray-400 to-gray-500",
    popular: p.slug === "standard",
  };
}

const FALLBACK_PLANS: DisplayPlan[] = [
  { slug: "free", name: "Gratis", price: 0, features: ["10 cotizaciones/mes", "5 mockups PNG", "3 fichas PDF"], color: "from-gray-400 to-gray-500" },
  { slug: "standard", name: "Estándar", price: 4990, features: ["40 cotizaciones/mes", "30 mockups PNG", "25 fichas PDF"], color: "from-blue-500 to-indigo-600", popular: true },
  { slug: "premium", name: "Premium", price: 9990, features: ["Cotizaciones ilimitadas", "Mockups ilimitados", "Fichas ilimitadas"], color: "from-orange-500 to-red-500" },
];

export function UpgradePrompt({ open, onClose, feature }: UpgradePromptProps) {
  const { subscription, refreshSession } = useAuth();
  const { refresh } = useUsage();
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [plans, setPlans] = useState<DisplayPlan[]>(FALLBACK_PLANS);

  useEffect(() => {
    if (!open) return;
    apiFetch<{ plans: ApiPlan[] }>("/subscription/plans").then(({ data }) => {
      if (data?.plans) {
        setPlans(data.plans.map(apiPlanToDisplay));
      }
    });
  }, [open]);

  const handleUpgrade = async (planSlug: string) => {
    setUpgrading(planSlug);
    const { error } = await apiFetch("/subscription/upgrade", {
      method: "POST",
      body: JSON.stringify({ planSlug }),
    });
    setUpgrading(null);
    if (!error) {
      await Promise.all([refresh(), refreshSession()]);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[999] flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-2xl bg-background/95 backdrop-blur-xl rounded-3xl border border-border shadow-2xl overflow-hidden"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-xl hover:bg-secondary transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-6 pb-4 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 text-orange-500 text-xs font-bold mb-3">
                <Crown className="w-3.5 h-3.5" />
                Límite alcanzado
              </div>
              <h2 className="text-xl font-bold text-foreground">
                Necesitás más {feature}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Mejorá tu plan para seguir usando esta función
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-6 pt-2">
              {plans.map((plan) => {
                const isCurrent = subscription?.planSlug === plan.slug;
                return (
                  <div
                    key={plan.slug}
                    className={`relative rounded-2xl border p-4 ${
                      plan.popular
                        ? "border-primary shadow-lg shadow-primary/10"
                        : "border-border"
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        Popular
                      </div>
                    )}

                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-3`}>
                      {plan.slug === "premium" ? (
                        <Crown className="w-5 h-5 text-white" />
                      ) : plan.slug === "standard" ? (
                        <Zap className="w-5 h-5 text-white" />
                      ) : (
                        <Check className="w-5 h-5 text-white" />
                      )}
                    </div>

                    <h3 className="font-bold text-foreground">{plan.name}</h3>
                    <div className="text-2xl font-black text-foreground mt-1">
                      {plan.price === 0 ? "Gratis" : `$${plan.price.toLocaleString("es-CL")}`}
                      {plan.price > 0 && <span className="text-xs font-normal text-muted-foreground">/mes</span>}
                    </div>

                    <ul className="mt-3 space-y-1.5">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Check className="w-3 h-3 text-primary shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => handleUpgrade(plan.slug)}
                      disabled={isCurrent || upgrading !== null}
                      className={`w-full mt-4 py-2 rounded-xl text-sm font-bold transition-all ${
                        isCurrent
                          ? "bg-secondary text-muted-foreground cursor-default"
                          : plan.popular
                            ? "bg-primary text-primary-foreground hover:opacity-90"
                            : "bg-secondary hover:bg-secondary/80 text-foreground"
                      }`}
                    >
                      {isCurrent
                        ? "Plan actual"
                        : upgrading === plan.slug
                          ? "Actualizando..."
                          : "Elegir plan"}
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
