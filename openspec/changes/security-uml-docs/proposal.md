# Security UML Docs

## Why

El backend de MEG ya implementa un subsistema de seguridad completo (hash PBKDF2-SHA256, JWT HS256 con refresh token rotativo, bloqueo por intentos fallidos, middleware `requireAuth`/`requireAdmin`), pero no existe documentación visual que explique cómo funciona, qué flujos de autenticación existen y cómo se protegen los endpoints. Tras documentar la base de datos en `docs/database.md`, la parte de seguridad es el siguiente módulo crítico que el equipo necesita entender (y auditar) de forma visual con diagramas UML en Mermaid.

## What Changes

- Crear `docs/security.md` con documentación de seguridad en español usando diagramas UML de Mermaid:
  - **Diagrama de casos de uso** (UML) con actores (Consumidor, Emprendedor/Negocio, Administrador, Sistema) y los casos de uso de autenticación/seguridad.
  - **Diagrama de clases** (UML) del subsistema de seguridad: `Usuario`/`Sesion`/`Rol`/`Permiso` (modelo de datos) junto a los módulos de código (`hashPassword`, `verifyPassword`, `signAccessToken`, `verifyAccessToken`, `requireAuth`, `requireAdmin`, `crearSesion`).
  - **Diagramas de secuencia** (UML) para: registro, login, refresco de sesión (rotación de refresh token), logout y acceso a endpoint protegido con `requireAuth`/`requireAdmin`.
  - **Diagrama de actividades** para el workflow de login (con bloqueo por 5 intentos fallidos/15 min) y el workflow de registro.
  - **Diagramas de estados** (UML): ciclo de vida de la sesión (activa → rotada/revocada/expirada) y estados de la cuenta respecto a intentos fallidos (activa → bloqueada → desbloqueada).
  - Sección de decisiones de seguridad con su justificación: PBKDF2-SHA256 (100k iteraciones, salt 16 bytes), JWT HS256 de corta duración (15m), refresh tokens opacos de 48 bytes con rotación y revocación, comparación de hashes en tiempo constante.
  - Declaración de que `src/` y `prisma/schema.prisma` son la fuente de verdad y el documento es una vista derivada.
- Enlazar la nueva documentación desde el README en una sección de "Seguridad".
- Sin cambios de código, API, esquema de datos ni comportamiento del sistema.

## Capabilities

### New Capabilities
- Ninguna: cambio de documentación puro, sin comportamiento de sistema. Se usa `skip_specs: true`.

### Modified Capabilities
- Ninguna: no cambian requerimientos existentes.

## Impact

- **Archivos nuevos:** `docs/security.md` (documentación con diagramas UML Mermaid).
- **Archivos modificados:** `README.md` (enlace a la documentación en una sección de seguridad).
- **Fuentes de referencia (solo lectura):** `src/auth/`, `src/lib/password.ts`, `src/lib/tokens.ts`, `src/lib/encoding.ts`, `src/types.ts`, `prisma/schema.prisma`.
- **Dependencias:** ninguna nueva; los diagramas Mermaid se renderizan de forma nativa en GitHub/GitLab y editores Markdown.
