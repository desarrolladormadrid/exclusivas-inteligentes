# Resultados de pruebas funcionales

Última ejecución: 01/09/2026  ·  Producción: [exclusivas-inteligentes.vercel.app](https://exclusivas-inteligentes.vercel.app)

Versión preparada en esta entrega: `2.0.45` · Rutas, mapas integrados y copias de Turso con restauración controlada.

## Estado de la ejecución

| Bloque | Estado | Evidencia verificada |
|---|---|---|
| A · Acceso, rutas e inicio | PASS | Las rutas `/crm`, `/comercial`, `/almacen`, `/web` y `/portal-pedidos` responden 200. Login incorrecto devuelve 401; Comercial y Almacén entran en sus áreas previstas. Las rutas directas `/almacen` y `/comercial` abren por defecto Preparación de pedidos y Pedidos, respectivamente. Notificaciones de pedido, stock e incidencia abren su contexto; lectura e historial pasan. |
| B · Maestros y catálogo | PASS | Alta y edición persistente de proveedor, producto, cliente y ubicación; búsqueda de productos y recorrido visual de Productos. Alta completa de producto verificada en producción con valores por defecto, proveedor buscable, almacén, ubicación, costes, márgenes, impuestos y trazabilidad; previsualización, confirmación y persistencia tras guardado pasan. Foto, código de barras SVG, QR PNG, descargas y ficha de detalle también pasan. |
| C · Ventas y documentos | PASS | Pedido con dos líneas, envío generado, preparación de línea, incidencia con faltante, resolución como envío parcial y reposición, presupuesto con línea, factura, cobro parcial/final y reservas. Las vistas visuales de factura, albarán y devoluciones/abonos muestran cliente, dirección, líneas, importes, IVA, total y trazabilidad. La devolución vinculada a cliente/factura se creó desde producción y aumentó stock 10→11 con trazabilidad en inventario. La facturación agrupada de dos pedidos del mismo cliente pasa con dos líneas y ambos pedidos marcados como facturados. La proforma se convierte desde la interfaz a factura con código `FAC-*`, estado `Pendiente` y líneas conservadas; las descargas de documentos pasan en la batería específica.
| D · Almacén y compras | PASS | Reserva/liberación de stock, recepción de compra y gastos con justificante, devoluciones y prueba visual en producción de entrada y salida: el stock pasó 10→14→12 y la salida generó su hoja de carga. También se validaron desde la interfaz ajuste positivo, ajuste negativo y devolución, con stock 20→23→21→20, prioridad configurable y una compra recibida que incrementó stock 10→15. El justificante binario se guardó desde la interfaz y se recuperó mediante el endpoint de detalle con nombre, MIME y contenido. Compras inteligentes detectó un producto bajo mínimo, comparó proveedores por coste real y dejó una solicitud pendiente de envío sin automatizar el envío. Los costes avanzados de producto (transporte, manipulación, coste real y márgenes objetivo/mínimo) quedan visibles en la ficha y persistieron en producción.
| E · Notas, administración y configuración | PASS (OCR aplazado) | Nota importante, completar, papelera/recuperación, auditoría y previsualización de plantillas. La edición/guardado/restauración de una plantilla ya está verificada; también se corrigió la presentación de saltos en el listado. Los roles Comercial, Almacén y Luis se probaron en sus rutas directas sin mostrar administración a los roles restringidos. Los botones de descarga e impresión están presentes y la descarga Blob funciona en Playwright (`TPL-CND-001.txt`). La ruta `/ocr` queda fuera de esta entrega por decisión del usuario; no se considera funcionalidad terminada. |
| F · Transversales | PASS | Escritorio, tablet, móvil y tablet vertical comprobados; la vertical se corrigió para evitar solape del menú con la cabecera y pasó de nuevo en local y producción. También se verificaron nombres largos, importes decimales, el recorrido transversal con incidencia, interacción táctil y recuperación tras respuesta lenta. Consola, URL y endpoints de producción correctos. |
| G · Rutas y continuidad de datos | PASS LOCAL · TURSO MIGRADO | Varias direcciones por cliente mediante lugares de recogida, mapa integrado con radio configurable de 150 m, creación de rutas con orden de paradas por proximidad y enlace de navegación a Google Maps. Histórico de snapshots comprimidos, descarga y restauración con confirmación explícita comprobados en local; las tablas de rutas y copias están migradas en Turso. |

Verificación final de producción 2.0.45: Vercel Ready, `/api/routes` y `/api/backups` responden 200, el programador queda protegido sin secreto (401), y se creó correctamente el snapshot `BKP-20260901081357-37658`.

## Baterías ejecutadas

- `npm test`: 2/2 correctas.
- `node --test --test-concurrency=1 tests/local-crm.test.mjs`: 27/27 correctas; se ejecutó en secuencial para evitar interferencias de Turso remoto.
- `node --test tests/local-crm.test.mjs`: 34/34 correctas, incluyendo planificación de rutas y restauración de copia.
- `tests/local-ui-check.mjs`: rutas de escritorio, tablet y móvil, APIs básicas y salud de consola correctas.
- `tests/authenticated-ui-check.mjs`: inicio, preparación, stock en escritorio/tablet/móvil y modal de nuevo pedido correctos.
- `tests/production-sections-check.mjs`: 28/28 secciones, búsqueda, previsualización de plantilla con saltos de línea, descarga de SVG/PNG de producto y consola limpia.
- `tests/production-functional-flow-check.mjs`: pedido de varias líneas, preparación, compra recibida, stock, presupuesto, factura, cobros, nota, auditoría y recuperación.
- `tests/production-validation-check.mjs`: producto sin nombre rechazado, producto decimal válido persistido y SKU duplicado rechazado.
- `tests/production-expense-attachment-check.mjs`: gasto creado desde la interfaz y justificante binario recuperado por detalle con nombre, MIME y contenido.
- `tests/production-product-form-check.mjs`: alta completa de producto desde la interfaz, proveedor buscable, almacén, costes, márgenes, confirmación y persistencia verificados.
- `tests/production-grouped-billing-check.mjs`: selección de dos pedidos del mismo cliente, factura agrupada con dos líneas y actualización de ambos estados verificada.
- `tests/production-grouped-billing-check.mjs`: filtro “Sin facturar”, estado “Facturado”, factura agrupada y bloqueo de un segundo intento de facturación verificados.
- `tests/production-proforma-check.mjs`: conversión visual de proforma a factura, código `FAC-*`, estado pendiente y conservación de líneas verificados.
- `tests/production-ocr-check.mjs`: aplazado; la funcionalidad OCR no forma parte del alcance actual y queda pendiente de una implementación de reconocimiento real.
- `tests/production-document-download-check.mjs`: descarga real de plantilla de documentos verificada (`TPL-CND-001.txt`).
- `tests/production-role-route-check.mjs`: Comercial en `/comercial`, Almacén en `/almacen` y Luis en `/crm`, con alcance y cabeceras esperadas.
- `tests/production-touch-slow-check.mjs`: menú y Stock usables con toque móvil y carga retardada; estado cargando y resultado final capturados.
- `tests/production-delete-reservation-check.mjs`: reserva incrementada al crear y liberada al borrar.
- `tests/route-default-check.mjs`: `/almacen` abre Preparación de pedidos, `/comercial` abre Pedidos y Gastos y tickets precarga la fecha; local y producción sin errores de consola.
- Recorrido visual de preparación: faltante, incidencia, resolución parcial, resolución desde Notas y solicitud de reposición verificados; se comprobó la creación de la reposición y su trazabilidad.
- `tests/production-stock-alert-check.mjs`, `tests/production-note-modal-check.mjs` y `tests/notification-flow-check.mjs`: correctas en producción.
- `tests/toolbar-icons-check.mjs`: acciones de descarga/importación de `Envíos` convertidas a iconos, con tooltip, nombre accesible, comprobación visual en escritorio/tablet y consola limpia en producción.
- `tests/toolbar-icons-check.mjs`: accesos rápidos del panel principal (`Preparación`, `Stock`, `Nuevo pedido` y `Subir gasto`) convertidos a iconos y verificados visualmente en escritorio/tablet y en producción.
- `tests/sidebar-map-check.mjs`: sidebar ampliado y legible (257 px en escritorio, 222 px en tablet), `Inicio` alineado con las opciones agrupadas e icono de mapa accesible verificado en el detalle de un pedido de producción.
- `tests/performance-local-check.mjs`: local y producción; Productos compactos 73%/77% más pequeños y Inicio sin descarga completa del catálogo.
- `tests/contact-modal-preparation-check.mjs`: edición completa de Contactos y ficha modal de Clientes, botón “Mañana” en preparación y consola limpia verificados en local.
- `tests/contact-modal-preparation-check.mjs` en producción: Contactos, Clientes, “Mañana” y consola limpia verificados tras el despliegue.
- `tests/contact-modal-preparation-check.mjs`: nota de carga abierta en móvil de 441×820, sin overflow horizontal y con líneas en formato de tarjetas.
- `tests/primary-supplier-display-check.mjs`: columna Proveedor principal comprobada en local y producción; no muestra IDs numéricos crudos.
- `tests/sidebar-map-check.mjs` en local y producción: sidebar de 280 px, títulos de grupo con contraste, ausencia de desplazamiento horizontal, alturas alineadas e icono de mapa verificados.
- Alineación de iconos de acordeón del sidebar: caja fija de 20 px, centrado interno y contraste visual comprobados en escritorio y tablet.
- `tests/sidebar-map-check.mjs` en local y producción: botón circular con icono de hamburguesa de tres líneas en la esquina superior derecha, línea roja visible, sin solapamiento con los accesos de cabecera, menú inicial compacto sin scroll innecesario, usuario/rol y cierre de sesión antes de la versión, versión como último elemento del panel y comprobación adicional en móvil horizontal.
- `tests/production-favicon-check.mjs` en local y producción: `/favicon.svg` responde `200` con tipo `image/svg+xml` y contiene el símbolo corporativo rojo con “E” blanca.
- `tests/list-density-check.mjs` en local y producción: Presupuestos verificado con texto de `12 px`, padding vertical de `7 px` y filas de `43 px`, además de capturas en escritorio y tablet.
- Recorrido visual local de listados: hover de filas con fondo azul grisáceo de mayor contraste, marca roja lateral y conservación de los estados de alerta/eliminado.
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
- La carga de foto de producto conserva nombre y MIME al guardar mediante API; el selector de fichero del navegador embebido también mostró correctamente el nombre seleccionado sin alterar ningún producto real.
- El caso transversal de nombre largo conservó 221 caracteres y los importes decimales se mostraron en la tabla sin romper el scroll horizontal; el producto temporal se retiró al finalizar.
- La prueba de reserva se repitió en solitario después de detectar interferencia entre campañas concurrentes que compartían el producto de control; entonces confirmó incremento y liberación exactos.
- La revisión vertical detectó y corrigió el solape del menú compacto con la cabecera; la captura posterior en local y producción conserva el scroll interno de tablas sin cortar la pantalla.
- Las rutas directas ya no dependen de la sección persistida en el navegador: `/almacen` prioriza Preparación de pedidos y `/comercial` prioriza Pedidos. El formulario de Gastos y tickets precarga fecha, categoría, IVA y forma de pago para evitar altas incompletas por fecha vacía.
- Los listados de productos y gastos siguen excluyendo los binarios pesados, pero sus endpoints de detalle ya devuelven la ficha completa para poder recuperar fotos y justificantes guardados.
- La carga se optimizó sin cambiar el contrato de los listados: Inicio usa `/api/summary` en una sola respuesta, selectores y consultas auxiliares usan vistas compactas con límite seguro y una caché breve de sesión evita repetir lookups. En local, Productos pasó de 212 KB a 56 KB (73% menos) y el inicio dejó de descargar el catálogo completo.
- El formulario de productos carga también los almacenes necesarios para sus campos obligatorios; la confirmación ya no dispara el cierre externo que vaciaba la ficha antes de guardar y los errores de validación se muestran en el gestor.
- El bloque de costes y márgenes incorpora coste de transporte, coste de manipulación y coste real; sus valores y los márgenes objetivo/mínimo se validaron con persistencia en producción.
- La conversión de proformas se verificó desde el listado de Facturas, manteniendo la misma ficha y sus líneas y cambiando el código a `FAC-*` y el estado a `Pendiente`.
- Las acciones secundarias de la cabecera de gestión muestran iconos compactos para descargar Excel/CSV, importar CSV y descargar plantilla; `Crear envío` conserva su etiqueta como acción principal.
- El sidebar de escritorio/tablet se amplió un 20% y sus tamaños tipográficos se ajustaron; `Inicio` dejó de comprimirse por el contenedor flexible. El buscador de dirección en mapa usa ahora un icono con tooltip y etiqueta accesible.
- Contactos dejó de editarse dentro de la fila: al pulsar una empresa o “Editar” se abre una modal completa con datos fiscales, contacto, dirección, condiciones de pago, estado y resumen de actividad. Clientes, Proveedores, Almacenes, Lugares de recogida y Productos usan también la ficha modal del CRM al seleccionar una fila.
- Preparación de pedidos incorpora el filtro rápido “Mañana” junto a “Hoy” y “Todos” en el panel de comandas y en el filtro del listado.
- El sidebar de escritorio se amplió a 280 px y el de tablet a 250 px; los títulos de grupo ahora tienen fondo, borde y contraste propios. El control lateral queda dentro del ancho del panel y se elimina el scroll horizontal innecesario.
- Los chevrons de los acordeones del sidebar usan una caja de 20 px centrada verticalmente para quedar alineados con el texto.
- En tablet, la barra de menú integra el usuario y su rol, ofrece el cierre de sesión dentro del propio menú y aumenta la tipografía de las opciones para facilitar el uso táctil; el usuario se oculta de la cabecera para evitar duplicidad.
- En tablet, el botón del menú se fija arriba a la derecha de la cabecera; al abrirlo, el panel aparece debajo y muestra dentro el usuario, su rol y el cierre de sesión.
- El texto visible del botón de tablet se sustituyó por un icono de hamburguesa de tres líneas; conserva etiqueta accesible y título de abrir/cerrar menú.
- El botón de menú tablet se redujo a un círculo de 48 px, separado de la línea roja superior; el usuario y “Cerrar sesión” quedan después de todas las secciones del panel.
- En tablet, el indicador de versión se trasladó al final del panel, después del bloque de usuario y cierre de sesión; en escritorio conserva su posición en el pie del sidebar.
- El menú tablet abre con los acordeones cerrados salvo la sección activa; se oculta la barra visual y el desplazamiento, cuando es imprescindible, queda confinado al panel.
- Se sustituyó el favicon genérico por un símbolo corporativo rojo con “E” blanca y se añadió una referencia versionada para evitar caché antigua; Vercel enruta el recurso estático al servidor de assets.
- Los listados comunes del CRM, contactos, usuarios, papelera, historial y tareas usan ahora `12 px` de texto, `7 px` de padding vertical y alturas reducidas; se conserva el scroll horizontal únicamente cuando la tabla necesita más columnas que el ancho disponible.
- El hover de las filas de los listados se reforzó con un fondo azul grisáceo claramente visible y una marca roja lateral; las filas eliminadas conservan su tratamiento de alerta.
- La nota de carga mantiene la tabla completa en escritorio y usa tarjetas de línea en tablet/móvil; se elimina el scroll horizontal y el hueco derivado de forzar 900 px de ancho.
- La columna Proveedor principal traduce `primary_supplier_id` al nombre del proveedor mediante el mismo lookup que `supplier_id`; si no existe relación muestra un guion, nunca el ID crudo.
- Pedidos incorpora la columna Facturación y el filtro “Sin facturar”/“Facturados”; las facturas agrupadas registran todos sus pedidos en `invoice_orders` y los pedidos ya facturados rechazan nuevos intentos.
- En cualquier viewport no escritorio, incluido móvil horizontal, el pie de versión se oculta cuando el menú está cerrado y se muestra dentro del panel como último elemento, después del usuario y el cierre de sesión.
- La ruta `/ocr` permanece desplegada como prototipo, pero su reconocimiento real queda aplazado y no se contabiliza como completado en el plan.
- La descarga de plantillas se comprobó con evento real de fichero en Playwright; el timeout previo queda acotado al navegador embebido.

## Higiene y restauración

- No quedan marcadores activos ni en papelera de las campañas ejecutadas (`__TEST`/`PW-`) en pedidos, notas, productos, movimientos, envíos, compras, presupuestos o cobros; también se retiraron restos antiguos QA/demo de preparación. Se conservaron las facturas `DEMO-*` del conjunto de demostración existente.
- La comprobación final dejó `0` diferencias de reservas de stock.
- Copia independiente previa a la campaña: `data/backups/turso-remote-before-functional-loop-2026-08-26T21-34-40-691Z.json`.
- Punto de restauración de código: `restore-before-functional-tests-2026-08-26`.
- Último despliegue validado: `dpl_DWLjwC3cWWbuMvVZfRCeKRE4Q5bj`, listo y aliasado en la URL estable; incluye la versión 2.0.19, el filtro de facturación y la relación persistente de facturas agrupadas.
- Despliegue único de esta entrega: `dpl_DWLjwC3cWWbuMvVZfRCeKRE4Q5bj`, `READY` y aliasado en la URL estable; incluye versión 2.0.19, filtro de pedidos sin facturar, bloqueo de duplicados y las mejoras visuales anteriores.

## Evidencias visuales

Las capturas de producción y los estados de fallo conservados están en `tests/screenshots/`, incluyendo `production-sections-documentos.png`, `production-document-template-preview.png`, `production-document-template-edit-restored.png`, `production-document-actions.png`, `production-document-download-success.png`, `production-invoice-preview.png`, `production-proforma-converted.png`, `production-ocr-review.png`, `production-ocr-saved.png`, `production-ocr-failed.png`, `production-return-created.png`, `production-users-permissions.png`, `production-commercial-permissions.png`, `production-commercial-role.png`, `production-warehouse-role.png`, `production-role-route-comercial.png`, `production-role-route-almacen.png`, `production-role-route-luis.png`, `production-touch-slow-loading.png`, `production-touch-slow-final.png`, `production-smart-purchasing-clean.png`, `production-long-name-decimals.png`, `production-sections-preparación-de-pedidos.png`, `production-preparation-backorder.png`, `production-warehouse-entry.png`, `production-warehouse-exit.png`, `production-stock-priority.png`, `production-purchase-received.png`, `production-expense-created.png`, `production-expense-attachment-saved.png`, `production-product-form-complete.png`, `production-product-form-confirmation.png`, `production-product-form-saved.png`, `production-grouped-billing-selected.png`, `production-grouped-billing-success.png`, `production-responsive-vertical-fixed.png`, `production-product-detail.png`, `production-product-label.png`, `production-expense-validation.png`, `notification-flow-deleted-filter.png`, `notification-flow-order-modal.png`, `notification-flow-history.png`, `stock-alert-modal-production.png`, `production-route-default-almacen.png`, `production-route-default-expense.png`, `production-route-final-almacen.png`, `production-route-final-expense.png`, `contact-modal-production.png`, `preparation-tomorrow-production.png`, `sidebar-map-order-desktop.png` y `sidebar-wide-tablet.png`. También se conservan las capturas de los fallos detectados durante el bucle. Las capturas locales recientes son `performance-local-home.png`, `v2-auth-home-desktop.png`, `v2-auth-stock-tablet.png`, `contact-modal-local.png`, `preparation-tomorrow-local.png` y `sidebar-wide-desktop.png`.
