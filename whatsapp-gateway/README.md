# Gateway local de WhatsApp

Este proceso conecta una sesión de WhatsApp Web mediante OpenWA con la bandeja de WhatsApp de Exclusivas Inteligentes. Es un conector local y no forma parte del despliegue de Netlify.

## Estado actual

- Recibe mensajes privados de texto.
- Recibe notas de voz y guarda el audio en la conversación del CRM.
- Identifica al cliente por su número cuando existe coincidencia.
- Marca cada mensaje como `Pendiente de interpretación` y requiere revisión humana.
- No crea pedidos ni envía respuestas automáticas todavía.

## Arranque local

1. Asegúrate de que el API local del CRM está escuchando en `http://127.0.0.1:3001`.
2. Copia `.env.example` como `.env`.
3. Ejecuta `npm install` dentro de esta carpeta.
4. Ejecuta `npm run doctor` para comprobar la conexión con el CRM.
5. Ejecuta `npm start` y escanea el QR desde WhatsApp → Dispositivos vinculados.
6. Escribe un mensaje de prueba desde otro teléfono y comprueba la bandeja de WhatsApp del CRM.

La sesión queda vinculada a `OPENWA_SESSION_ID`. Usa un número de prueba separado del número personal o principal.

## Relación con OpenCode

OpenCode puede utilizarse en ese ordenador para mantener y mejorar el agente de interpretación, pero no debe ser el proceso que mantiene WhatsApp conectado. El proceso permanente es este gateway local de OpenWA. Si el CRM local y el gateway están en ordenadores distintos, `CRM_API_BASE_URL` debe apuntar a una dirección de red privada y protegida; no se debe publicar la API SQLite directamente en Internet.

El primer arranque requiere una única intervención: escanear el QR desde WhatsApp → Dispositivos vinculados. Después, el gateway recibe textos y audios y los deja en la bandeja del CRM como pendientes.

## Siguiente bloque

El siguiente paso será añadir el agente de interpretación con herramientas cerradas: buscar cliente, buscar producto, consultar stock, preparar pedido y pedir confirmación. Hasta que ese bloque se pruebe, el gateway no modifica pedidos.
