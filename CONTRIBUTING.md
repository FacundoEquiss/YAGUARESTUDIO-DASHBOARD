# CONTRIBUTING.md

## Guía de Desarrollo para YAGUARESTUDIO DTF Optimizer

### Setup del Proyecto

Este es un monorepo gestionado con **pnpm workspaces**.

```bash
# Instalar dependencias
pnpm install

# Desarrollo
pnpm dev

# Typecheck
pnpm run typecheck

# Tests
pnpm run test
pnpm run test:watch
pnpm run test:coverage

# Build
pnpm run build
```

### Estructura del Monorepo

```
├── artifacts/
│   ├── api-server/          # Backend Express + Drizzle ORM
│   ├── dtf-quote/           # Frontend React + Vite
│   └── mockup-sandbox/      # Sandbox de mockups
├── lib/
│   ├── api-client-react/    # Cliente React generado
│   ├── api-spec/            # OpenAPI contract
│   ├── api-zod/             # Schemas Zod generados
│   └── db/                  # Drizzle ORM schema + conexiones
└── scripts/                 # Scripts operativos
```

### Reglas de Desarrollo

1. **Nunca confiar en precios enviados por frontend**. Todo precio final se calcula en backend.
2. **Multi-tenancy estricto**: toda consulta filtra por `user_id`.
3. **No desactivar RLS**: Mantener ENABLE + FORCE RLS en tablas multi-tenant.
4. **Validar ownership**: Si se referencia entidad de otro módulo, validar que pertenezca al mismo `user_id`.
5. **Soft delete**: No eliminar físicamente entidades que usan `deleted_at`.

### Commits

Usa **Conventional Commits**:

```
feat: agregar endpoint de cotizaciones
fix: corregir cálculo de pasadas en pricing
docs: actualizar README con instrucciones
test: agregar tests de motor de pricing
```

### Testing

```bash
# Ejecutar todos los tests
pnpm run test

# Modo watch
pnpm run test:watch

# Con cobertura
pnpm run test:coverage
```

### Base de Datos

```bash
# Migraciones (desarrollo)
pnpm run db:push

# Ejecutar políticas RLS
pnpm --filter @workspace/db run apply-rls
```

### CI/CD

El proyecto usa GitHub Actions para:
- Typecheck en cada push/PR
- Tests con cobertura
- Build verificado
- Lint y formateo

### Reglas de Negocio Estrictas

1. Motor de pricing autoritativo en `artifacts/api-server/src/lib/dtf-pricing.ts`
2. RLS implementado con `app.current_user_id()` y `app.is_tenant_owner()`
3. JWT en cookie httpOnly + Authorization Bearer
4. Soft delete con `deleted_at`
5. Sin exposición de secretos en código
6. Validación de contratos API con Zod generado