# meg-backend

## Requisitos

- Node.js 20+
- npm
- Cuenta de Cloudflare (para `deploy` y migraciones remotas)

## Setup

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Crear el archivo `.env` en la raíz:

   ```bash
   DATABASE_URL="file:./dev.db"
   JWT_SECRET="<genera-un-secreto-aleatorio>"
   JWT_EXPIRES_IN="15m"
   REFRESH_TOKEN_TTL="30d"
   ```

3. Aplicar las migraciones a la base de datos local (D1):

   ```bash
   npm run cloudflare-db-local
   ```

4. Levantar el servidor en desarrollo:

   ```bash
   npm run dev
   ```

## Otros comandos

- Aplicar migraciones a la base remota: `npm run cloudflare-db-remote`
- Desplegar a Cloudflare Workers: `npm run deploy`
- Generar/sincronizar los tipos de tu configuración de Worker: `npm run cf-typegen`

   ```ts
   // src/index.ts
   const app = new Hono<{ Bindings: CloudflareBindings }>()
   ```

- Ejecutar tests: `npm test`
- Lint: `npm run lint`
- Documentación swagger: `npm run docs`

Para ver la documentación abre directamente:
  http://localhost:5173/docs
