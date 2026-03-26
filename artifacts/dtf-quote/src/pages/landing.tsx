import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Calculator,
  Image,
  Scissors,
  BookOpen,
  Crown,
  Zap,
  Check,
  ArrowRight,
  ChevronDown,
  Instagram,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

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

function formatLimit(n: number, label: string): string {
  return n === -1 ? `${label} ilimitados` : `${n} ${label}/mes`;
}

const TOOLS = [
  {
    icon: Calculator,
    title: "Cotizador DTF",
    description:
      "Calculá el costo exacto de tus transfers DTF con precios por metro, márgenes y descuentos por cantidad. Resultado al instante.",
    cta: "Probar ahora",
    ready: true,
    color: "from-orange-500 to-amber-500",
  },
  {
    icon: Image,
    title: "Generador de Mockups",
    description:
      "Visualizá tus diseños en prendas reales. Subí tu arte, elegí la prenda y descargá un mockup listo para presentar al cliente.",
    cta: "Probar ahora",
    ready: true,
    color: "from-blue-500 to-indigo-500",
  },
  {
    icon: Scissors,
    title: "Extractor de Fondos",
    description:
      "Remové fondos de imágenes en segundos con inteligencia artificial. Ideal para preparar artes para DTF o catálogos.",
    cta: "Probar ahora",
    ready: false,
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: BookOpen,
    title: "Blog Educativo",
    description:
      "Aprendé todo sobre DTF, sublimación, vinilo y más. Guías, tutoriales y consejos para hacer crecer tu negocio textil.",
    cta: "Próximamente",
    ready: false,
    color: "from-purple-500 to-violet-500",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
};

const FALLBACK_PLANS: ApiPlan[] = [
  { id: 1, name: "Gratis", slug: "free", limits: { dtfQuotes: 10, mockupPngs: 5, pdfExports: 3 }, price: 0, isActive: true },
  { id: 2, name: "Estándar", slug: "standard", limits: { dtfQuotes: 40, mockupPngs: 30, pdfExports: 25 }, price: 4990, isActive: true },
  { id: 3, name: "Premium", slug: "premium", limits: { dtfQuotes: -1, mockupPngs: -1, pdfExports: -1 }, price: 9990, isActive: true },
];

export function LandingPage() {
  const [, setLocation] = useLocation();
  const [plans, setPlans] = useState<ApiPlan[]>(FALLBACK_PLANS);

  useEffect(() => {
    apiFetch<{ plans: ApiPlan[] }>("/subscription/plans").then(({ data }) => {
      if (data?.plans?.length) setPlans(data.plans);
    });
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="auth-root">
      <div className="auth-blobs" aria-hidden="true">
        <div className="auth-blob auth-blob-1" />
        <div className="auth-blob auth-blob-2" />
        <div className="auth-blob auth-blob-3" />
        <div className="auth-blob auth-blob-4" />
      </div>

      <svg className="auth-noise" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <filter id="landing-noise-f">
          <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#landing-noise-f)" />
      </svg>

      <div className="relative z-10 overflow-y-auto h-[100dvh] custom-scrollbar scroll-smooth">
        <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/60 dark:bg-gray-950/60 border-b border-white/20 dark:border-white/5">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-xl font-display font-black text-primary">YAGUAR</span>
              <span className="text-xl font-display font-light text-foreground">ESTUDIO</span>
            </div>
            <div className="hidden sm:flex items-center gap-6 text-sm font-medium text-muted-foreground">
              <button onClick={() => scrollTo("herramientas")} className="hover:text-foreground transition-colors">Herramientas</button>
              <button onClick={() => scrollTo("planes")} className="hover:text-foreground transition-colors">Planes</button>
              <button onClick={() => scrollTo("nosotros")} className="hover:text-foreground transition-colors">Nosotros</button>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setLocation("/auth")}
                className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
              >
                Iniciar Sesión
              </button>
              <button
                onClick={() => setLocation("/auth?tab=register")}
                className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
              >
                Crear Cuenta
              </button>
            </div>
          </div>
        </nav>

        <section className="relative min-h-[calc(100dvh-4rem)] flex items-center justify-center px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center py-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold mb-6">
                <Sparkles className="w-3.5 h-3.5" />
                Herramienta de DTF Textil para potenciar tu negocio
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl md:text-6xl font-display font-black text-foreground leading-[1.1] mb-6"
            >
              Todas las herramientas para tu negocio{" "}
              <span className="text-primary">DTF y textil</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
            >
              Cotizá, generá mockups, remové fondos y aprendé sobre personalización textil.
              Todo en una sola plataforma, potenciada por{" "}
              <span className="font-black text-foreground">YAGUAR</span> ESTUDIO.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <button
                onClick={() => setLocation("/auth?tab=register")}
                className="px-8 py-3.5 rounded-2xl bg-primary text-primary-foreground text-base font-bold hover:opacity-90 transition-opacity shadow-xl shadow-primary/25 flex items-center gap-2"
              >
                Comenzar gratis
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => scrollTo("herramientas")}
                className="px-8 py-3.5 rounded-2xl bg-white/60 dark:bg-white/5 border border-border text-foreground text-base font-bold hover:bg-white/80 dark:hover:bg-white/10 transition-all flex items-center gap-2"
              >
                Ver herramientas
                <ChevronDown className="w-5 h-5" />
              </button>
            </motion.div>
          </div>
        </section>

        <section id="herramientas" className="py-20 sm:py-28 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              className="text-center mb-14"
            >
              <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold mb-4">
                Herramientas
              </motion.div>
              <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-4xl font-display font-black text-foreground mb-4">
                Todo lo que necesitás en un solo lugar
              </motion.h2>
              <motion.p variants={fadeUp} custom={2} className="text-muted-foreground max-w-xl mx-auto">
                Herramientas profesionales diseñadas para emprendedores y negocios de personalización textil.
              </motion.p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {TOOLS.map((tool, i) => {
                const Icon = tool.icon;
                return (
                  <motion.div
                    key={tool.title}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-50px" }}
                    variants={fadeUp}
                    custom={i}
                    className="group relative glass-panel rounded-3xl p-6 sm:p-8 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
                  >
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${tool.color} flex items-center justify-center mb-5 shadow-lg`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-display font-bold text-foreground mb-2">{tool.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-5">{tool.description}</p>
                    <button
                      onClick={() => tool.ready ? setLocation("/auth") : undefined}
                      disabled={!tool.ready}
                      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        tool.ready
                          ? "bg-primary text-primary-foreground hover:opacity-90 shadow-md shadow-primary/15"
                          : "bg-secondary text-muted-foreground cursor-default"
                      }`}
                    >
                      {tool.cta}
                      {tool.ready && <ArrowRight className="w-4 h-4" />}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="planes" className="py-20 sm:py-28 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              className="text-center mb-14"
            >
              <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold mb-4">
                <Crown className="w-3.5 h-3.5" />
                Planes
              </motion.div>
              <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-4xl font-display font-black text-foreground mb-4">
                Elegí el plan que necesitás
              </motion.h2>
              <motion.p variants={fadeUp} custom={2} className="text-muted-foreground max-w-xl mx-auto">
                Empezá gratis y escalá cuando tu negocio lo necesite. Sin compromisos.
              </motion.p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {plans.map((plan, i) => {
                const isPremium = plan.slug === "premium";
                const isStandard = plan.slug === "standard";
                const colors: Record<string, string> = {
                  free: "from-gray-400 to-gray-500",
                  standard: "from-blue-500 to-indigo-600",
                  premium: "from-orange-500 to-red-500",
                };
                const icons: Record<string, React.ReactNode> = {
                  free: <Check className="w-6 h-6 text-white" />,
                  standard: <Zap className="w-6 h-6 text-white" />,
                  premium: <Crown className="w-6 h-6 text-white" />,
                };

                return (
                  <motion.div
                    key={plan.slug}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-50px" }}
                    variants={fadeUp}
                    custom={i}
                    className={`relative glass-panel rounded-3xl p-6 sm:p-8 flex flex-col ${
                      isPremium ? "ring-2 ring-primary shadow-xl shadow-primary/10" : ""
                    }`}
                  >
                    {isStandard && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-md">
                        Popular
                      </div>
                    )}

                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${colors[plan.slug] || "from-gray-400 to-gray-500"} flex items-center justify-center mb-4 shadow-lg`}>
                      {icons[plan.slug] || <Check className="w-6 h-6 text-white" />}
                    </div>

                    <h3 className="text-lg font-display font-bold text-foreground">{plan.name}</h3>
                    <div className="mt-2 mb-5">
                      <span className="text-3xl font-display font-black text-foreground">
                        {plan.price === 0 ? "Gratis" : `$${plan.price.toLocaleString("es-CL")}`}
                      </span>
                      {plan.price > 0 && <span className="text-sm text-muted-foreground font-medium">/mes</span>}
                    </div>

                    <ul className="space-y-3 mb-8 flex-1">
                      <li className="flex items-center gap-2.5 text-sm text-foreground">
                        <Check className="w-4 h-4 text-primary shrink-0" />
                        {formatLimit(plan.limits.dtfQuotes, "Cotizaciones")}
                      </li>
                      <li className="flex items-center gap-2.5 text-sm text-foreground">
                        <Check className="w-4 h-4 text-primary shrink-0" />
                        {formatLimit(plan.limits.mockupPngs, "Mockups PNG")}
                      </li>
                      <li className="flex items-center gap-2.5 text-sm text-foreground">
                        <Check className="w-4 h-4 text-primary shrink-0" />
                        {formatLimit(plan.limits.pdfExports, "Fichas PDF")}
                      </li>
                    </ul>

                    <button
                      onClick={() => setLocation("/auth?tab=register")}
                      className={`w-full py-3 rounded-xl text-sm font-bold transition-all ${
                        isPremium
                          ? "bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/20"
                          : isStandard
                            ? "bg-primary text-primary-foreground hover:opacity-90 shadow-md"
                            : "bg-secondary hover:bg-secondary/80 text-foreground"
                      }`}
                    >
                      {plan.price === 0 ? "Comenzar gratis" : "Elegir plan"}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="nosotros" className="py-20 sm:py-28 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              className="glass-panel rounded-3xl p-8 sm:p-12 text-center"
            >
              <motion.div variants={fadeUp} custom={0}>
                <p className="text-2xl sm:text-3xl font-display font-black text-primary mb-1">
                  YAGUAR <span className="font-light text-foreground">ESTUDIO</span>
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  Soluciones digitales para la industria textil
                </p>
              </motion.div>

              <motion.div variants={fadeUp} custom={1} className="text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-8 space-y-4 text-left sm:text-center">
                <p>
                  En Yaguar Estudio entendemos que una prenda no es solo tela y tinta; es en lo primero que pensás en ponerte antes de salir de tu casa, para ir al trabajo, a una salida, un concierto, o para tu marca. Somos un estudio dedicado al diseño, la personalización textil y la producción de merchandising textil de alta calidad.
                </p>
                <p>
                  <span className="font-bold text-foreground">¿Qué nos diferencia?</span> A diferencia de una imprenta tradicional, nosotros somos diseñadores. No solo ejecutamos un pedido, sino que entendemos tu visión estética y potenciamos esa idea, con diseños de alta calidad.
                </p>
                <p>
                  <span className="font-bold text-foreground">Experiencia que respalda tu confianza.</span> Sabemos trabajar bajo presión y con los estándares más altos. Hemos sido elegidos para gestionar el merchandising oficial de eventos de talla mundial, como la Red Bull Batalla de Gallos Internacional, y producciones exclusivas para eventos en el Hipódromo de Palermo. Esa misma calidad y logística que aplicamos para las grandes marcas, la volcamos en tu proyecto, sea una línea de ropa, uniformes corporativos o merch para tu comunidad o evento.
                </p>
                <p>
                  <span className="font-bold text-foreground">Nuestra Misión.</span> Potenciar la imagen de empresas, negocios y eventos a través de productos textiles que la gente realmente quiera usar en su día a día.
                </p>
                <p className="text-foreground font-bold text-base sm:text-center">
                  ¿Tenés una idea? Hagámosla realidad.
                </p>
              </motion.div>

              <motion.div variants={fadeUp} custom={2} className="flex items-center justify-center gap-4">
                <a
                  href="https://www.instagram.com/yaguar.estudio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-bold hover:opacity-90 transition-opacity shadow-md"
                >
                  <Instagram className="w-4 h-4" />
                  Instagram
                </a>
                <a
                  href="https://wa.me/1122811911"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-bold hover:opacity-90 transition-opacity shadow-md"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </a>
              </motion.div>
            </motion.div>
          </div>
        </section>

        <footer className="border-t border-white/10 dark:border-white/5 py-8 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-1">
              <span className="text-sm font-display font-black text-primary">YAGUAR</span>
              <span className="text-sm font-display font-light text-foreground">ESTUDIO</span>
            </div>
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} YAGUAR ESTUDIO. Todos los derechos reservados.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
