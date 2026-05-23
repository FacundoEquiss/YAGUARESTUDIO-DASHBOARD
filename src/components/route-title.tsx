import { useEffect } from "react";
import { useLocation } from "wouter";

const BASE = "Yaguar Estudio";

const TITLES: Record<string, string> = {
  "/": "Yaguar Estudio · Cotizá, vendé y organizá tu negocio textil",
  "/auth": `Ingresar · ${BASE}`,
  "/dashboard": `Panel · ${BASE}`,
  "/app": `Cotizador DTF · ${BASE}`,
  "/mockups": `Mockups · ${BASE}`,
  "/bg-remover": `Quita Fondos · ${BASE}`,
  "/history": `Historial · ${BASE}`,
  "/clients": `Clientes · ${BASE}`,
  "/suppliers": `Proveedores · ${BASE}`,
  "/orders": `Pedidos · ${BASE}`,
  "/services": `Servicios · ${BASE}`,
  "/products": `Productos y Stock · ${BASE}`,
  "/finance": `Ingresos y Gastos · ${BASE}`,
  "/accounts": `Cuentas Corrientes · ${BASE}`,
  "/reports": `Reportes · ${BASE}`,
  "/settings": `Configuración · ${BASE}`,
  "/profile": `Mi Perfil · ${BASE}`,
  "/support": `Ayuda · ${BASE}`,
};

export function RouteTitle() {
  const [location] = useLocation();
  useEffect(() => {
    document.title = TITLES[location] ?? BASE;
  }, [location]);
  return null;
}
