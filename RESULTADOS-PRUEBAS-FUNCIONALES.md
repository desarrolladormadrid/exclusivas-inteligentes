# Resultados de pruebas funcionales

Última ejecución: 27/08/2026  ·  Producción: [exclusivas-inteligentes.vercel.app](https://exclusivas-inteligentes.vercel.app)

## Estado de la ejecución

| Bloque | Estado | Evidencia verificada |
|---|---|---|
| A · Acceso, rutas e inicio | PASS | Las rutas `/crm`, `/comercial`, `/almacen`, `/web` y `/portal-pedidos` responden 200. Login incorrecto devuelve 401; Comercial y Almacén entran en sus áreas previstas. Notificaciones de pedido, stock e incidencia abren su contexto; lectura e historial pasan. |
| B · Maestros y catálogo | PARCIAL | Alta y edición persistente de proveedor, producto, cliente y ubicación; búsqueda de productos y recorrido visual de Productos. Ficha de producto, código de barras SVG y QR PNG verificados en producción, incluidos sus enlaces descargables. Pendiente completar foto y validaciones exhaustivas del formulario. |
| C · Ventas y documentos | PARCIAL | Pedido con dos líneas, envío generado, preparación de línea, incidencia con faltante, resolución como envío parcial y reposición, presupuesto con línea, factura, cobro parcial/final y reservas. Pendiente cerrar facturación/albarán visual de extremo a extremo. |
| D · Almacén y compras | PARCIAL | Reserva/liberación de stock, recepción de compra y pruebas locales de movimientos, devoluciones y stock enviado. Pendiente recorrido visual completo de entrada, salida, ajustes y prioridades. |
| E · Notas, administración y configuración | PARCIAL | Nota importante, completar, papelera/recuperación, auditoría y previsualización de plantillas. La edición/guardado/restauración de una plantilla ya está verificada; también se corrigió la presentación de saltos en el listado. Pendiente descarga/impresión automatizada y matriz completa de permisos. |
| F · Transversales | PARCIAL | Escritorio, tablet y móvil comprobados; consola limpia; URL y endpoints de producción correctos. Pendiente tablet vertical/tacto, respuestas lentas, nombres largos y recorrido transversal completo con incidencia. |

## Baterías ejecutadas

- `npm test`: 2/2 correctas.
- `node --test tests/local-crm.test.mjs`: 26/26 correctas.
- `tests/local-ui-check.mjs`: rutas de escritorio, tablet y móvil, APIs básicas y salud de consola correctas.
- `tests/authenticated-ui-check.mjs`: inicio, preparación, stock en escritorio/tablet/móvil y modal de nuevo pedido correctos.
- `tests/production-sections-check.mjs`: 28/28 secciones, búsqueda, previsualización de plantilla con saltos de línea, descarga de SVG/PNG de producto y consola limpia.
- `tests/production-functional-flow-check.mjs`: pedido de varias líneas, preparación, compra recibida, stock, presupuesto, factura, cobros, nota, auditoría y recuperación.
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

## Higiene y restauración

- No quedan marcadores activos de las campañas ejecutadas en pedidos, notas, productos, movimientos, envíos, compras, presupuestos o cobros; también se retiraron restos antiguos QA/demo de preparación. Se conservaron las facturas `DEMO-*` del conjunto de demostración existente.
- La comprobación final dejó `0` diferencias de reservas de stock.
- Copia independiente previa a la campaña: `data/backups/turso-remote-before-functional-loop-2026-08-26T21-34-40-691Z.json`.
- Punto de restauración de código: `restore-before-functional-tests-2026-08-26`.

## Evidencias visuales

Las capturas de producción y los estados de fallo conservados están en `tests/screenshots/`, incluyendo `production-sections-documentos.png`, `production-document-template-preview.png`, `production-document-template-edit-restored.png`, `production-sections-preparación-de-pedidos.png`, `production-preparation-backorder.png`, `production-product-detail.png`, `production-product-label.png`, `production-expense-validation.png`, `notification-flow-deleted-filter.png`, `stock-alert-modal-production.png` y `production-sections-failed.png`.
