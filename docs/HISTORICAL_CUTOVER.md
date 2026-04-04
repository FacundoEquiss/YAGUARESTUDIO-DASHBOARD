# Historical Cutover

Este flujo permite archivar historico y hacer corte operativo desde una fecha.

## Objetivo

- Archivar datos anteriores a una fecha de corte.
- Sacar esos datos del flujo activo (soft delete en `orders`, `order_items`, `order_payments`, `transactions`).
- Crear ajustes de saldo inicial por cuenta para mantener continuidad financiera despues del corte.
- Guardar respaldo JSON antes de aplicar cambios.

## Comandos

Prerequisito:

- `DATABASE_URL` debe estar definido en el entorno actual.
- Si no esta exportado, cargalo antes de correr el comando.
- La base debe estar migrada al esquema V2 (tablas `order_items` / `order_payments` y columnas nuevas en `orders`/`transactions`).

Antes del cutover, correr:

```bash
pnpm run db:push
```

Ejemplo PowerShell:

```powershell
$line = Get-Content .env | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1
if ($line) { $env:DATABASE_URL = $line.Substring('DATABASE_URL='.Length).Trim('"') }
```

Dry-run (sin cambios en DB):

```bash
CUTOFF_DATE=2026-01-01 pnpm run db:orders-cutover:dry-run
```

Apply (aplica cambios):

```bash
CUTOFF_DATE=2026-01-01 CONFIRM_ORDER_CUTOVER=yes pnpm run db:orders-cutover:apply
```

## Variables soportadas

- `CUTOFF_DATE` (obligatoria): fecha de corte en formato `YYYY-MM-DD`.
- `CONFIRM_ORDER_CUTOVER` (obligatoria en apply): debe ser `yes`.
- `CUTOFF_USER_ID` (opcional): aplica solo a un usuario por id.
- `CUTOFF_USER_EMAIL` (opcional): aplica solo a un usuario por email.
- `CUTOFF_ARCHIVE_DIR` (opcional): directorio de salida del JSON de respaldo.
  - default: `artifacts/historical-cutover`
- `CUTOFF_CREATE_OPENING_BALANCE` (opcional): `no` para no crear ajustes de saldo inicial.

## Resultado del corte

Cuando corre en `apply`:

1. Genera archivo JSON de respaldo.
2. Archiva (soft delete) pedidos y entidades asociadas anteriores al corte.
3. Archiva (soft delete) transacciones anteriores al corte.
4. Inserta transacciones de ajuste por cuenta financiera en la fecha de corte (si esta activo).

## Recomendacion operativa

1. Ejecutar `dry-run` primero.
2. Revisar conteos y archivo de respaldo.
3. Ejecutar `apply` con confirmacion.
4. Correr validaciones:

```bash
pnpm run typecheck
pnpm run test
```
