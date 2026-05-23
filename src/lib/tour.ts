import { driver } from "driver.js";
import "driver.js/dist/driver.css";

const TOUR_SEEN_KEY = "yaguar:tour-seen";

export function hasSeenTour(): boolean {
  try {
    return localStorage.getItem(TOUR_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function markTourSeen(): void {
  try {
    localStorage.setItem(TOUR_SEEN_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function startAppTour(): void {
  const d = driver({
    showProgress: true,
    nextBtnText: "Siguiente →",
    prevBtnText: "← Atrás",
    doneBtnText: "¡Entendido!",
    progressText: "{{current}} de {{total}}",
    overlayColor: "rgba(0,0,0,0.75)",
    steps: [
      {
        popover: {
          title: "¡Bienvenido a Yaguar Estudio! 👋",
          description:
            "Te muestro en menos de un minuto cómo moverte por tu panel. Podés salir cuando quieras y repetir este tour más tarde.",
        },
      },
      {
        element: '[data-tour="sidebar"]',
        popover: {
          title: "Tu menú principal",
          description:
            "Desde acá entrás a todo: pedidos, clientes, proveedores, stock, finanzas, reportes y las herramientas como el cotizador y los mockups.",
          side: "right",
          align: "start",
        },
      },
      {
        element: '[data-tour="dashboard-stats"]',
        popover: {
          title: "Cómo va tu mes",
          description:
            "Un vistazo rápido a lo que entró, lo que gastaste, tu balance y lo que tenés por cobrar.",
          side: "bottom",
        },
      },
      {
        element: '[data-tour="dashboard-shortcuts"]',
        popover: {
          title: "Atajos rápidos",
          description:
            "Accesos directos a lo que más vas a usar: hacer una cotización, cargar un pedido, registrar un ingreso o sumar un cliente.",
          side: "bottom",
        },
      },
      {
        element: '[data-tour="header-actions"]',
        popover: {
          title: "Tema, color y tu cuenta",
          description:
            "Acá cambiás entre claro y oscuro, y desde tu inicial entrás a tu perfil. El color de tu marca y todo lo demás se ajusta en Configuración.",
          side: "bottom",
          align: "end",
        },
      },
      {
        popover: {
          title: "¿Necesitás ayuda? Buscá el (?) ℹ️",
          description:
            "En cada sección vas a ver signos de pregunta. Tocalos para entender qué hace cada cosa. Y podés volver a ver este tour cuando quieras desde el botón de ayuda.",
        },
      },
    ],
    onDestroyed: () => {
      markTourSeen();
    },
  });
  d.drive();
}
