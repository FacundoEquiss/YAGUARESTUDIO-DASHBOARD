# Plan de Redisenio: Pedidos, Catalogo, Servicios y Reportes

## Contexto

Este documento nace despues de probar la cuenta demo premium ya desplegada.

La conclusion principal es:

- la app ya tiene piezas utiles,
- pero el modelo actual de pedido sigue siendo demasiado simple,
- y eso hace que productos, servicios, costos, ganancias y reportes no queden bien discriminados.

El objetivo de este documento es dejarle a cualquier agente futuro una guia clara para:

1. redisenar el flujo de pedido,
2. separar correctamente productos y servicios,
3. automatizar costos e impactos financieros,
4. y recien despues rehacer reportes con calidad profesional.

## Problemas detectados en el flujo actual

### 1. El pedido creado desde el cotizador no discrimina costo vs venta

Hoy desde el cotizador se crea un item tipo:

- `Cotizacion DTF (1.77 m) -> $82.000`

Problema:

- ese valor no deja claro cuanto es costo real del DTF,
- cuanto es precio de venta al cliente,
- cuanto es margen,
- y cuanto corresponde a bajadas de plancha, talle u otros recargos.

Resultado:

- el pedido queda comercialmente ambiguo,
- y los reportes futuros no pueden construir rentabilidad real.

### 2. El pedido no permite elegir productos ya creados

Hoy no se puede:

- elegir una remera ya cargada en catalogo,
- indicar cuantas unidades se usan,
- tomar automaticamente su costo unitario,
- tomar automaticamente su precio de venta sugerido,
- y descontar stock despues.

Resultado:

- el pedido no representa el negocio real,
- el stock no se integra,
- y los costos quedan duplicados o manuales.

### 3. El concepto "item del pedido" es demasiado pobre

Hoy un item manual solo tiene:

- titulo
- total

Problema:

- no se sabe si ese total es costo, venta o ambos,
- no se sabe si impacta stock,
- no se sabe si es un gasto real, un recargo, un reembolso o un servicio,
- no se sabe a que area o concepto de reporte pertenece.

### 4. Hay demasiada friccion para reflejar la economia real del pedido

Ejemplo:

- Uber cuesta 5.000
- al cliente se le cobran 10.000

Hoy no hay una forma directa y limpia de expresar:

- costo real: 5.000
- venta al cliente: 10.000
- margen: 5.000
- salida de dinero desde una cuenta real

sin obligar al usuario a ir despues a Finanzas y registrar a mano ingresos y egresos.

### 5. El modelo actual no contempla bien servicios

El negocio no es solo vender productos fisicos.

Tambien existen casos donde:

- el cliente trae sus prendas,
- el cliente trae sus estampas,
- solo se cobra el estampado,
- o se vende un servicio como sublimacion,
- vinilo textil,
- corte,
- troquelado,
- planchado,
- armado,
- diseno.

Hoy eso no esta bien modelado.

## Decision central recomendada

No seguir pensando el pedido como una lista de "totales sueltos".

El pedido debe pasar a ser una composicion de lineas inteligentes.

Cada linea tiene que saber:

- que cosa es,
- cuanto cuesta internamente,
- cuanto se cobra al cliente,
- si usa stock,
- si representa un servicio,
- si impacta reportes,
- y si debe generar movimientos financieros automaticos.

## Modelo recomendado

## 1. Separar Catalogo en dos secciones visibles

### Seccion A: Productos

Pensada para cosas con stock o costo material claro.

Ejemplos:

- Remera Oversize Negra
- Remera Regular Blanca
- Buzo
- Bolsa packaging
- Vinilo
- Rollo DTF

Campos recomendados:

- nombre
- SKU opcional
- categoria
- proveedor principal
- unidad
- costo unitario base
- precio de venta sugerido
- stock actual
- stock minimo
- activo/inactivo
- area de reporte por defecto
- concepto de reporte por defecto

### Seccion B: Servicios

Pensada para cosas que no consumen stock fisico o cuyo valor principal es mano de obra/proceso.

Ejemplos:

- Estampado DTF
- Sublimacion
- Vinilo textil troquelado
- Estampado de vinilo textil
- Servicio de diseno
- Bajada de plancha adicional
- Corte / armado

Campos recomendados:

- nombre
- categoria
- tipo de cobro
- costo base interno
- precio de venta sugerido
- unidad de cobro
- usa insumo indirecto si corresponde
- area de reporte por defecto
- concepto de reporte por defecto

### Nota importante

Puede haber dos pantallas separadas en la UI:

- `Productos`
- `Servicios`

pero a nivel de modelo conviene que ambos compartan una estructura comun de catalogo.

Una opcion sana es:

- tabla `catalog_items`
- campo `kind = product | service`

Si no se quiere refactor fuerte, tambien se puede mantener:

- `products`
- `services`

pero con una interfaz comun en el pedido.

## 2. Redisenar la estructura del pedido

### El pedido debe tener lineas tipadas

