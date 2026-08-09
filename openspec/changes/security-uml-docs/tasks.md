# Security UML Docs — Tasks

## 1. Estructura del documento

- [x] 1.1 Crear el archivo `docs/security.md` con un encabezado que presente el subsistema de seguridad de MEG y declare `src/` y `prisma/schema.prisma` como fuente de verdad (vista derivada).
- [x] 1.2 Agregar una tabla de contenidos con las secciones de casos de uso, diagrama de clases, flujos (secuencia), workflows (actividades), estados y decisiones de seguridad.
- [x] 1.3 Redactar una nota de convenciones: nombres de módulos y funciones reales en los diagramas, entidades de BD con su `@@map` en mayúsculas, y equivalencias Mermaid-UML (los casos de uso se dibujan con `flowchart`).

## 2. Diagrama de casos de uso

- [x] 2.1 Crear el diagrama de casos de uso (`flowchart`) con los actores (Consumidor, Emprendedor/Negocio, Administrador, Sistema) y los casos de uso de autenticación/seguridad (registrarse, iniciar sesión, renovar sesión, cerrar sesión, consultar perfil, acceder a rutas protegidas, gestionar KYC/roles).
- [x] 2.2 Verificar que los casos de uso mapean a endpoints reales (`/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me`, rutas con `requireAdmin`).

## 3. Diagrama de clases

- [x] 3.1 Crear el `classDiagram` con las entidades de datos relevantes: `USUARIO`, `SESION`, `ROL`, `PERMISO`, `USUARIO_ROL`, `ROL_PERMISO` (atributos y relaciones de cardinalidad).
- [x] 3.2 Añadir al `classDiagram` los módulos de código del subsistema: `hashPassword`, `verifyPassword`, `signAccessToken`, `verifyAccessToken`, `randomRefreshToken`, `parseDuration`, `requireAuth`, `requireAdmin`, `crearSesion`, con su relación de uso (p.ej. router usa middleware y libs).

## 4. Diagramas de secuencia

- [x] 4.1 Diagrama de secuencia del registro (`POST /auth/register`): validación de correo único, hash de contraseña, creación de `USUARIO`, creación de sesión y respuesta 201 con tokens.
- [x] 4.2 Diagrama de secuencia del login (`POST /auth/login`): validar usuario (401), cuenta activa (403), bloqueo vigente (423), verificar hash, manejo de intentos fallidos con bloqueo a los 5 (15 min), reset en éxito, creación de sesión y respuesta 200.
- [x] 4.3 Diagrama de secuencia del refresco (`POST /auth/refresh`): validar sesión (401 si no existe/revocada/expirada), revocar la sesión usada (rotación) y emitir un par nuevo (200).
- [x] 4.4 Diagrama de secuencia del logout (`POST /auth/logout`): marcar la sesión como revocada y responder 200.
- [x] 4.5 Diagrama de secuencia de acceso a endpoint protegido con `requireAuth` y de acceso administrativo con `requireAdmin` (401 sin token, 401 token inválido, 403 sin rol administrador).

## 5. Workflows (diagramas de actividades)

- [x] 5.1 Workflow de registro (`flowchart`): datos → validar correo único → hash PBKDF2-SHA256 → crear usuario → crear sesión → tokens.
- [x] 5.2 Workflow de login (`flowchart`): credenciales → ramas de usuario inexistente, cuenta inactiva, cuenta bloqueada, contraseña inválida (con incremento de intentos y bloqueo) y éxito (reset de contadores + sesión).
- [x] 5.3 Workflow de renovación de sesión (`flowchart`): refresh token → validar vigencia → rotar sesión → nuevo par de tokens.

## 6. Diagramas de estados

- [x] 6.1 `stateDiagram-v2` del ciclo de vida de la sesión: Activa → (Rotada | Revocada | Expirada), y de vuelta a Activa solo vía rotación.
- [x] 6.2 `stateDiagram-v2` de la cuenta según intentos fallidos: Activa ↔ Bloqueada (5 intentos / 15 min) → Activa (login correcto o fin del bloqueo).

## 7. Decisiones de seguridad y validación

- [x] 7.1 Redactar la sección de decisiones de seguridad con justificación: PBKDF2-SHA256 (100 000 iteraciones, salt 16 bytes, comparación en tiempo constante), JWT HS256 de corta duración (15 min) con access token stateless, refresh token opaco de 48 bytes con rotación y revocación almacenada en `SESION`, y bloqueo de cuenta tras intentos fallidos.
- [x] 7.2 Enlazar `docs/security.md` desde el README en una nueva sección "Seguridad".
- [x] 7.3 Revisar que todos los flujos del código real (`src/auth/router.ts`, `src/auth/middleware.ts`, `src/lib/password.ts`, `src/lib/tokens.ts`) estén representados en al menos un diagrama y que los códigos de estado y condiciones sean exactos.
- [x] 7.4 Validar la sintaxis de cada diagrama Mermaid con el parser oficial y corregir errores.
- [x] 7.5 Ejecutar `npm run lint` para confirmar que no hay regresiones de formato/lint en el repo.

## 8. Mitigación de amenazas: Privilege Escalation y Lateral Movement

- [x] 8.1 Redactar la sección de mitigación de **Privilege Escalation**: el JWT no porta claims de rol (solo `sub`), la autorización se valida contra `USUARIO_ROL` en BD en cada request (`requireAdmin`), y el JWT firmado HS256 impide forjar/falsificar claims.
- [x] 8.2 Crear diagrama de secuencia de los vectores de escalada de privilegios: JWT falsificado con claim de rol (401 por firma inválida) y token válido de usuario normal en ruta admin (403 por `requireAdmin`).
- [x] 8.3 Crear diagrama de flujo de la decisión de `requireAdmin` (token → firma HS256 → rol Administrador en DB → 401/403/permiso).
- [x] 8.4 Redactar la sección de mitigación de **Lateral Movement**: rotación de refresh token (el usado se revoca), revocación por sesión en logout, tokens opacos de 48 bytes no adivinables y access token de corta duración.
- [x] 8.5 Crear diagrama de secuencia de reutilización de un refresh token ya rotado (la víctima rota → el atacante recibe 401).
- [x] 8.6 Crear diagrama de flujo de detección de movimiento lateral (token rotado / sesión revocada / expirado → 401).
- [x] 8.7 Actualizar la tabla de contenidos de `docs/security.md` con la nueva sección y validar la sintaxis de los diagramas Mermaid nuevos.
