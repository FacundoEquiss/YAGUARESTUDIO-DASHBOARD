# Release Checklist

Estado actualizado: 2026-03-30

## Listo en esta fase

- [x] `pnpm run typecheck` estable desde la raiz.
- [x] `pnpm run build` verificado de punta a punta.
- [x] GitHub Actions agregado para typecheck y builds.
- [x] Suite minima de regresion agregada para routing, entorno y webhook signature.
- [x] Validacion de entorno del backend al arrancar.
- [x] Advertencias claras para configuracion faltante de Mercado Pago.
- [x] Validacion de firma para webhooks de Mercado Pago.
- [x] Ejemplo de variables para frontend en `artifacts/dtf-quote/.env.example`.
- [x] Rutas publicas y privadas para features "proximamente".
- [x] Pantalla 404 alineada a la UI actual.
- [x] Smoke test post-deploy scriptable desde `pnpm run smoke:deploy`.

## Pendiente antes de despliegue publico

- [ ] Agregar monitoreo de errores del backend (por ejemplo Sentry o equivalente).
- [ ] Verificar variables reales de produccion en Vercel y Railway.
- [ ] Confirmar ids de planes `MP_STANDARD_PLAN_ID` y `MP_PREMIUM_PLAN_ID` reales.
- [ ] Ejecutar el smoke test real contra staging o produccion.

## Variables criticas

Backend:

- `DATABASE_URL`
- `JWT_SECRET`
- `FRONTEND_URL`
- `MP_ACCESS_TOKEN`
- `MP_WEBHOOK_SECRET`
- `MP_STANDARD_PLAN_ID`
- `MP_PREMIUM_PLAN_ID`

Frontend:

- `VITE_API_URL`
- `BASE_PATH` (solo si se despliega bajo subruta)

## Comandos de verificacion

```bash
pnpm run typecheck
pnpm run test
pnpm run build
```
