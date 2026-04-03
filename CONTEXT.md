# CONTEXT.md

## 1) Stack Tecnologico

### Monorepo y tooling
- Gestor de paquetes: pnpm (workspace)
- Lenguaje principal: TypeScript
- Runtime backend: Node.js
- Bundling frontend: Vite
- Build backend: esbuild
- ORM y acceso DB: Drizzle ORM + pg
- Validacion de contratos: Zod

### Paquetes principales
- artifacts/api-server
  - Express 5
  - JWT (jsonwebtoken)
  - bcryptjs
  - cookie-parser + cors
  - mercadopago SDK
- artifacts/dtf-quote
  - React 19
  - TanStack React Query
  - Tailwind CSS
  - Radix UI
  - Framer Motion
  - wouter
- lib/db
  - Drizzle ORM
  - Drizzle Kit
  - pg
- lib/api-spec + lib/api-zod + lib/api-client-react
  - Contrato API (OpenAPI)
  - Tipos Zod generados
  - Cliente React generado

### Scripts raiz importantes
- pnpm run typecheck
- pnpm run build
- pnpm run test
- pnpm run db:push
- pnpm --filter @workspace/db run apply-rls

## 2) Esquema de Base de Datos Actualizado (con RLS)

### Modelo de identidad
- users
  - PK: id
  - Campos clave: email (unique), password_hash, role (user/master), perfil de negocio

### Planes y suscripciones
- subscription_plans
  - PK: id
  - Campos clave: slug (unique), limits (jsonb), price, is_active
- user_subscriptions
  - PK: id
  - FK: user_id -> users.id (unique por usuario), plan_id -> subscription_plans.id
  - Campos clave: status, periodos, campos MP

### Configuracion DTF
- dtf_global_settings
  - PK fija: id=1
  - Campos: price_per_meter, roll_width
- user_dtf_settings
  - PK: id
  - FK: user_id -> users.id (unique por usuario)
  - Campos: margenes, umbral de pasadas, recargos, talle, updated_at

### Operacion comercial
- clients
  - PK: id
  - FK: user_id -> users.id
  - Soft delete: deleted_at
- orders
  - PK: id
  - FK: user_id -> users.id
  - FK opcional: client_id -> clients.id
  - Campos monetarios: unit_price, total_price
  - Soft delete: deleted_at
- order_costs
  - PK: id
  - FK: order_id -> orders.id (cascade)
  - Campos: title, amount

### Finanzas e inventario
- financial_accounts
  - PK: id
  - FK: user_id -> users.id
  - Soft delete: deleted_at
- transactions
  - PK: id
  - FK: user_id -> users.id
  - FK opcionales: client_id, supplier_id, order_id, financial_account_id
  - Soft delete: deleted_at
- suppliers
  - PK: id
  - FK: user_id -> users.id
  - Soft delete: deleted_at
- products
  - PK: id
  - FK: user_id -> users.id
  - FK opcional: supplier_id -> suppliers.id
  - Soft delete: deleted_at
- product_stock_movements
  - PK: id
  - FK: user_id -> users.id
  - FK: product_id -> products.id
  - FK opcionales: supplier_id, order_id

### Uso y feedback
- usage_counters
  - PK: id
  - FK: user_id -> users.id
  - Unique compuesto: (user_id, counter_type)
- usage_events
  - PK: id
  - FK: user_id -> users.id
- feedbacks
  - PK: id
  - FK: user_id -> users.id

### RLS implementado
RLS se aplica con script idempotente en lib/db/scripts/rls-policies.sql y se ejecuta con:
- pnpm --filter @workspace/db run apply-rls

Funciones de soporte creadas en schema app:
- app.current_user_id()
- app.current_user_role()
- app.is_master()
- app.is_tenant_owner(owner_user_id integer)

Tablas con RLS habilitado + FORCE RLS:
- clients
- orders
- order_costs
- suppliers
- transactions
- financial_accounts
- products
- product_stock_movements
- user_dtf_settings
- user_subscriptions
- usage_counters
- usage_events
- feedbacks

Politicas aplicadas:
- Para tablas con owner directo por user_id:
  - SELECT: app.is_tenant_owner(user_id)
  - INSERT: WITH CHECK app.is_tenant_owner(user_id)
  - UPDATE: USING + WITH CHECK app.is_tenant_owner(user_id)
  - DELETE: app.is_tenant_owner(user_id)
- Para order_costs (owner indirecto por orders.user_id):
  - SELECT/INSERT/UPDATE/DELETE con EXISTS sobre orders y app.is_tenant_owner(o.user_id)

Nota operacional critica:
- Las funciones RLS usan current_setting('app.user_id') y current_setting('app.user_role').
- Para enforcement estructural full DB-level, el backend debe setear esas variables por request/transaccion antes de consultas mutables/sensibles.

## 3) Arquitectura de Permisos

