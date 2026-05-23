import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Calculator,
  ChevronDown,
  ExternalLink,
  Image,
  Instagram,
  MessageCircle,
  Scissors,
  Sparkles,
} from "lucide-react";

const TOOLS = [
  {
    icon: Calculator,
    title: "Cotizador DTF",
    description:
      "Calcula el costo exacto de tus transfers DTF con precios por metro, margenes y descuentos por cantidad. Resultado al instante.",
    cta: "Probar ahora",
    ready: true,
    href: "/app",
    color: "from-orange-500 to-amber-500",
  },
  {
    icon: Image,
    title: "Generador de Mockups",
    description:
      "Visualiza tus disenos en prendas reales. Subi tu arte, elegi la prenda y descarga un mockup listo para presentar al cliente.",
    cta: "Proximamente",
    ready: false,
    href: "/mockups",
    color: "from-blue-500 to-indigo-500",
  },
  {
    icon: Scissors,
    title: "Extractor de Fondos",
    description:
      "Remove fondos de imagenes en segundos con inteligencia artificial. Ideal para preparar artes para DTF o catalogos.",
    cta: "Proximamente",
    ready: false,
    href: "/app",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: BookOpen,
    title: "Blog Educativo",
    description:
      "Aprende todo sobre DTF, sublimacion, vinilo y mas. Guias, tutoriales y consejos para hacer crecer tu negocio textil.",
    cta: "Proximamente",
    ready: false,
    href: "/app",
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

export function LandingPage() {
  const [, setLocation] = useLocation();

  return (
    <>
      <section id="top" className="relative min-h-[calc(100dvh-3.5rem)] flex items-center justify-center px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center py-20">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              Herramientas gratuitas para emprendedores textiles
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl font-display font-black text-foreground leading-[1.1] mb-6"
          >
            Todo lo que tu negocio{" "}
            <span className="text-primary">DTF y textil</span> necesita
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Cotiza pedidos, genera mockups, organiza tus clientes y ventas. 100% gratis, privado para tu emprendimiento,
            potenciado por <span className="font-black text-foreground">YAGUAR</span> ESTUDIO.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <button
              onClick={() => document.getElementById("herramientas")?.scrollIntoView({ behavior: "smooth" })}
              className="px-8 py-3.5 rounded-2xl bg-white/5 border border-border text-foreground text-base font-bold hover:bg-white/10 transition-all flex items-center gap-2"
            >
              Ver herramientas
              <ChevronDown className="w-5 h-5" />
            </button>

            <button
              onClick={() => setLocation("/app")}
              className="px-8 py-3.5 rounded-2xl bg-primary text-primary-foreground text-base font-bold hover:opacity-90 transition-all shadow-md shadow-primary/25 flex items-center gap-2"
            >
              Probar el cotizador
              <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      </section>

      <section id="herramientas" className="py-20 sm:py-28 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} className="text-center mb-14">
            <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold mb-4">
              Herramientas
            </motion.div>
            <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-4xl font-display font-black text-foreground mb-4">
              Todo lo que necesitas en un solo lugar
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="text-muted-foreground max-w-xl mx-auto">
              Herramientas profesionales y gratuitas, disenadas para emprendedores y negocios de personalizacion textil.
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
                    onClick={() => (tool.ready ? setLocation(tool.href) : undefined)}
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
              <p className="text-sm text-muted-foreground mb-6">Soluciones digitales para la industria textil</p>
            </motion.div>

            <motion.div variants={fadeUp} custom={1} className="text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-8 space-y-4 text-left sm:text-center">
              <p>
                En Yaguar Estudio entendemos que una prenda no es solo tela y tinta; es en lo primero que pensas en
                ponerte antes de salir de tu casa, para ir al trabajo, a una salida, un concierto, o para tu marca.
                Somos un estudio dedicado al diseno, la personalizacion textil y la produccion de merchandising textil
                de alta calidad.
              </p>
              <p>
                <span className="font-bold text-foreground">Que nos diferencia?</span> A diferencia de una imprenta
                tradicional, nosotros somos disenadores. No solo ejecutamos un pedido, sino que entendemos tu vision
                estetica y potenciamos esa idea, con disenos de alta calidad.
              </p>
              <p>
                <span className="font-bold text-foreground">Nuestra Mision.</span> Potenciar la imagen de empresas,
                negocios y eventos a traves de productos textiles que la gente realmente quiera usar en su dia a dia.
              </p>
              <p className="text-foreground font-bold text-base sm:text-center">Tenes una idea? Hagamosla realidad.</p>
            </motion.div>

            <motion.div variants={fadeUp} custom={2} className="flex flex-wrap items-center justify-center gap-3">
              <a
                href="https://www.yaguarestudio.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity shadow-md"
              >
                <ExternalLink className="w-4 h-4" />
                Tienda Online
              </a>
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
    </>
  );
}