Cada linea del pedido debe ser una de estas:

1. `quote_dtf_line`
   - viene del cotizador
   - separa costo DTF, precio DTF y margen DTF

2. `product_line`
   - usa un producto ya creado
   - puede tomar costo y precio sugeridos
   - puede descontar stock

3. `service_line`
   - usa un servicio ya creado
   - no descuenta stock fisico
   - si corresponde puede consumir un insumo aparte

4. `manual_line`
   - linea libre
   - se usa para casos especiales

5. `pass_through_line`
   - gasto recuperable o parcialmente recuperable
   - ejemplo: Uber, envio, comision, embalaje externo

### Campos minimos recomendados para cada linea

- `lineType`
- `sourceId` opcional
- `title`
- `description`
- `quantity`
- `unitCost`
- `unitPrice`
- `totalCost`
- `totalPrice`
- `grossMargin`
- `affectsStock`
- `affectsFinance`
- `reportArea`
- `reportConcept`
- `supplierId` opcional

### Regla clave

Siempre guardar por separado:

- costo total
- venta total

Nunca guardar solo "total" cuando el dato en realidad mezcla costo y precio.

## 3. Que debe pasar al crear un pedido desde el cotizador

### Nuevo flujo recomendado

Desde el cotizador:

1. se genera una linea DTF inteligente
2. la linea trae:
   - metros
   - costo DTF base
   - precio DTF al cliente
   - recargos
   - margen DTF
3. el usuario puede completar el pedido agregando:
   - productos
   - servicios
   - extras
   - recargos
   - envios

### En el pedido se debe ver inmediatamente

- subtotal de venta
- subtotal de costo
- margen bruto
- saldo cobrado
- saldo pendiente

## 4. Ejemplo correcto para el caso "Pablo"

### Pedido

Cliente:

- Pablo

Lineas del pedido:

1. DTF estampado
   - cantidad: 10 prendas
   - descripcion: espalda 28x32 + pecho 8x8
   - costo interno DTF: X
   - precio de venta DTF: Y

2. Producto: Remera Oversize Negra
   - cantidad: 10
   - costo unitario: tomado del producto
   - precio unitario sugerido: tomado del producto o editable

3. Extra: envio/Uber
   - costo real: 5.000
   - venta al cliente: 10.000

### Resultado del pedido

El pedido debe mostrar:

- venta total del pedido
- costo total del pedido
- margen bruto
- pagos registrados
- saldo pendiente

### Cuando se entrega y paga

Debe poder:

- marcar entregado
- registrar el pago desde el mismo pedido
- elegir cuenta de ingreso:
  - efectivo
  - Mercado Pago
  - Santander
- elegir fecha y observacion

### Impactos automaticos esperados

- ingreso financiero por el cobro
- egreso financiero por costos pagos si el usuario los marca como pagados
- descuento de stock de las remeras
- descuento de packaging si aplica
- actualizacion de reportes

## 5. Resolver el caso de "Uber cuesta 5 y cobro 10"

Este caso debe poder representarse dentro del pedido sin doble carga manual.

### Solucion recomendada

Una linea `pass_through_line` o `extra_line` debe permitir:

- costo interno unitario o total
- precio al cliente unitario o total
- proveedor opcional
- cuenta financiera de salida opcional

### Ejemplo

Linea:

- titulo: Uber entrega
- costo: 5.000
- venta al cliente: 10.000

El sistema calcula:

- margen bruto de esa linea: 5.000

Y si el usuario registra que el Uber ya se pago:

- genera egreso automatico asociado al pedido

Si no lo pago todavia:

- queda como costo comprometido o pendiente

## 6. Automatizacion para evitar friccion

El usuario no deberia ir manualmente a Finanzas para reflejar cosas que ya nacen del pedido.

### Recomendacion

Agregar un sistema de "posteos automaticos" desde pedido.

### Eventos clave

#### A. Al guardar el pedido

No necesariamente mover dinero todavia.

Pero si:

- guardar costos esperados
- guardar venta esperada
- reservar estructura del pedido

#### B. Al marcar "cobro recibido"

Crear automaticamente:

- una transaccion de ingreso
- asociada a:
  - pedido
  - cliente
  - cuenta financiera
  - categoria
  - area

#### C. Al marcar "costo pagado"

Crear automaticamente:

- una transaccion de egreso
- asociada a:
  - pedido
  - proveedor
  - cuenta financiera
  - categoria
  - area

#### D. Al marcar "entregado" o "producido"

Aplicar:

- movimientos de stock
- costos efectivos de consumo

## 7. Reportes: como deben rehacerse

Los reportes mostrados por el usuario no son un simple "grafiquito".

Son reportes gerenciales.

Para llegar a eso, primero hay que cambiar de fuente:

- no reportar solo desde transacciones sueltas
- reportar desde hechos de negocio normalizados

### Fuente de verdad recomendada

Los reportes deben construirse a partir de:

