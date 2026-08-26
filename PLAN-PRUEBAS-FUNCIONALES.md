# Plan de pruebas funcionales — Excluvas Inteligentes

## Objetivo

Detectar, por cada sección, funciones que falten, acciones que no puedan completarse y errores de datos, permisos, navegación o interfaz. Las pruebas deben recorrer la operación real, no limitarse a comprobar que una pantalla carga.

## Reglas de ejecución

- Ejecutar primero en local y usar datos de prueba identificables (`PW-TEST-*`), eliminándolos o dejándolos marcados al terminar.
- Cada sección se prueba con el rol que realmente la utilizará: administración, comercial, almacén y portal/web.
- En cada recorrido comprobar: carga, estado vacío, búsqueda, filtros, ordenación, abrir detalle, crear, editar, guardar, cancelar, eliminar/recuperar, errores de validación y coherencia con las secciones relacionadas.
- Cada prueba visual debe guardar una captura y mostrarla renderizada en el chat. Si aparece un fallo, guardar y mostrar también su captura.
- No considerar una sección cerrada solo porque pase la API: debe pasar el recorrido Playwright y la revisión visual.
- Mantener los cambios en local hasta cerrar un bloque completo. Desplegar normalmente después de 3–4 cambios relacionados o cuando el usuario lo indique expresamente.

## Criterios de resultado

- **PASS**: recorrido completo, datos persistidos, destino correcto, sin errores de consola ni estados engañosos y evidencia visual disponible.
- **FAIL**: no se puede completar una acción, se pierde información, se abre el registro equivocado, la vista se solapa/corta o los contadores/datos no coinciden.
- **BLOCKED**: la prueba depende de un permiso, servicio o dato externo no disponible. Documentar el bloqueo y completar las validaciones no dependientes.

## Bloque A — Acceso, rutas e inicio

### A1. Autenticación y permisos

- Entrar con cada rol disponible y comprobar módulos permitidos.
- Contraseña incorrecta, cierre de sesión, recordar sesión y recarga.
- Verificar que una URL directa no permite acceder a módulos no autorizados.
- Confirmar que el usuario y cerrar sesión están disponibles desde el menú.

### A2. Rutas independientes

- `/crm`: inicio y gestión completa.
- `/comercial`: pedidos y herramientas comerciales.
- `/almacen`: preparación, stock y operaciones de almacén.
- `/web`: inicio/portal web.
- Comprobar que cada ruta carga su componente y alcance previsto, conserva la sesión y no muestra accidentalmente todo el CRM.

### A3. Inicio y notificaciones

- Cargar contadores y estados; compararlos con Pedidos, Preparación, Stock, Notas e Incidencias.
- Abrir una notificación de pedido y llegar al pedido exacto en modal.
- Abrir una incidencia y llegar a su detalle y acciones.
- Marcar una notificación, marcar todas, cerrar y reabrir bandeja.
- Confirmar que lo leído desaparece de pendientes pero permanece en historial.

## Bloque B — Maestros y catálogo

### B1. Productos

- Listado: búsqueda, filtros de código, proveedor y eliminados; ordenación y columnas.
- Alta con todos los campos obligatorios, valores por defecto, proveedor buscable y alta de proveedor desde modal.
- Validación de importes, fechas, categoría, almacén, ubicación y trazabilidad.
- Previsualización y confirmación del producto.
- Foto, QR, código de barras, descargas y ficha de detalle.
- Edición de todos los campos, guardado y persistencia tras recarga.
- Comprobar que el cambio de ubicación se refleja en preparación y notas de carga.

### B2. Clientes

- Alta, edición, búsqueda y eliminación/recuperación.
- Ubicaciones del cliente: crear desde cliente y desde pedido.
- Validar que un pedido puede seleccionar la ubicación correcta.

### B3. Proveedores

- Alta desde su sección y desde crear producto.
- Búsqueda por nombre, NIF, teléfono y email.
- Edición, relación con productos/ofertas y persistencia.

### B4. Almacenes y lugares de recogida

- Alta, edición, selección en producto y pedido.
- Validar que almacén, ubicación y lugar de entrega no se mezclan.

## Bloque C — Ventas y documentos

### C1. Pedidos

- Crear pedido con cliente, ubicación, fechas y solicitante automático.
- Buscar y añadir varias líneas de producto.
- Probar unidades, formatos, factores, cantidades, descuentos, IVA e importes.
- Guardar, editar, bloquear, posponer, reactivar, anular y consultar detalle.
- Confirmar estados y contadores en Inicio y Preparación.
- Probar pedido enviado: no debe permitir edición indebida.

