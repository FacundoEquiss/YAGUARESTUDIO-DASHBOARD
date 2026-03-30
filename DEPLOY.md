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
* `VITE_API_URL` 👉 El link de tu back-end (Por ejemplo: `https://tu-backend-railway.up.railway.app`). El frontend ahora tolera ese valor con o sin `/api`.

--- 
*Con esta configuración Vite compilará transparentemente hacia el directorio `dist` nativo y Vercel lo subirá sin chocar con configuraciones ambiguas "dist/public".*

---

# Railway Deployment Guide para Monorepo (pnpm)

Para hacer el deploy robusto en Railway del Backend (`@workspace/api-server`), debemos forzar a Railway a que respete la gestión completa del monorepo, instalando las dependencias nativas del proyecto a nivel raíz.

### Pasos exactos en el Panel de Railway:

1. Importa este repositorio desde Github en un servicio base (Deploy from Repo).
2. Ve a las configuraciones del servicio (**Settings** de la app deployada).
3. Asegúrate que en "Build" y "Deploy" estén configurados *exactamente* de la siguiente manera:

* **Root Directory:** `/` (Déjalo la raíz en blanco o símobolo vacío/raíz del panel). *Bajo ninguna circunstancia pongas artifacts/api-server como root folder, porque Railway no encontrará las librerías `lib/db`!*
* **Build Command:** `pnpm --filter @workspace/api-server run build`
* **Start Command:** `pnpm --filter @workspace/api-server run start`

### Variables de Entorno importantes en Railway:
* `FRONTEND_URL` 👉 Usa uno o varios orígenes exactos separados por comas. Ejemplo:
  `https://tu-produccion.vercel.app,https://tu-preview.vercel.app`
  No uses barras finales.
* `NODE_ENV=production` 👉 Recomendado para mantener el comportamiento esperado de producción en logs y middlewares.
* `DATABASE_URL` 👉 En Railway conviene usar el **Session pooler** de Supabase.
* `JWT_SECRET` 👉 Obligatorio para firmar y validar sesión.
* `MP_ACCESS_TOKEN` 👉 Access token real de Mercado Pago para crear suscripciones.
* `MP_WEBHOOK_SECRET` 👉 Recomendado para validar la firma del webhook cuando cierres la integración.
* `MP_CURRENCY_ID=ARS` 👉 Opcional, pero deja explícita la moneda de cobro.
* `MP_STANDARD_PLAN_ID` 👉 Opcional, pero recomendado. Puede ser el `preapproval_plan_id` o el link completo del plan estándar.
* `MP_PREMIUM_PLAN_ID` 👉 Opcional, pero recomendado. Puede ser el `preapproval_plan_id` o el link completo del plan premium.

### URL pública de Webhook para Mercado Pago:
Si tu backend está expuesto en Railway, configurá en Mercado Pago la URL:

`https://TU-BACKEND.up.railway.app/webhooks/mercadopago`

Esta app ya puede:
* iniciar checkout de suscripciones desde el backend,
* redirigir al usuario al checkout de Mercado Pago,
* y sincronizar el plan local al volver del checkout o al recibir el webhook.

### Notas para pruebas de suscripciones con Mercado Pago:
* No mezcles ambientes. Si el `MP_ACCESS_TOKEN` es de prueba, usá también planes creados por la cuenta vendedora de prueba y comprá con la cuenta compradora de prueba.
* Los `preapproval_plan_id` pueden configurarse directo en Railway con `MP_STANDARD_PLAN_ID` y `MP_PREMIUM_PLAN_ID`, sin tocar código.

### ¿Por qué forzamos el Lockfile / pnpm@10.x.x?
El `package.json` de la raíz ahora incluye el anclaje `"packageManager": "pnpm@10.32.1"`. Nixpacks (el compilador oficial de Railway) usa esto automáticamente para instalar exactamente esa versión de la herramienta y evitar así las disonancias en la versión o el `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH`. Railway compilará con "frozen-lockfile" perfecto usando la misma firma que tus pruebas locales.
