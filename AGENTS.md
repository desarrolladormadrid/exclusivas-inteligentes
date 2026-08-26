# Criterios de producto y UX de Excluvas Inteligentes

Estas reglas recogen las decisiones de diseño y funcionamiento acordadas con el usuario. Deben aplicarse a toda la aplicación, no solo a una sección.

## Principios visuales

- Priorizar los listados y la información operativa; las cabeceras deben ser simples, compactas y no ocupar espacio innecesario.
- Aprovechar el ancho disponible: título, contexto, filtros y acciones deben compartir una sola fila cuando quepan; evitar filas vacías y saltos innecesarios en todas las secciones.
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
- En una nota de carga la ubicación de picking es editable para corregir errores del almacén; el cambio se valida con formato letra-número, se guarda en la ficha del producto y deja historial con usuario, fecha y origen “Nota de carga”. Debe mostrarse como columna independiente y sin badges decorativos que oculten el dato.
- Los cambios operativos editables en una nota de carga deben agruparse en un único botón rojo “Guardar cambios” abajo a la derecha, con estado visible de “Guardando…”; no depender de guardar por fila ni únicamente al perder el foco.

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
- Después de cada cambio comunicar claramente su estado: “solo en local”, “desplegado en producción” o “pendiente de despliegue”. Si está en producción, incluir la URL estable y las comprobaciones realizadas.

## Revisión proactiva antes de entregar cambios

Antes de dar por terminada una sección o una mejora, revisar también estos puntos aunque el usuario no los mencione expresamente:

- Detectar y eliminar títulos, subtítulos, paneles, filtros o acciones duplicadas que expresen lo mismo. La cabecera debe ser compacta y el contenido operativo debe tener prioridad.
- Optimizar el espacio de cada cabecera: si un texto repite el valor que ya muestran un selector, una fecha o un botón (por ejemplo, “Hoy · fecha”), eliminar la repetición y colocar los controles en una única línea compacta y bien alineada.
- Revisar siempre la densidad visual antes de entregar una vista: aprovechar el ancho disponible, reducir alturas vacías y reservar el espacio principal para listados, tarjetas y acciones de trabajo.
- Comprobar que al plegar un sidebar, acordeón o panel el espacio liberado lo ocupa realmente el contenido; nunca debe quedar una franja vacía ni mantenerse un margen antiguo.
- Revisar todas las vistas en escritorio, tablet horizontal, tablet vertical y móvil. No basta con que el contenido quepa: debe poder usarse, leerse y desplazarse sin solapamientos ni recortes.
- Verificar que las tarjetas, tablas, modales, notas y mensajes largos hacen salto de línea y que las acciones importantes siguen visibles.
- Comprobar que cada botón, enlace, notificación y tarjeta abre el detalle correcto sin cambiar innecesariamente de sección ni perder el contexto.
- Revisar que los nombres de títulos, botones, estados, columnas y campos describen exactamente la acción o el dato real; evitar textos genéricos, ambiguos o redundantes.
- Validar la semántica de los datos: unidades, cantidades, importes, fechas, estados, stock, reservas e incidencias deben ser comprensibles y coherentes entre listados, detalles y panel de inicio.
- Buscar valores imposibles o engañosos antes de mostrar la interfaz, como `NaN`, `[object Object]`, ceros por defecto que no significan nada, fechas en formato incorrecto o registros vacíos presentados como resultado definitivo.
- En cualquier carga asíncrona mostrar un estado de carga claro y no mostrar “sin registros” hasta recibir una respuesta válida. Las acciones rápidas no deben bloquear toda la pantalla si no es necesario.
- Comprobar que los controles tienen un comportamiento evidente: búsquedas incrementales, borrado de selección, ordenación desde cabeceras, filtros persistentes cuando proceda y botones activos claramente diferenciados.
- Revisar que los estados visuales usan una convención única: rojo para atención o error, naranja para aviso, verde para correcto y gris para neutral; no usar colores que parezcan error para acciones normales.
- Probar recorridos completos y no solo pantallas aisladas: crear, abrir, editar, guardar, cancelar, eliminar/restaurar, filtrar, descargar y resolver incidencias cuando existan.
- Si una acción puede fallar por datos o configuración, mostrar un mensaje útil dentro de la interfaz y conservar el contexto; no depender de `alert()` del navegador ni dejar botones que parezcan no hacer nada.
- Comparar siempre secciones relacionadas después de un cambio. En especial, los contadores y estados del inicio deben coincidir con Preparación de pedidos, Pedidos, Stock, Notas y Notificaciones.
