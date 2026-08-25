# Criterios de producto y UX de Excluvas Inteligentes

Estas reglas recogen las decisiones de diseño y funcionamiento acordadas con el usuario. Deben aplicarse a toda la aplicación, no solo a una sección.

## Principios visuales

- Priorizar los listados y la información operativa; las cabeceras deben ser simples, compactas y no ocupar espacio innecesario.
- Mantener una interfaz profesional, sobria, cuadrada y homogénea: sin bordes redondeados, sin efectos llamativos y con controles alineados.
- Usar el rojo corporativo para acciones principales y estados de atención; usar verde para correcto/completado y naranja para avisos o estados próximos al mínimo.
- No mezclar alineaciones sin motivo: etiquetas, datos y acciones deben seguir una retícula clara, preferentemente alineada a la izquierda.
- Eliminar duplicidades: si existe un botón principal de crear, no repetir debajo una acción equivalente.
- Los nombres deben describir la acción real: “Crear pedido”, “Crear cliente”, “Crear nota”, etc.; evitar textos genéricos como “Crear registro”.
- Las fechas visibles se muestran en formato español `dd/mm/aaaa` y, cuando proceda, con hora.
- Los campos obligatorios se marcan con asterisco rojo. Los campos no obligatorios no deben parecer obligatorios.

## Formularios, modales y tablas

- Unificar todas las creaciones y ediciones en modales coherentes, con título específico, campos bien agrupados y botón de guardar abajo a la derecha.
- En modales largas, bloquear el scroll de la página de fondo y permitir el scroll dentro de la modal; cerrar al pulsar fuera cuando no haya cambios sin guardar.
- En formularios largos usar acordeones para datos generales y mostrar en la cabecera un resumen y un indicador de completitud.
- Los pedidos, presupuestos, facturas y albaranes deben admitir líneas de productos claras, con buscador, tipo de unidad, cantidad, unidades totales y suma visible.
- Los selectores de clientes y productos deben permitir búsqueda incremental y borrar la selección correctamente.
- Las tablas deben ofrecer búsqueda en columnas principales, contadores de registros, columnas configurables y ordenación al pulsar en cabeceras cuando sea aplicable.
- La edición inline solo debe afectar a la fila seleccionada, nunca a todas las filas.
- Al cargar datos mostrar un loading real; no mostrar “no hay registros” hasta recibir respuesta.
- Al abrir un registro desde una tarjeta, notificación o listado, abrir el detalle en modal sin cambiar la sección que queda detrás.

## Pedidos, almacén y stock

- El pedido nuevo empieza en estado “Nuevo” y el código se autogenera.
- Los campos esenciales del pedido son cliente, lugar de envío y fechas necesarias; el usuario solicitante se rellena automáticamente con el usuario actual.
- El lugar de envío se selecciona entre las ubicaciones del cliente y debe poder crearse una nueva ubicación desde el pedido.
- La preparación usa hojas de carga y debe ser la fuente común de los contadores y acordeones del inicio.
- Preparación de pedidos debe mostrar por defecto el día seleccionado/hoy, con tarjetas tipo comanda y estados claros: pendiente, en preparación, completado y con incidencia.
- Las líneas de preparación muestran producto, ubicación de almacén destacada, tipo de unidad, cantidad solicitada, cantidad preparada editable y estado.
- Si la cantidad preparada coincide con la solicitada, la línea es “Completo”; si es menor, “Incompleto” y debe poder registrar incidencia con producto y unidades faltantes.
- Las incidencias deben crear nota y notificación, incluir fecha, cliente, dirección de envío y persona que la registra, y permitir resolver/autorizarlas desde su detalle.
- Stock debe distinguir claramente: stock en almacén, requerido por pedidos, saldo para cubrir pedidos, stock mínimo y estado. Los saldos negativos se muestran en rojo solo en el número; estado al final, antes de acciones.
- El estado de stock debe poder ordenarse y priorizar “Sin stock”, seguido de “Bajo mínimo” y después “Disponible”.
- Las ubicaciones de producto siguen la nomenclatura letra-número, por ejemplo `B-126`, y las notas de carga se ordenan por ubicación.

## Coherencia de datos

- Un mismo concepto debe usar la misma fuente en todas las secciones. En particular, el inicio y Preparación de pedidos deben coincidir en número, fechas y estados.
- No presentar datos de prueba, objetos JavaScript (`[object Object]`) o valores vacíos como si fueran información real.
- Los documentos deben mostrar sus líneas, cantidades, importes, base imponible, IVA y total cuando corresponda.
- Las acciones deben respetar el flujo: un pedido puede editarse mientras no esté enviado; una incidencia debe dejar trazabilidad de la resolución.

## Asistente

- El asistente solo debe afirmar que puede ejecutar una operación si existe un ejecutor real para ella.
- Debe entender lenguaje natural, consultar primero los datos necesarios, usar nombres visibles en vez de pedir IDs al usuario y pedir confirmación antes de acciones sensibles.
- Sus respuestas deben ser claras y centradas en el CRM; no inventar conversaciones, nombres, estados ni capacidades.
- Si no puede realizar algo, debe explicar el motivo concreto y ofrecer el siguiente paso útil.

## Responsive y tablet

- El responsive móvil y tablet es prioritario: el sidebar debe seguir siendo accesible, el contenido no puede quedar cortado y las modales deben poder desplazarse internamente.
- “Pedido desde tablet” debe compartir campos, validaciones y comportamiento con “Nuevo pedido”, adaptado a una experiencia de ruta comercial.
- En tablet, los datos generales del pedido deben poder colapsarse para dejar visible y cómoda la lista de productos.
- La creación de líneas debe tener una maquetación estable en tablet, sin solapamientos ni campos huérfanos.

## Verificación y despliegue

- Después de cada cambio relevante ejecutar `npm test` y comprobar carga, consola e interacciones principales cuando sea posible.
- Antes de desplegar comprobar que la información mostrada coincide entre secciones y que no hay estados de carga engañosos.
- Publicar los cambios agrupados cuando Vercel permita el despliegue; si el límite diario bloquea Vercel, dejar el código probado localmente y comunicarlo claramente.