- pedidos
- lineas de pedido
- pagos de pedido
- productos
- servicios
- movimientos de stock
- transacciones financieras
- cuentas financieras
- areas y conceptos de reporte

## 8. Reportes concretos a implementar

### A. Estado de resultados general

Debe incluir por mes:

- saldo inicial
- ingresos cobrados
- ingresos pendientes si se quiere ver lo esperado
- pagos extras
- total ingresos
- egresos administrativos
- egresos de ventas
- costos
- fiscal
- otros
- total egresos
- flujo del mes
- utilidad final
- rentabilidad

### B. Resultados generales por area

Debe mostrar por area:

- ingresos
- gastos
- utilidad
- margen
- rentabilidad

Areas ejemplo:

- Estampado
- Impresiones DTF
- Sublimacion
- Vinilo
- Disenio
- Web
- Redes
- Yaguar
- otros que el usuario defina

### C. Reporte de ventas

Debe mostrar:

- ingresos en el tiempo
- ganancias por area
- productos mas vendidos por ingresos
- productos mas vendidos por cantidad
- servicios mas vendidos
- distribucion de ganancias
- clientes mas importantes

### D. Reporte de gastos

Debe mostrar:

- gastos en el tiempo
- gastos por area
- gastos por concepto
- distribucion de tipos de gasto
- gastos totales
- porcentaje de gastos sobre ventas

### E. Cuentas bancarias / billeteras

Debe mostrar por cuenta:

- ingresos por mes
- egresos por mes
- subtotal por mes
- total acumulado

### F. Reporte de productos y servicios

Nuevo reporte recomendado:

- rentabilidad por producto
- rentabilidad por servicio
- margen promedio
- unidades vendidas
- ingreso total
- costo total

## 9. Campos nuevos necesarios para reportes serios

Cada linea de pedido y cada transaccion deberia poder tener:

- `reportArea`
- `reportConcept`
- `reportSubtype`

Ejemplos:

- area: `Estampado`
- concepto: `Ventas`

- area: `Estampado`
- concepto: `Costos`

- area: `Administrativo`
- concepto: `Servicios`

Sin eso, los reportes tipo Excel gerencial quedan incompletos.

## 10. Roadmap recomendado de implementacion

### Fase 1: arreglar modelo del pedido

Objetivo:

- reemplazar el item simple por lineas inteligentes

Incluye:

- linea DTF discriminada
- seleccion de productos
- seleccion de servicios
- extras con costo y venta
- subtotal costo / subtotal venta / margen

### Fase 2: automatizar impacto operativo

Objetivo:

- que el pedido ya sea el centro del negocio

Incluye:

- pagos desde pedido
- costos pagados desde pedido
- cuentas financieras
- descuento de stock

### Fase 3: consolidar catalogo

Objetivo:

- separar claramente productos y servicios

Incluye:

- seccion Productos
- seccion Servicios
- categorias
- areas
- conceptos de reporte por defecto

### Fase 4: rehacer reportes backend

Objetivo:

- crear endpoints serios de agregacion

Incluye:

- resultado general
- resultados por area
- ventas
- gastos
- cuentas
- productos y servicios

### Fase 5: rehacer reportes frontend

Objetivo:

- que la pestania Reportes se parezca a las referencias del usuario

Incluye:

- tablas mensuales
- tarjetas resumen
- graficos
- filtros por anio
- filtros por area
- filtros por concepto
- vistas de cuentas

## 11. Decisiones UX recomendadas

### En el modal de pedido

Mostrar secciones claras:

1. Cliente
2. Datos del pedido
3. Lineas del pedido
4. Resumen economico
5. Cobros y costos

### En "Lineas del pedido"

Botones de alta:

- Agregar DTF desde cotizacion
- Agregar producto
- Agregar servicio
- Agregar extra/manual

### En el resumen economico

Siempre mostrar:

- venta total
- costo total
- margen bruto
- cobrado
- pendiente

## 12. Principios que no deberian romperse

1. Nunca volver a usar un solo campo `total` para representar cosas mezcladas.
2. El pedido debe ser suficiente para entender la economia del trabajo.
3. El usuario no deberia duplicar carga entre pedido y finanzas salvo casos excepcionales.
4. Productos y servicios deben convivir, pero no confundirse.
5. Los reportes deben salir de datos operativos reales, no de parches visuales.

## 13. Recomendacion final para el proximo agente

No empezar por reportes visuales.

Primero corregir:

- estructura de lineas del pedido
- seleccion de productos
- seccion servicios
- costo vs venta vs margen
- automatizacion de cobros/costos

Despues si:

- rehacer backend de reportes
- rehacer frontend de reportes con el formato pedido por el usuario

## 14. Estado de prioridad

### Prioridad maxima

- redisenar pedido
- productos dentro del pedido
- servicios dentro del pedido
- costo y venta separados por linea

### Prioridad alta

- automatizacion financiera desde pedido
- stock conectado al pedido
- reporte de rentabilidad real

### Prioridad media

- visual final tipo Excel gerencial
- filtros avanzados
- exportaciones
