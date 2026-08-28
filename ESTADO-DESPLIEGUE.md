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
- Estado: desplegado en producción el 28/08/2026.
- Último despliegue: `dpl_A4uNDLGoDC4dJhRQcxppSULoS5uc`, listo y aliasado en la URL estable.
- Versión publicada: `2.0.20`.

## Próximos pasos

1. Decidir una implementación real de OCR cuando se retome ese alcance.
2. Revisar progresivamente las incidencias heredadas del lint global.

## Verificación actual

- Compilación correcta.
- Pruebas automáticas y navegación local comprobadas.
- Producción comprobada: `/`, `/almacen`, `/comercial`, `/crm` y los endpoints de resumen/listados responden correctamente; la vista principal carga sin error bloqueante.
- Rendimiento comprobado: Productos compactos 510 KB frente a 2,20 MB completos (77% menos); Inicio usa una única llamada `/api/summary`.
- Entrega `2.0.20` publicada y verificada en producción: nueva vista `/comercial` para tablet, resumen operativo, pedidos, clientes, visitas, alta guiada de pedidos y acceso al CRM completo para administradores, además de las mejoras visuales anteriores.
- Sidebar de producción comprobado: 280 px en escritorio, sin scroll horizontal, menú tablet sin solapamientos y consola limpia.
