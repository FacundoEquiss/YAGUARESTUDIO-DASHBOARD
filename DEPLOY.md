# Vercel Deployment Guide para Monorepo (pnpm)

Para hacer el deploy robusto y libre de ambigüedades de Vercel (Front-end), **evitamos usar `vercel.json` en la raíz.** La mejor manera de orquestar un sub-paquete (Workspace) en Vercel es confiando en su autoconfiguración desde el Dashboard.

### Pasos exactos en el Panel de Vercel:

1. Importa este repositorio desde Github.
2. Abre la pestaña oculta que dice **"Build and Output Settings"** (o "Framework Preset").
3. Configura los campos exactamente de la siguiente manera:

* **Framework Preset:** `Vite`
* **Root Directory:** `artifacts/dtf-quote`
* **Build Command:** `pnpm run build` *(Nota: Déjalo en pnpm run build normal o sobreescribelo, Vercel ya sabe que está dentro de dtf-quote)*
* **Install Command:** `pnpm install`
* **Output Directory:** `dist`

### Variables de Entorno (Environment Variables) obligatorias en Vercel:
Asegúrate de agregar lo siguiente antes de darle a Deploy:
* `VITE_API_URL` 👉 El link de tu back-end (Por ejemplo: `https://tu-backend-railway.up.railway.app`).

--- 
*Con esta configuración Vite compilará transparentemente hacia el directorio `dist` nativo y Vercel lo subirá sin chocar con configuraciones ambiguas "dist/public".*