### Capa aplicacion (API)
- Autenticacion:
  - JWT en cookie httpOnly o Authorization Bearer
  - Middleware requireAuth valida token y carga req.user
- Autorizacion por rol:
  - role=master habilita operaciones administrativas globales
  - role=user opera sobre sus propios recursos
- Guardas por plan:
  - requirePlan(feature) valida suscripcion activa y limites

### Capa datos (DB)
- Regla de ownership multi-tenant:
  - user_id es el ownership key transversal de tablas de negocio
- RLS + FORCE RLS:
  - impide lecturas/escrituras cruzadas entre tenants cuando app.user_id/app.user_role estan correctamente seteados
- Politica especial order_costs:
  - deriva ownership desde su order padre

### Pricing autoritativo
- Endpoint backend: POST /api/pricing/dtf-quote
- Libreria backend: artifacts/api-server/src/lib/dtf-pricing.ts
- Persistencia de pedidos:
  - En create/update de orders, si llega pricingInput, backend recalcula precio real y persiste unit_price/total_price + order_costs derivados
- Frontend:
  - usa /pricing/dtf-quote para estimacion/preview, pero el precio persistido final lo decide backend

## 4) Mapa de Modulos

### Backend API (artifacts/api-server/src)
- app.ts, index.ts
  - bootstrap, CORS, parsing, health, router principal
- middleware/
  - auth.ts: requireAuth, sign/verify token
  - plan-guard.ts: validacion de limites por plan
- routes/
  - auth.ts
  - health.ts
  - settings.ts
  - subscription.ts
  - orders.ts
  - clients.ts
  - suppliers.ts
  - products.ts
  - financial-accounts.ts
  - transactions.ts
  - pricing.ts
  - feedback.ts
  - webhooks.ts
- lib/
  - dtf-pricing.ts (motor autoritativo de precios)
  - subscription-billing.ts
  - mercadopago.ts
  - mercadopago-webhook.ts

### Frontend (artifacts/dtf-quote/src)
- pages/
  - dashboard, calculator, orders, clients, suppliers, products, finance, reports, settings, auth, profile, etc.
- hooks/
  - use-auth, use-orders, use-products, use-suppliers, use-clients, use-transactions, use-financial-accounts, use-usage
- lib/
  - api.ts (cliente base)
  - dtf-pricing-api.ts (consumo del pricing autoritativo)
  - skyline.ts, storage.ts, routing.ts
- components/
  - layout y shell de aplicacion
  - guardas de plan
  - visualizadores/controles UI

### Librerias compartidas
- lib/db
  - schema drizzle + conexion pool + scripts RLS
- lib/api-spec
  - OpenAPI contract
- lib/api-zod
  - schemas zod generados
- lib/api-client-react
  - cliente tipado para frontend

### Scripts operativos
- scripts/src
  - smoke post deploy
  - reset/seed demo

## 5) Reglas Estrictas del Proyecto (obligatorias para cambios futuros)

1. Nunca confiar en precios enviados por frontend.
- Todo precio final se calcula en backend y se persiste desde backend.

2. Nunca permitir acceso cruzado entre usuarios.
- Toda consulta de negocio debe filtrar por user_id en API y cumplir RLS en DB.

3. No desactivar ni debilitar RLS.
- Mantener ENABLE + FORCE RLS en tablas multi-tenant.
- Cualquier tabla nueva con datos de usuario debe salir con RLS desde el dia 1.

4. Mantener inyeccion de contexto de seguridad en DB.
- En operaciones sensibles, setear app.user_id y app.user_role por request/transaccion para enforcement estructural.

5. No exponer secretos en codigo.
- Secretos solo en variables de entorno.
- No commitear valores reales de JWT, DB o Mercado Pago.

6. Validar ownership en relaciones.
- Si se referencia entidad de otro modulo (ej: clientId en orders), validar que pertenezca al mismo user_id antes de persistir.

7. Mantener soft delete donde ya existe.
- No eliminar fisicamente entidades que usan deleted_at salvo tareas de mantenimiento controladas.

8. No romper contratos compartidos sin versionado.
- Si cambia API, regenerar y validar api-spec, api-zod y api-client-react.

9. Cualquier cambio en permisos requiere doble capa.
- Capa API (middleware/validaciones) + capa DB (RLS/policies).

10. Antes de mergear cambios criticos, ejecutar minimo:
- pnpm run typecheck
- pnpm --filter @workspace/api-server run typecheck
- pnpm --filter @workspace/dtf-quote run typecheck
- pnpm --filter @workspace/db run apply-rls (si hubo cambios de politicas)

11. Cualquier nueva tabla de negocio debe seguir estandar de ownership.
- Columna user_id not null + FK a users.id + indices apropiados + politicas RLS CRUD completas.

12. Mantener trazabilidad del flujo comercial.
- Cotizacion -> Pedido -> Cobro/Transaccion -> Cuenta financiera -> Reportes, sin duplicar fuentes de verdad.
