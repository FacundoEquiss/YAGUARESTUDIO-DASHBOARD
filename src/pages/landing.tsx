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
  ChevronDown,
  Sparkles,
  ShieldCheck,
  Gift,
  WifiOff,
  Send,
  Instagram,
  MessageCircle,
  Check,
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
      <section id="top" className="relative overflow-hidden px-4 sm:px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="max-w-5xl mx-auto text-center">
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
            className="text-4xl sm:text-6xl md:text-7xl font-display font-black text-foreground leading-[1.05] mb-6"
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
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-9 leading-relaxed"
          >
            Cotizá tus DTF, generá mockups, organizá clientes, ventas, stock y finanzas.
            Todo en una sola app, <span className="font-bold text-foreground">100% gratis</span>, hecha
            para emprendedores como vos.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <button
              onClick={primaryCta}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-primary text-primary-foreground text-base font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/30 flex items-center justify-center gap-2"
            >
              {primaryLabel}
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => document.getElementById("herramientas")?.scrollIntoView({ behavior: "smooth" })}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-white/5 border border-border text-foreground text-base font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
              Ver herramientas
              <ChevronDown className="w-5 h-5" />
            </button>
          </motion.div>

          {/* Benefit pills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3"
          >
            {BENEFITS.map((b) => (
              <div key={b.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                <b.icon className="w-4 h-4 text-primary" />
                {b.label}
              </div>
            ))}
          </motion.div>
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
