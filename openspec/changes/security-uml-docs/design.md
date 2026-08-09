# Security UML Docs — Design

## Context

See proposal.md — Why. Estado actual del subsistema de seguridad (fuente de verdad):
- `src/lib/password.ts`: hash PBKDF2-SHA256, 100 000 iteraciones, key de 64 bytes, salt de 16 bytes; formato `pbkdf2_sha256$iteraciones$salt$hash`; verificación en tiempo constante.
- `src/lib/tokens.ts`: access token JWT HS256 con `sub`, `iat`, `exp` (15 min por defecto); refresh token opaco aleatorio de 48 bytes; `parseDuration` para TTLs.
- `src/lib/encoding.ts`: codificación base64url usada por password y tokens.
- `src/auth/middleware.ts`: `requireAuth` (valida access token y fija `userId`) y `requireAdmin` (valida token + rol `Administrador` vía `UsuarioRol`).
- `src/auth/router.ts`: `POST /auth/register`, `POST /auth/login` (bloqueo tras 5 intentos fallidos por 15 min), `POST /auth/refresh` (rotación: revoca la sesión usada y emite un par nuevo), `POST /auth/logout` (revoca sesión), `GET /auth/me` (protegido).
- Modelo: `USUARIO` (`contrasena_hash`, `intentos_fallidos_login`, `bloqueado_hasta`, `mfa_secreto`, `token_recuperacion`, `activo`), `SESION` (`refresh_token` único, `expira_en`, `revocado`), `ROL`/`PERMISO`/`USUARIO_ROL`/`ROL_PERMISO`.
- Los códigos de respuesta y flujos reales (401/403/423, rotación, bloqueo) deben reflejarse con exactitud.

## Goals / Non-Goals

**Goals:**
- Documentar el subsistema de seguridad con diagramas UML Mermaid renderizables que reflejen fielmente el comportamiento implementado.
- Cubrir los flujos de autenticación (registro, login, refresh, logout, acceso protegido) y las decisiones de seguridad clave.
- Mantener `src/` y `prisma/schema.prisma` como fuente de verdad; el documento es una vista derivada.

**Non-Goals:**
- No documentar módulos ajenos a la seguridad (catálogo, pagos, mensajería, etc.).
- No modificar código, configuración ni esquema.
- No instalar herramientas de generación automática de diagramas.
- No documentar la API completa (eso vive en OpenAPI/Swagger), solo los flujos de seguridad.

## Decisions

- **Ubicación y coherencia:** crear `docs/security.md` junto a `docs/database.md` y enlazarlo desde el README en una sección "Seguridad", siguiendo la estructura ya establecida para la documentación de base de datos.
- **Tipos de diagramas UML Mermaid:** se usan los que Mermaid soporta nativamente y cubren la petición:
  - `classDiagram` para el diagrama de clases (actores del modelo + módulos del código).
  - `sequenceDiagram` para los flujos de autenticación (registro, login, refresh, logout, acceso protegido).
  - `stateDiagram-v2` para el ciclo de vida de la sesión y los estados de la cuenta (bloqueo).
  - `flowchart` para los workflows de registro y login (diagramas de actividades simplificados), que en Mermaid no existe como tipo UML explícito.
  - `C4Context`/`useCase` no existen en Mermaid → los casos de uso se representan con un `flowchart` (gráfico dirigido actores→casos de uso), documentado como tal.
- **Secuencia del login con bloqueo:** modelar exactamente el flujo real: validar usuario existente (401), cuenta activa (403), bloqueo vigente (423 con `bloqueado_hasta`), verificar hash (401), en fallo incrementar intentos y bloquear al llegar a 5 por 15 min (reset a 0 tras bloqueo), en éxito resetear contadores y crear sesión (200).
- **Rotación de refresh token:** el diagrama de secuencia de `/auth/refresh` refleja que la sesión usada se marca `revocado = true` y se crea una nueva con refresh token distinto.
- **Convención de nombres:** en los diagramas se usan los nombres de archivo/módulo reales (`requireAuth`, `verifyAccessToken`, `hashPassword`, `crearSesion`) y las entidades de BD con su nombre `@@map` (mayúsculas).
- **Validación de sintaxis:** cada bloque Mermaid se valida con el parser oficial de Mermaid antes de darlo por terminado (mismo procedimiento que en `db-mermaid-docs`).
- **Idioma:** todo el contenido en español, acorde a las convenciones del proyecto.

## Risks / Trade-offs

- Divergencia entre el documento y el código si la lógica de seguridad cambia → Mitigación: declarar `src/` y `schema.prisma` como fuente de verdad en el propio documento y actualizarlo junto con cada cambio de seguridad.
- Mermaid no soporta diagramas UML de casos de uso → Mitigación: representarlos con `flowchart` y dejar una nota explícita de la equivalencia.
- Diagramas de secuencia extensos pueden quedar difíciles de leer → Mitigación: un diagrama por flujo (no combinarlos), con participantes minimizados (Cliente, API/Router, Middleware, DB).
- Errores de sintaxis Mermaid → Mitigación: validar cada diagrama con el parser oficial antes de finalizar.

## Migration Plan

No aplica (cambio de documentación). El documento se renderiza automáticamente al hacer commit del archivo.

## Open Questions

Ninguna.
