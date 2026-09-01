# Estado del despliegue de Exclusivas Inteligentes

## Proyecto

- Proyecto local: `C:\codex_desarrollos\Excluvas Inteligentes`
- Frontend local: `http://localhost:3000`
- API local: `http://127.0.0.1:3001`
- Base de datos configurada para Turso mediante `DATABASE_MODE=remote`.

## Vercel

- Vercel MCP instalado globalmente para Codex.
- Configuración: `C:\Users\luis.vazquez\.codex\config.toml`
- Servidor: `https://mcp.vercel.com`
- Proyecto enlazado: `exclusivas-inteligentes`.
- URL estable: `https://exclusivas-inteligentes.vercel.app`
- Estado: pendiente de publicar la entrega actual `2.0.44`.
- Último despliegue verificado: `2.0.43`, listo y aliasado en la URL estable.
- Versión preparada: `2.0.44`.

## Próximos pasos

1. Decidir una implementación real de OCR cuando se retome ese alcance.
2. Valorar Vercel Pro o un programador externo si se necesita copia automática cada 12 horas; el plan Hobby solo permite una ejecución diaria.
3. Revisar progresivamente las incidencias heredadas del lint global.

## Entrega no web 2.0.44

- Mapa integrado en las fichas de entrega y rutas, con radio operativo configurable por defecto a 150 metros.
- Planificador de rutas para seleccionar envíos geolocalizados, ordenar paradas por proximidad y abrir la ruta en Google Maps.
- Varias direcciones de entrega mediante Lugares de recogida vinculados al cliente.
- Snapshots comprimidos de Turso con histórico, descarga, creación manual y restauración controlada.
- Tarea automática de copia diaria compatible con el plan Hobby de Vercel.

## Verificación actual

- Compilación correcta.
- Pruebas automáticas y navegación local comprobadas.
- Producción comprobada: `/`, `/almacen`, `/comercial`, `/crm` y los endpoints de resumen/listados responden correctamente; la vista principal carga sin error bloqueante.
- Rendimiento comprobado: Productos compactos 510 KB frente a 2,20 MB completos (77% menos); Inicio usa una única llamada `/api/summary`.
- Entrega `2.0.22` publicada y verificada en producción: tablero de almacén reorganizado con prioridades visibles, filtros de preparación, exportación mediante icono y rejilla adaptable sin huecos vacíos, además de la vista `/comercial` para tablet.
- Entrega `2.0.23` publicada y verificada en producción: accesos directos con iconos a `/comercial` y `/almacen` desde el CRM, también disponibles en el menú tablet/móvil y limitados por permisos.
- Entrega `2.0.24` publicada y verificada en producción: tipografía operativa ampliada aproximadamente un 30% en el panel y listados, ficha completa de pedidos comerciales con sus líneas y acciones, y filtros por texto, cliente, rango de fechas, estado y facturación.
- Entrega `2.0.25` publicada y verificada en producción: nueva web pública `/web` con catálogo responsive, enlaces al portal de pedidos y formularios de alta de clientes/proveedores; las solicitudes quedan pendientes de validación en el CRM como nota y notificación, con migración de la tabla remota aplicada.
- Entrega `2.0.27` publicada y verificada en producción: la web pública oculta los precios internos, comunica ofertas y descuentos para profesionales, muestra ventajas del registro y utiliza imágenes editoriales locales en las tarjetas del catálogo; verificado sin errores de imagen ni desbordamiento horizontal.
- Entrega `2.0.28` publicada y verificada en producción: acceso directo con icono de globo a `/web` desde la barra superior del CRM y desde el menú tablet/móvil, respetando permisos y navegación a la web pública.
- Verificación funcional responsive de `2.0.24`: menú tablet con accesos operativos y versión al final, listado comercial sin desbordamiento horizontal y ficha de pedido comprobada con 5 líneas reales cargadas.
- Sidebar de producción comprobado: 280 px en escritorio, sin scroll horizontal, menú tablet sin solapamientos y consola limpia.
