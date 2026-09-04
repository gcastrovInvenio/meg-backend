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

  > **Antes del primer deploy**, crea el bucket R2 de imágenes (los buckets no viajan en el repo ni en el deploy):
  >
  > ```bash
  > wrangler r2 bucket create meg-images
  > ```
  >
  > El binding `IMAGES` de `wrangler.jsonc` apunta a `meg-images`. Sin el bucket, los endpoints `POST /uploads` y `GET /uploads/{key}` fallan al interactuar con R2.
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

El playbook de pruebas de penetración (fases, herramientas, criterios de aceptación y ciclo de vida de hallazgos) está en [`docs/pentest-playbook.md`](docs/pentest-playbook.md).

## Escaneo de vulnerabilidades (Snyk)

El repositorio escanea vulnerabilidades con Snyk en paralelo a Docker Scout: **dependencias npm** (`snyk test`) y **código fuente** (`snyk code test`, SAST), con umbral `--severity-threshold=high`.

### Local

1. Instalar la CLI y autenticarse:

   ```bash
   npm install -g snyk
   snyk auth <SNYK_TOKEN>
   ```

2. Ejecutar el escaneo (dependencias + código + imagen Docker Scout):

   ```bash
   ./vuln-scanner.sh
   ```

   Genera `snyk-deps-report.txt` y `snyk-code-report.txt` (gitignored). Si la CLI no está instalada o no hay sesión, el script falla con las instrucciones; no produce reportes vacíos.

### CI

El workflow `.github/workflows/snyk.yml` corre en cada PR, push a `main`, `workflow_dispatch` y semanalmente (lunes 06:00 UTC). Bloquea severidades altas/críticas y publica el resumen como comentario en el pull request.

**Requisito previo:** configura el token como secreto del repositorio (Settings → Secrets → Actions → `SNYK_TOKEN`). Sin él, el workflow falla al autenticar contra Snyk. El token nunca se referencia desde archivos versionados.
