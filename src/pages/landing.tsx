import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Calculator,
  Shirt,
  Scissors,
  Users,
  BarChart3,
  Package2,
  Sparkles,
  ShieldCheck,
  Gift,
  WifiOff,
  Send,
  Instagram,
  MessageCircle,
  Check,
  X,
  TrendingUp,
  ClipboardList,
  FileSpreadsheet,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const TELEGRAM_LINK = "https://t.me/+IhEEsOPYZ-MzZDYx";
const INSTAGRAM_LINK = "https://www.instagram.com/yaguar.estudio";
const WHATSAPP_LINK = "https://wa.me/1122811911";

const TOOLS = [
  {
    icon: Calculator,
    title: "Cotizador DTF",
    description:
      "Calculá el precio exacto de tus transfers en segundos: metros de rollo, márgenes, bajadas de plancha y precio por prenda.",
    color: "from-orange-500 to-amber-500",
  },
  {
    icon: Shirt,
    title: "Generador de Mockups",
    description:
      "Subí tu arte, ubicalo sobre remeras o buzos y descargá un mockup listo para presentarle al cliente.",
    color: "from-blue-500 to-indigo-500",
  },
  {
    icon: Scissors,
    title: "Quita Fondos con IA",
    description:
      "Remové el fondo de cualquier logo o imagen al instante. Funciona en tu dispositivo, sin subir nada.",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: Users,
    title: "Clientes y Pedidos",
    description:
      "Tu cartera de clientes y el seguimiento de cada venta: estados, cobros y fechas de entrega.",
    color: "from-violet-500 to-purple-500",
  },
  {
    icon: Package2,
    title: "Stock y Proveedores",
    description:
      "Controlá tu inventario con alertas de stock bajo y llevá el registro de a quién le comprás.",
    color: "from-pink-500 to-rose-500",
  },
  {
    icon: BarChart3,
    title: "Finanzas y Reportes",
    description:
      "Ingresos, gastos, cuentas y reportes con punto de equilibrio. Mirá crecer tu negocio mes a mes.",
    color: "from-cyan-500 to-sky-500",
  },
];

const BENEFITS = [
  { icon: Gift, label: "100% gratis" },
  { icon: ShieldCheck, label: "Tus datos, privados" },
  { icon: Check, label: "Sin tarjeta" },
  { icon: WifiOff, label: "Funciona sin internet" },
];

const FAQS = [
  {
    q: "¿De verdad es gratis?",
    a: "Sí. La app es 100% gratuita para emprendedores textiles. No hay planes pagos, ni límites de uso, ni tarjeta de crédito.",
  },
  {
    q: "¿Mis datos son privados?",
    a: "Totalmente. Cada cuenta ve únicamente su propia información: clientes, pedidos, finanzas y configuración. Nadie más tiene acceso a tus datos.",
  },
  {
    q: "¿Necesito instalar algo?",
    a: "No. Funciona desde el navegador en la compu o el celular. Además podés 'instalarla' como app en tu teléfono para abrirla con un toque.",
  },
  {
    q: "¿Qué es DTF?",
    a: "DTF (Direct to Film) es una técnica de estampado textil. El cotizador calcula el costo de tus transfers según el material, los márgenes y la cantidad de prendas.",
  },
  {
    q: "¿Puedo usarla en el celular?",
    a: "Sí, está pensada para funcionar bien en celular, tablet y computadora. Tus datos se sincronizan entre todos tus dispositivos.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.5, ease: "easeOut" as const },
  }),
};

