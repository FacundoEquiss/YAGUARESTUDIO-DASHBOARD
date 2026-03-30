# Reset y Cuenta Demo

Este archivo deja documentado el flujo seguro para:

- aplicar la base nueva de datos
- limpiar cuentas de prueba
- crear una cuenta demo premium con historial ficticio de 3 meses

## Qué hace cada comando

### 1. Aplicar tablas nuevas

Comando:

```bash
pnpm run db:push
```

Esto crea o actualiza en la base real las tablas nuevas que agregamos para:

- `financial_accounts`
- `products`
- `product_stock_movements`
- el nuevo campo `financial_account_id` en `transactions`

## 2. Limpiar usuarios no master

Comando:

```bash
CONFIRM_RESET_NON_MASTER_USERS=yes pnpm run db:reset-users
```

Qué hace:

- borra todos los usuarios que no sean `master`
- preserva el mail definido en `MASTER_EMAIL`
- también preserva mails extra si se define `PRESERVE_EMAILS`

Importante:

- primero elimina `feedbacks`
- después elimina `users`
- el resto de los datos cae por cascada

Esto borra:

- usuarios
- suscripciones
- clientes
- proveedores
- pedidos
- transacciones
- cuentas financieras
- productos
- movimientos de stock
- uso

## 3. Crear cuenta demo premium

Comando:

```bash
pnpm run db:seed-demo
```

Qué crea:

- una cuenta demo premium
- 6 clientes
- 3 proveedores
- 3 cuentas financieras
- 5 productos
- compras de stock
- 9 pedidos distribuidos en 3 meses
- ingresos y gastos cruzados
- eventos de uso de cotizador/mockups/pdf distribuidos en 3 meses

Defaults:

- email: `demo.premium@yaguarestudio.xyz`
- password: `DemoPremium123!`
- nombre: `Cuenta Demo Premium`
- negocio: `Yaguar Demo Studio`

Variables opcionales:

- `DEMO_EMAIL`
- `DEMO_NAME`
- `DEMO_BUSINESS_NAME`

## 4. Reset + demo en una sola corrida

Comando:

```bash
CONFIRM_RESET_NON_MASTER_USERS=yes pnpm run db:reset-and-seed-demo
```

Este es el comando más útil para staging o una producción todavía cerrada al público.

## Cuándo conviene correr esto

Conviene hacerlo:

1. después de `db:push`
2. antes de testear el flujo completo de negocio
3. antes de rediseñar reportes, para tener datos creíbles de ejemplo

## Recomendación de trabajo

Orden recomendado:

1. `db:push`
2. `db:reset-and-seed-demo`
3. probar visualmente dashboard, perfil, pedidos, finanzas, cuentas y productos
4. recién ahí avanzar con reportes avanzados

## Nota para futuros agentes

Si el usuario pide “limpiar todas las cuentas”, no borrar nunca la cuenta master sin confirmación explícita.

Si la idea es demo visual:

- usar `db:reset-and-seed-demo`

Si la idea es producción pública real:

- probablemente convenga sólo `db:push`
- no sembrar demo salvo que el usuario quiera una cuenta demostración interna