### C2. Presupuestos

- Crear, editar, añadir varias líneas, calcular totales y consultar detalle.
- Convertir o relacionar con pedido si la función está disponible.

### C3. Albaranes, envíos y preparación

- Crear/consultar albarán relacionado con el pedido.
- Generar o abrir nota de carga desde el pedido.
- Preparar línea completa e incompleta.
- Registrar incidencia con producto y unidades faltantes.
- Autorizar envío parcial, cancelar faltante o crear reposición.
- Verificar estados, notas, historial y contadores.

### C4. Facturas y cobros

- Facturación individual y agrupada por cliente y rango de fechas.
- Excluir pedidos ya facturados y comprobar líneas, base, IVA y total.
- Proforma, edición, estados, descarga/impresión si existe.
- Registrar cobro y comprobar estado y balance.

### C5. Devoluciones y abonos

- Crear devolución vinculada a cliente/pedido/factura.
- Calcular unidades e importe, cambiar estado y consultar trazabilidad.

## Bloque D — Almacén y compras

### D1. Stock y movimientos

- Consultar stock físico, reservado, requerido, saldo, mínimo y estado.
- Ordenar prioridad: sin stock, bajo mínimo y disponible.
- Crear entrada, salida, ajuste positivo, ajuste negativo y devolución.
- Confirmar que los movimientos modifican el stock y no generan `NaN` ni saldos falsos.

### D2. Compras a proveedores

- Crear y editar pedido de compra.
- Comparar ofertas y coste real calculado.
- Validar proveedor, cantidades, mínimo, transporte, rappel y plazo.
- Recibir compra y comprobar su efecto en stock y costes.

### D3. Gastos y tickets

- Alta con importe, categoría, fecha y proveedor.
- Adjuntar imagen/PDF, visualizar, editar y eliminar/recuperar.
- Comprobar reflejo en compras, balance y auditoría.

## Bloque E — Notas, administración y configuración

### E1. Notas y tareas

- Crear nota normal, importante e incidencia.
- Abrir desde Inicio y desde notificación.
- Completar, editar, conservar historial y comprobar contadores.

### E2. Documentos y plantillas

- Abrir plantilla, previsualizar variables, editar, guardar, descargar e imprimir.
- Confirmar que el texto no se corta y que no se pierden cambios.

### E3. Auditoría, papelera y ajustes

- Revisar registros de auditoría tras crear/editar/eliminar.
- Eliminar y recuperar desde papelera; eliminar definitivamente solo con confirmación.
- Revisar ajustes, usuarios, permisos y configuración del asistente.

## Bloque F — Pruebas transversales

- Cliente → pedido → líneas → preparación → incidencia → resolución → albarán/factura → cobro.
- Proveedor → producto → compra → recepción → stock.
- Producto → cambio de ubicación → nota de carga → preparación.
- Notificación → modal de registro exacto → marcar leída → historial.
- Recarga del navegador durante cada flujo y comprobación de persistencia.
- Nombres largos, varios registros, campos vacíos, datos duplicados, importes con decimales y respuestas lentas.
- Escritorio, tablet horizontal, tablet vertical y móvil; comprobar lectura, foco, teclado/tacto, scroll interno y modales.

## Automatización prevista

1. Mantener las pruebas de render y API existentes.
2. Crear un spec Playwright por bloque, reutilizando autenticación, datos de prueba, captura de éxito y captura de fallo.
3. Añadir aserciones de persistencia después de recargar.
4. Ejecutar localmente el bloque modificado y después la regresión completa.
5. Registrar cada resultado en una tabla de ejecución con fecha, rol, ruta, caso, resultado, incidencia, captura y corrección.

## Estrategia de despliegue

- No desplegar por cada ajuste.
- Cerrar y probar primero un bloque local completo.
- Agrupar normalmente 3–4 cambios del mismo bloque.
- Hacer un único despliegue por bloque aprobado o cuando el usuario lo solicite.
- Tras desplegar: comprobar URL estable, endpoints, flujo afectado, consola y captura de producción visible en el chat.
- Si Vercel limita los despliegues, conservar el bloque probado en local y documentar el pendiente sin repetir publicaciones.

## Orden recomendado

1. Acceso, rutas, inicio y notificaciones.
2. Productos, clientes, proveedores y almacenes.
3. Pedidos y documentos de venta.
4. Preparación, incidencias, stock y ubicaciones.
5. Compras, gastos y cobros.
6. Plantillas, auditoría, papelera, permisos y regresión transversal.
