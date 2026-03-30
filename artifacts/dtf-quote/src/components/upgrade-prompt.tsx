import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, X, Check, Zap, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api";

interface UpgradePromptProps {
  open: boolean;
  onClose: () => void;
  feature: string;
  mode?: "limit" | "plans";
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
      formatLimit(p.limits.mockupPngs, "sesiones de mockup"),
      formatLimit(p.limits.pdfExports, "exportaciones PDF"),
    ],
    color: colors[p.slug] || "from-gray-400 to-gray-500",
    popular: p.slug === "standard",
  };
}

const FALLBACK_PLANS: DisplayPlan[] = [
  { slug: "free", name: "Gratis", price: 0, features: ["10 cotizaciones/mes", "5 sesiones de mockup/mes", "3 exportaciones PDF/mes"], color: "from-gray-400 to-gray-500" },
  { slug: "standard", name: "Estándar", price: 7990, features: ["40 cotizaciones/mes", "30 sesiones de mockup/mes", "25 exportaciones PDF/mes"], color: "from-blue-500 to-indigo-600", popular: true },
  { slug: "premium", name: "Premium", price: 14990, features: ["Cotizaciones ilimitadas", "Sesiones de mockup ilimitadas", "Exportaciones PDF ilimitadas"], color: "from-orange-500 to-red-500" },
];

export function UpgradePrompt({ open, onClose, feature, mode = "limit" }: UpgradePromptProps) {
  const { subscription } = useAuth();
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [plans, setPlans] = useState<DisplayPlan[]>(FALLBACK_PLANS);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setError(null);
    apiFetch<{ plans: ApiPlan[] }>("/subscription/plans").then(({ data }) => {
      if (data?.plans) {
        setPlans(data.plans.map(apiPlanToDisplay));
      }
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const handleUpgrade = async (planSlug: string) => {
    setError(null);
    setUpgrading(planSlug);
    const { data, error } = await apiFetch<{ checkout: { id?: string; initPoint: string; mode?: "hosted_plan" | "preapproval" } }>(
      "/subscription/checkout",
      {
        method: "POST",
        body: JSON.stringify({ planSlug }),
      },
    );
    setUpgrading(null);

    if (error) {
      setError(error);
      return;
    }

    if (data?.checkout?.initPoint) {
      if (data.checkout.mode === "preapproval" && data.checkout.id) {
        window.sessionStorage.setItem("mp:pending-preapproval-id", data.checkout.id);
      } else {
        window.sessionStorage.removeItem("mp:pending-preapproval-id");
        window.sessionStorage.setItem("mp:pending-plan-slug", planSlug);
      }
      window.location.href = data.checkout.initPoint;
      return;
    }

    setError("Mercado Pago no devolvió una URL válida para continuar.");
  };

  if (!mounted) {
    return null;
  }

  const badgeLabel = mode === "plans" ? "Planes disponibles" : "Límite alcanzado";
  const title = mode === "plans" ? "Elegí el plan para tu negocio" : `Necesitás más ${feature}`;
  const description = mode === "plans"
    ? "Compará límites y activá tu plan desde el checkout seguro de Mercado Pago."
    : "Mejorá tu plan para seguir usando esta función. El cobro se autoriza en Mercado Pago.";

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[999] overflow-y-auto"
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

          <div className="relative flex min-h-full items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 16 }}
              className="relative w-full max-w-5xl rounded-3xl border border-border bg-background/95 shadow-2xl backdrop-blur-xl"
            >
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-xl hover:bg-secondary transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="max-h-[90vh] overflow-y-auto">
                <div className="p-6 pb-4 text-center sm:p-8 sm:pb-5">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 text-orange-500 text-xs font-bold mb-3">
                    <Crown className="w-3.5 h-3.5" />
                    {badgeLabel}
                  </div>
                  <h2 className="text-xl font-bold text-foreground sm:text-2xl">
                    {title}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1 max-w-2xl mx-auto">
                    {description}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 p-6 pt-2 sm:grid-cols-3 sm:p-8 sm:pt-3">
                  {plans.map((plan) => {
                    const isCurrent = subscription?.planSlug === plan.slug;
                    const isPaidPlan = plan.price > 0;
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
                          {plan.price === 0 ? "Gratis" : `$${plan.price.toLocaleString("es-AR")}`}
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
                          disabled={isCurrent || !isPaidPlan || upgrading !== null}
                          className={`w-full mt-4 py-2 rounded-xl text-sm font-bold transition-all ${
                            isCurrent
                              ? "bg-secondary text-muted-foreground cursor-default"
                              : !isPaidPlan
                                ? "bg-secondary text-muted-foreground cursor-default"
                                : plan.popular
                                ? "bg-primary text-primary-foreground hover:opacity-90"
                                : "bg-secondary hover:bg-secondary/80 text-foreground"
                          }`}
                        >
                          {isCurrent
                            ? "Plan actual"
                            : !isPaidPlan
                              ? "Plan base"
                              : upgrading === plan.slug
                                ? "Conectando..."
                                : "Ir a Mercado Pago"}
                        </button>
                        {isPaidPlan && (
                          <p className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1.5">
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            Se abre el checkout seguro de Mercado Pago
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
                {error && (
                  <div className="px-6 pb-6 sm:px-8 sm:pb-8">
                    <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      {error}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    ,
    document.body
  );
}
