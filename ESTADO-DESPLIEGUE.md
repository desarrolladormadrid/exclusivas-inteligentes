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
- Pendiente: que una nueva sesión de Codex cargue el servidor MCP y complete la autorización OAuth de Vercel.

## Próximos pasos

1. Comprobar la conexión con Vercel.
2. Enlazar este proyecto con Vercel.
3. Adaptar las llamadas actuales a `127.0.0.1:3001` para producción.
4. Mover la clave de Gemini al servidor y eliminarla del código del navegador.
5. Configurar las variables de Turso y Gemini en Vercel.
6. Crear despliegue de prueba y validar login, CRUD, pedidos, stock, documentos y asistente.

## Verificación actual

- Compilación correcta.
- Pruebas automáticas: 2/2 correctas.
- Navegación local comprobada sin errores de consola.
