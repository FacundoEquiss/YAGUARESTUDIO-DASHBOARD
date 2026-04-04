# Agent Handoff: Supabase Auth + Flujo de Negocio

## Objetivo general
Este proyecto tiene dos frentes grandes antes de un despliegue publico serio:

1. Migrar el sistema de cuentas actual a Supabase Auth.
2. Unificar el flujo de negocio real: cotizacion -> cliente -> pedido -> pago -> cuenta financiera -> reportes -> stock.

Este documento esta pensado para que cualquier agente futuro entienda rapido:

- que existe hoy,
- que falta,
- cual es el flujo deseado por el usuario,
- y por donde conviene seguir sin romper la app.

## Estado actual del auth

### Hoy existe
- Auth con Supabase para email y contraseña (sin OAuth social).
- Cookie `token` con access token de Supabase validado en backend.
- Tabla local `users` vinculada con `supabase_auth_id`.
- Suscripciones locales con Mercado Pago.

### Hoy falta
- Recuperacion de contraseña por mail.
- Verificacion de correo.
- Proveedor de identidad serio para salida publica.

### Archivos clave
- `artifacts/api-server/src/routes/auth.ts`
- `lib/db/src/schema/users.ts`
- `artifacts/dtf-quote/src/hooks/use-auth.tsx`

## Plan recomendado para Supabase Auth

### Fase 1
- Crear cliente Supabase en frontend.
- Reemplazar login/registro manual por Supabase Auth.
- Mantener la tabla local `users`, pero agregar un campo `supabase_auth_id`.
- Hacer sincronizacion entre usuario Supabase y perfil local.

### Fase 2
- Activar reset de password.
- Ajustar middleware backend para aceptar el usuario autenticado por Supabase.

### Fase 3
- Migrar usuarios existentes.
- Eliminar dependencia del password local casero.
- Mantener roles locales (`master`, `user`) y suscripciones locales.

### Datos externos que va a tener que tocar el usuario
- Supabase URL.
- Supabase anon key.
- Proveedor SMTP o servicio de mail para recuperacion de contraseña.

## Flujo de negocio deseado por el usuario

### Caso ejemplo
1. Llega un cliente nuevo, por ejemplo Pablo.
2. Se hace una cotizacion desde el cotizador DTF.
3. Desde esa cotizacion se debe poder:
   - crear o vincular cliente,
   - crear pedido,
   - arrastrar datos del cotizador,
   - completar estado, fecha de entrega, notas y datos comerciales.
4. Cuando el cliente paga:
   - registrar pago desde el mismo pedido,
   - marcar metodo/cuenta de cobro,
   - actualizar saldo del pedido,
   - impactar cuentas corrientes,
   - impactar reportes.
5. Si el pedido incluye productos fisicos:
   - agregar articulos al pedido,
   - descontar stock,
   - asociar proveedor/costo,
   - reflejar margen real.
6. Al entrar al cliente:
   - ver historial completo de pedidos,
   - pagos,
   - saldos,
   - notas relevantes.

## Problema de fondo hoy

La app ya tiene piezas de negocio, pero no estan totalmente unidas:

- `clients` existe.
- `orders` existe.
- `transactions` existe.
- `suppliers` existe.
- `reports` existe.

Pero hoy:

- pedido no tiene un circuito serio de cobros,
- no existen cuentas financieras reales tipo caja/billetera/banco,
- no existe catalogo de productos,
- no existe stock,
- no existe relacion fuerte entre ventas, costos y rentabilidad por producto o area,
- los reportes actuales salen de transacciones generales, no de un flujo integrado.

## Modelo de datos recomendado

### Tablas nuevas recomendadas
- `financial_accounts`
  - ejemplo: Efectivo, Mercado Pago, Santander, Brubank.
- `products`
  - catalogo vendible/comprable.
- `product_stock_movements`
  - ingresos, egresos, ajuste manual, compra, consumo en pedido.
- `order_items`
  - items reales del pedido: DTF, remera, envio, etc.
- `order_payments`
  - pagos parciales/totales del pedido.
- `order_status_history`
  - opcional, para auditoria.

### Campos nuevos recomendados en tablas existentes
- `users`
  - `supabase_auth_id`
- `orders`
  - `quoted_total`
  - `amount_paid`
  - `delivered_at`
  - `financial_status`
  - `source_quote_id` o equivalente
- `transactions`
  - `financialAccountId`
  - `productId` opcional
  - `reportArea`
  - `reportConcept`

## Reportes que quiere el usuario

### Estado de resultados general
- ingresos por mes
- egresos por mes
- utilidad final
- margen
- distribucion de costos
- detalle por area
- desglose por cuentas financieras

### Reporte de ventas
- ingresos en el tiempo
- ganancias por area
- productos mas vendidos por ingresos
- distribucion de ganancias
- porcentaje de ganancias

### Reporte de gastos
- gastos en el tiempo
- gastos por area
- distribucion de tipos de gasto
- gastos totales
- porcentaje sobre ventas

### Cuentas bancarias / billeteras
- ingresos por cuenta
- egresos por cuenta
- subtotal por cuenta
- total general por mes y anual

## Principios de implementacion

1. No seguir mezclando "total del pedido", "costo" y "cobro" en un mismo campo.
2. Cada cobro debe quedar asociado a:
   - pedido,
   - cliente,
   - cuenta financiera,
   - fecha,
   - medio de pago.
3. Cada costo relevante debe quedar asociado a:
   - pedido o producto,
   - proveedor,
   - cuenta financiera si salio dinero,
   - categoria y area de reporte.
4. Stock y reportes deben salir de los datos operativos, no de cargas duplicadas.

## Fases tecnicas sugeridas

### Fase A
- Documentar y alinear el flujo.
- Mejorar conexion cotizador -> pedido.
- Mejorar pedido -> cobro.
- Mejorar pedido -> cliente.

### Fase B
- Crear cuentas financieras reales.
- Permitir registrar pagos y gastos por cuenta.
- Hacer cuentas corrientes mas serias.

### Fase C
- Crear productos y stock.
- Conectar productos y stock a pedidos y proveedores.

### Fase D
- Rehacer reportes sobre el nuevo modelo.

### Fase E
- Migrar auth a Supabase Auth.

## Estado despues de esta iteracion

### Ya resuelto antes
- Se removio el acceso publico como invitado.
- El consumo del plan gratis/estandar ahora se descuenta al iniciar cotizacion o mockup.
- Se endurecio webhook de Mercado Pago.

### Meta de esta etapa
- dejar este documento,
- y empezar a unir cotizador, pedidos y cobros usando la base actual.

## Notas para futuros agentes

- Evitar meter de una sola vez productos, stock, cuentas y reportes si antes no se ordena el flujo de pedido y pago.
- No lanzar auth publico serio sin Supabase Auth.
- Antes del lanzamiento publico, cambiar credenciales administrativas debiles y rotar secretos expuestos.
