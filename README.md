# meg-backend

## Requisitos

- Node.js 24+
- npm
- Cuenta de Cloudflare (para `deploy` y migraciones remotas)

## Setup

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Crear el archivo `.dev.vars` en la raíz (no se versiona; `.gitignore` lo excluye):

   ```bash
   JWT_SECRET="<genera-un-secreto-aleatorio>"
   ```

   `JWT_SECRET` es un secreto: se inyecta como binding de secretos de Wrangler y nunca debe quedar en un archivo versionado. El resto de la configuración no sensible (`JWT_EXPIRES_IN`, `REFRESH_TOKEN_TTL`, `DATABASE_URL`) ya viene en `wrangler.jsonc`.

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

  > **Antes del primer deploy**, inyecta el secreto en producción (los bindings de secretos no viajan en el repo ni en el deploy):
  >
  > ```bash
  > wrangler secret put JWT_SECRET
  > ```
  >
  > Sin él, los endpoints de autenticación fallan de forma cerrada (no emiten ni validan tokens).
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
Después de ejecutar el anterior comando

## Base de datos

El modelo de datos completo (entidades, relaciones, enums y restricciones) está documentado con diagramas ER en Mermaid en [`docs/database.md`](docs/database.md). La fuente de verdad del esquema es `prisma/schema.prisma`.

## Seguridad

El subsistema de seguridad (autenticación, sesiones, control de acceso y mitigación de amenazas) está documentado con diagramas UML en Mermaid en [`docs/security.md`](docs/security.md).