export function LandingPage() {
  const [, setLocation] = useLocation();
  const { currentUser } = useAuth();

  const primaryCta = () => setLocation(currentUser ? "/dashboard" : "/auth");
  const primaryLabel = currentUser ? "Ir a mi panel" : "Crear cuenta gratis";

  return (
    <>
      {/* HERO */}
      <section id="top" className="relative overflow-hidden px-4 sm:px-6 pt-14 pb-16 sm:pt-20 sm:pb-24">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
          {/* Left: copy */}
          <div className="text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold mb-6 border border-primary/20"
            >
              <Sparkles className="w-3.5 h-3.5" />
              La herramienta de gestión para tu negocio textil
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-6xl font-display font-black text-foreground leading-[1.05] mb-6"
            >
              Tu negocio textil,
              <br />
              <span className="bg-gradient-to-r from-primary to-amber-400 bg-clip-text text-transparent">
                ordenado y rentable
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed"
            >
              Cotizá tus DTF, generá mockups, organizá clientes, ventas, stock y finanzas.
              Todo en una sola app, <span className="font-bold text-foreground">100% gratis</span>.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center lg:justify-start justify-center gap-3"
            >
              <button
                onClick={primaryCta}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-primary text-primary-foreground text-base font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/30 flex items-center justify-center gap-2"
              >
                {primaryLabel}
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => setLocation("/app")}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-white/5 border border-border text-foreground text-base font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2"
              >
                <Calculator className="w-5 h-5" />
                Probar el cotizador
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-8 flex flex-wrap items-center lg:justify-start justify-center gap-x-5 gap-y-2"
            >
              {BENEFITS.map((b) => (
                <div key={b.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <b.icon className="w-4 h-4 text-primary" />
                  {b.label}
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right: app preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25, ease: "easeOut" }}
            className="relative"
          >
            <div className="absolute -inset-6 bg-primary/20 blur-3xl rounded-full opacity-40" aria-hidden="true" />
            <AppPreview />
          </motion.div>
        </div>
      </section>

      {/* BEFORE / AFTER */}
      <section className="px-4 sm:px-6 py-12 sm:py-16">
        <div className="max-w-5xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            className="text-2xl sm:text-3xl font-display font-black text-center mb-10"
          >
            Dejá atrás el desorden
          </motion.h2>
          <div className="grid md:grid-cols-2 gap-5">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5 }}
              className="rounded-3xl border border-border bg-white/[0.02] p-6"
            >
              <div className="flex items-center gap-2 text-red-400 font-bold mb-4">
                <FileSpreadsheet className="w-5 h-5" /> Antes
              </div>
              <ul className="space-y-3 text-sm text-muted-foreground">
                {[
                  "Cálculos de precios a mano o en Excel",
                  "Pedidos anotados en cuadernos y capturas de WhatsApp",
                  "Sin saber cuánto ganás realmente cada mes",
                  "Stock en la cabeza (y faltantes a último momento)",
                ].map((t) => (
                  <li key={t} className="flex gap-2.5">
                    <X className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    {t}
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5 }}
              className="rounded-3xl border border-primary/30 bg-primary/5 p-6"
            >
              <div className="flex items-center gap-2 text-primary font-bold mb-4">
                <Sparkles className="w-5 h-5" /> Con Yaguar Estudio
              </div>
              <ul className="space-y-3 text-sm text-foreground/90">
                {[
                  "Precio exacto de cada cotización en segundos",
                  "Pedidos, clientes y entregas en un solo panel",
                  "Reportes claros: cuánto entra, cuánto sale, tu equilibrio",
                  "Alertas de stock bajo antes de quedarte sin material",
                ].map((t) => (
                  <li key={t} className="flex gap-2.5">
                    <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    {t}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* TOOLS GRID */}
      <section id="herramientas" className="px-4 sm:px-6 py-16 sm:py-24">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="text-center mb-14"
          >
            <motion.h2 custom={0} variants={fadeUp} className="text-3xl sm:text-4xl font-display font-black mb-4">
              Todo lo que necesitás, en un solo lugar
            </motion.h2>
            <motion.p custom={1} variants={fadeUp} className="text-muted-foreground max-w-2xl mx-auto">
              Dejá las planillas y los cálculos a mano. Estas herramientas te ahorran tiempo y te ayudan
              a cobrar lo justo.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {TOOLS.map((tool, i) => (
              <motion.div
                key={tool.title}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                className="group glass-panel rounded-3xl p-6 border border-border hover:border-primary/30 transition-all"
              >
                <div
                  className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${tool.color} flex items-center justify-center mb-4 shadow-lg`}
                >
                  <tool.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold mb-2">{tool.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{tool.description}</p>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-12">
            <button
              onClick={primaryCta}
              className="px-8 py-3.5 rounded-2xl bg-primary text-primary-foreground text-base font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/30 inline-flex items-center gap-2"
            >
              {primaryLabel}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* TELEGRAM COMMUNITY */}
      <section className="px-4 sm:px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden border border-border"
          style={{
            background:
              "radial-gradient(circle at 30% 20%, rgba(34,158,217,0.18), transparent 60%), rgba(255,255,255,0.03)",
          }}
        >
          <div className="w-14 h-14 rounded-2xl bg-[#229ED9]/15 flex items-center justify-center mx-auto mb-5">
            <Send className="w-7 h-7 text-[#229ED9]" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-black mb-3">Sumate a la comunidad</h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-7">
            Compartí dudas, tips de estampado y hacé crecer tu emprendimiento junto a otros
            emprendedores textiles en nuestro grupo de Telegram.
          </p>
          <a
            href={TELEGRAM_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-7 py-3 rounded-2xl bg-[#229ED9] text-white font-bold hover:opacity-90 transition-all shadow-lg shadow-[#229ED9]/30"
          >
            <Send className="w-5 h-5" />
            Unirme al grupo
          </a>
        </motion.div>
      </section>

      {/* FAQ */}
      <section className="px-4 sm:px-6 py-16 sm:py-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-display font-black text-center mb-10">
            Preguntas frecuentes
          </h2>
          <Accordion type="single" collapsible className="w-full space-y-3">
            {FAQS.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="glass-panel border border-border rounded-2xl px-5"
              >
                <AccordionTrigger className="text-left font-bold hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="px-4 sm:px-6 py-16 sm:py-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto rounded-3xl p-10 sm:p-16 text-center relative overflow-hidden border border-primary/20"
          style={{
            background:
              "radial-gradient(circle at 50% 0%, rgba(249,115,22,0.20), transparent 65%), rgba(255,255,255,0.02)",
          }}
        >
          <h2 className="text-3xl sm:text-5xl font-display font-black mb-4">Empezá hoy, es gratis</h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8 text-lg">
            Creá tu cuenta en menos de un minuto y empezá a ordenar tu negocio textil.
          </p>
          <button
            onClick={primaryCta}
            className="px-8 py-4 rounded-2xl bg-primary text-primary-foreground text-base font-bold hover:opacity-90 transition-all shadow-xl shadow-primary/30 inline-flex items-center gap-2"
          >
            {primaryLabel}
            <ArrowRight className="w-5 h-5" />
          </button>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border px-4 sm:px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-1">
              <span className="text-xl font-display font-black text-primary">YAGUAR</span>
              <span className="text-xl font-display font-light text-foreground">ESTUDIO</span>
            </div>

            <div className="flex items-center gap-3">
              <a
                href={INSTAGRAM_LINK}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-10 h-10 rounded-xl bg-white/5 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="w-10 h-10 rounded-xl bg-white/5 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
              >
                <MessageCircle className="w-5 h-5" />
              </a>
              <a
                href={TELEGRAM_LINK}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Telegram"
                className="w-10 h-10 rounded-xl bg-white/5 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
              >
                <Send className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-border/50 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Yaguar Estudio. Hecho para emprendedores textiles.
          </div>
        </div>
      </footer>
    </>
  );
}

/** Stylized illustration of the dashboard (no real screenshot needed). */
function AppPreview() {
  const sidebarItems = [
    { icon: BarChart3, active: true },
    { icon: ClipboardList, active: false },
    { icon: Users, active: false },
    { icon: Package2, active: false },
    { icon: Calculator, active: false },
  ];
  const bars = [45, 70, 38, 88, 62, 95];

  return (
    <div className="relative rounded-2xl border border-border bg-card/80 backdrop-blur-xl shadow-2xl overflow-hidden">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 h-9 border-b border-border bg-white/[0.03]">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
        </div>
        <div className="flex items-center gap-1 mx-auto text-[10px] text-muted-foreground font-medium">
          <span className="font-display font-black text-primary">YAGUAR</span>
          <span>· Panel</span>
        </div>
      </div>

      <div className="flex">
        {/* Mini sidebar */}
        <div className="hidden sm:flex flex-col gap-2 p-3 border-r border-border bg-white/[0.02]">
          {sidebarItems.map((item, i) => (
            <div
              key={i}
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                item.active ? "bg-primary/20 text-primary" : "text-muted-foreground/50"
              }`}
            >
              <item.icon className="w-4 h-4" />
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 p-4 space-y-3 min-w-0">
          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Ventas", value: "$248k", up: true },
              { label: "Gastos", value: "$96k", up: false },
              { label: "Neto", value: "$152k", up: true },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-white/[0.02] p-2.5">
                <div className="text-[8px] uppercase tracking-wide text-muted-foreground">{s.label}</div>
                <div className="text-sm font-display font-black">{s.value}</div>
                <TrendingUp
                  className={`w-3 h-3 ${s.up ? "text-emerald-400" : "text-red-400 rotate-180"}`}
                />
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="rounded-xl border border-border bg-white/[0.02] p-3">
            <div className="text-[9px] uppercase tracking-wide text-muted-foreground mb-2">
              Ingresos por mes
            </div>
            <div className="flex items-end gap-1.5 h-20">
              {bars.map((h, i) => (
                <div key={i} className="flex-1 flex flex-col justify-end">
                  <div
                    className="w-full rounded-t bg-gradient-to-t from-primary to-amber-400"
                    style={{ height: `${h}%` }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* List rows */}
          <div className="space-y-1.5">
            {[
              { name: "Pedido · Remeras evento", pct: "70%" },
              { name: "Pedido · Buzos logo", pct: "100%" },
            ].map((r) => (
              <div
                key={r.name}
                className="flex items-center gap-2 rounded-lg border border-border bg-white/[0.02] px-2.5 py-2"
              >
                <div className="w-6 h-6 rounded-md bg-primary/15 flex items-center justify-center">
                  <ClipboardList className="w-3 h-3 text-primary" />
                </div>
                <div className="text-[10px] text-foreground/80 truncate flex-1">{r.name}</div>
                <div className="text-[9px] font-bold text-emerald-400">{r.pct}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
