# Resultados de pruebas funcionales

Última ejecución: 27/08/2026  ·  Producción: [exclusivas-inteligentes.vercel.app](https://exclusivas-inteligentes.vercel.app)

## Estado de la ejecución

| Bloque | Estado | Evidencia verificada |
|---|---|---|
| A · Acceso, rutas e inicio | PASS | Las rutas `/crm`, `/comercial`, `/almacen`, `/web` y `/portal-pedidos` responden 200. Login incorrecto devuelve 401; Comercial y Almacén entran en sus áreas previstas. Notificaciones de pedido, stock e incidencia abren su contexto; lectura e historial pasan. |
| B · Maestros y catálogo | PARCIAL | Alta y edición persistente de proveedor, producto, cliente y ubicación; búsqueda de productos y recorrido visual de Productos. Ficha de producto, código de barras SVG y QR PNG verificados en producción, incluidos sus enlaces descargables. La persistencia de foto se validó en el endpoint con MIME y nombre; queda pendiente cerrar la selección visual desde el navegador y validaciones exhaustivas del formulario. |
| C · Ventas y documentos | PARCIAL | Pedido con dos líneas, envío generado, preparación de línea, incidencia con faltante, resolución como envío parcial y reposición, presupuesto con línea, factura, cobro parcial/final y reservas. Las vistas visuales de factura y albarán muestran cliente, dirección, líneas, importes, IVA y total. La devolución vinculada a cliente/factura se creó desde producción y aumentó stock 10→11 con trazabilidad en inventario. Pendiente cerrar abonos visuales. |
| D · Almacén y compras | PARCIAL | Reserva/liberación de stock, recepción de compra y gastos con justificante, devoluciones y prueba visual en producción de entrada y salida: el stock pasó 10→14→12 y la salida generó su hoja de carga. También se validaron desde la interfaz ajuste positivo, ajuste negativo y devolución, con stock 20→23→21→20, prioridad configurable y una compra recibida que incrementó stock 10→15. Compras inteligentes detectó un producto bajo mínimo, comparó proveedores por coste real y dejó una solicitud pendiente de envío sin automatizar el envío. Pendiente adjunto binario real y revisión de costes avanzados.
| E · Notas, administración y configuración | PARCIAL | Nota importante, completar, papelera/recuperación, auditoría y previsualización de plantillas. La edición/guardado/restauración de una plantilla ya está verificada; también se corrigió la presentación de saltos en el listado. Se verificaron visualmente los roles Comercial y Almacén y la matriz de permisos. Los botones de descarga e impresión están presentes y la impresión se dispara; la descarga Blob no expuso evento de fichero en el navegador embebido. Pendiente prueba automatizada de fichero y matriz completa de autorización por cada ruta. |
| F · Transversales | PARCIAL | Escritorio, tablet, móvil y tablet vertical comprobados; la vertical se corrigió para evitar solape del menú con la cabecera y pasó de nuevo en local y producción. Consola, URL y endpoints de producción correctos. Pendiente tacto, respuestas lentas, nombres largos y recorrido transversal completo con incidencia. |

## Baterías ejecutadas

- `npm test`: 2/2 correctas.
- `node --test tests/local-crm.test.mjs`: 26/26 correctas.
- `tests/local-ui-check.mjs`: rutas de escritorio, tablet y móvil, APIs básicas y salud de consola correctas.
- `tests/authenticated-ui-check.mjs`: inicio, preparación, stock en escritorio/tablet/móvil y modal de nuevo pedido correctos.
- `tests/production-sections-check.mjs`: 28/28 secciones, búsqueda, previsualización de plantilla con saltos de línea, descarga de SVG/PNG de producto y consola limpia.
- `tests/production-functional-flow-check.mjs`: pedido de varias líneas, preparación, compra recibida, stock, presupuesto, factura, cobros, nota, auditoría y recuperación.
- `tests/production-validation-check.mjs`: producto sin nombre rechazado, producto decimal válido persistido y SKU duplicado rechazado.
- `tests/production-delete-reservation-check.mjs`: reserva incrementada al crear y liberada al borrar.
- Recorrido visual de preparación: faltante, incidencia, resolución parcial, resolución desde Notas y solicitud de reposición verificados; se comprobó la creación de la reposición y su trazabilidad.
- `tests/production-stock-alert-check.mjs`, `tests/production-note-modal-check.mjs` y `tests/notification-flow-check.mjs`: correctas en producción.
- Flujo visual de Gastos y tickets: carga de documento y validación de campos obligatorios sin crear datos incompletos.
- Lint global: 707 incidencias heredadas fuera del alcance de esta iteración; la compilación y las pruebas funcionales sí pasan.

## Correcciones aplicadas

- El pie del menú lateral dejó de bloquear las opciones inferiores.
- Borrar un pedido no terminal libera sus reservas y cancela sus dependencias operativas.
- La caché de listados se desactiva en modo remoto para no mostrar reservas obsoletas entre instancias serverless.
- Las altas de compras ya no devuelven campos exclusivos de pedidos que rompían su edición.
- Las plantillas normalizan saltos de línea almacenados como texto literal para que la previsualización, edición y descarga sean legibles.
- El listado de plantillas convierte los saltos de línea a texto compacto para evitar mostrar `\\n` literal en la tabla.
- Los códigos de barras se ofrecen como enlace SVG descargable en la ficha y en la vista de etiqueta; el QR mantiene su descarga PNG.
- Se aplicaron en Turso las columnas de resolución de incidencias de `order_lines` y `notes`; el comando reproducible queda en `npm run db:migrate-remote`.
- Las líneas que ya tienen una resolución no vuelven a ofrecer “Registrar incidencia”, evitando duplicados.
- Se verificaron en producción una entrada y una salida desde la interfaz, con actualización de stock y generación automática de hoja de carga para la salida; los registros temporales se retiraron al finalizar.
- Se verificaron también desde la interfaz los movimientos de ajuste positivo, ajuste negativo y devolución; la vista Stock mostró prioridad configurable, saldo, mínimo y estado “Disponible”. La devolución de C5 se creó con cliente, factura, producto, cantidad, fechas, motivo, revisado/autorizado e importe, y generó movimiento “Devolución” con el stock esperado; los datos temporales se retiraron al finalizar.
- Se validó en producción el alta manual de un gasto con fecha, categoría, proveedor, importe decimal, IVA, forma de pago y justificante identificado; se comprobó su persistencia visual y después se retiró el registro temporal.
- Se validó en producción una compra con proveedor, fechas, importe y línea de producto; al pasarla a “Recibida” creó la entrada de inventario y actualizó el stock esperado. Los datos temporales se retiraron al finalizar.
- Se validó en producción Compras inteligentes con un producto temporal bajo mínimo: calculó la cantidad propuesta, comparó dos ofertas incluyendo transporte, mínimo y rappel, y creó una solicitud para varios proveedores en estado “Pendiente de enviar”; producto, ofertas, sugerencia y solicitud se retiraron al finalizar.
- Se validaron los módulos visibles por rol desde el login de producción: Comercial ve sus ocho secciones operativas y Almacén ve logística/almacén más Envíos y Pedidos, sin mostrar administración ni compras comerciales.
- La carga de foto de producto conserva nombre y MIME al guardar mediante API; el selector de fichero del navegador embebido no pudo completar la selección automática, por lo que queda como pendiente instrumental y no se alteró ningún producto real.
- El caso transversal de nombre largo conservó 221 caracteres y los importes decimales se mostraron en la tabla sin romper el scroll horizontal; el producto temporal se retiró al finalizar.
- La prueba de reserva se repitió en solitario después de detectar interferencia entre campañas concurrentes que compartían el producto de control; entonces confirmó incremento y liberación exactos.
- La revisión vertical detectó y corrigió el solape del menú compacto con la cabecera; la captura posterior en local y producción conserva el scroll interno de tablas sin cortar la pantalla.

## Higiene y restauración

- No quedan marcadores activos de las campañas ejecutadas en pedidos, notas, productos, movimientos, envíos, compras, presupuestos o cobros; también se retiraron restos antiguos QA/demo de preparación. Se conservaron las facturas `DEMO-*` del conjunto de demostración existente.
- La comprobación final dejó `0` diferencias de reservas de stock.
- Copia independiente previa a la campaña: `data/backups/turso-remote-before-functional-loop-2026-08-26T21-34-40-691Z.json`.
- Punto de restauración de código: `restore-before-functional-tests-2026-08-26`.

## Evidencias visuales

Las capturas de producción y los estados de fallo conservados están en `tests/screenshots/`, incluyendo `production-sections-documentos.png`, `production-document-template-preview.png`, `production-document-template-edit-restored.png`, `production-document-actions.png`, `production-invoice-preview.png`, `production-delivery-note-preview.png`, `production-return-created.png`, `production-users-permissions.png`, `production-commercial-permissions.png`, `production-commercial-role.png`, `production-warehouse-role.png`, `production-smart-purchasing-clean.png`, `production-long-name-decimals.png`, `production-sections-preparación-de-pedidos.png`, `production-preparation-backorder.png`, `production-warehouse-entry.png`, `production-warehouse-exit.png`, `production-stock-priority.png`, `production-purchase-received.png`, `production-expense-created.png`, `production-responsive-vertical-fixed.png`, `production-product-detail.png`, `production-product-label.png`, `production-expense-validation.png`, `notification-flow-deleted-filter.png`, `stock-alert-modal-production.png` y `production-sections-failed.png`. La captura local del ajuste responsive queda en `tests/screenshots/local-responsive-vertical-fixed.png`.
