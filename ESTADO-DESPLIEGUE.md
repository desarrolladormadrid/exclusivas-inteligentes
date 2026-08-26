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
- Estado: desplegado en producción el 26/08/2026.

## Próximos pasos

1. Adaptar las llamadas actuales a `127.0.0.1:3001` para producción, si el entorno lo requiere.
2. Mover la clave de Gemini al servidor y eliminarla del código del navegador.
3. Configurar o verificar las variables de Turso y Gemini en Vercel.
4. Completar la validación funcional integral en producción.

## Verificación actual

- Compilación correcta.
- Pruebas automáticas y navegación local comprobadas.
- Producción comprobada: `/` y `/portal-pedidos` responden correctamente; la vista principal carga sin error bloqueante.
