## Context

- `src/users/router.ts` actualmente expone solo `GET /users/{id}` (público). Los endpoints de autenticación (`/auth/*`) ya implementan `requireAuth`, hash PBKDF2-SHA256 (`src/lib/password.ts`), tokens JWT (`src/lib/tokens.ts`) e inyección de Prisma por request (`c.get("db")`).
- El modelo `Usuario` ya cuenta con los campos `activo`, `contrasena_hash`, `correo`, `nombre_completo`, `telefono`; el modelo `Sesion` con `revocado`. Los modelos `Rol`, `UsuarioRol` existen en `schema.prisma` pero no hay middleware de autorización por rol implementado.
- `openspec/specs/` está vacío; este es el primer cambio del proyecto (véase proposal.md — Why).

## Goals / Non-Goals

**Goals:**
- Completar el CRUD self-service de usuarios en `src/users` con la menor fricción posible y coherente con las convenciones existentes (rutas declarativas con `createRoute`, schemas zod-openapi, errores en español, tests Vitest con Prisma mockeado).
- Proveer la base mínima de autorización por rol administrador reutilizable en el futuro.

**Non-Goals:**
- Endpoints administrativos de gestión de usuarios (listar/actualizar/desactivar a otros) — quedan para un cambio futuro que consuma `requireAdmin`.
- CRUD de direcciones (`DireccionUsuario`), roles/permisos (RF-09 a RF-11) o gestión de sesiones por dispositivo.

## Decisions

### 1. Endpoints self-service bajo `/users/me`
Todas las rutas nuevas viven en el módulo `users` con base `/users`:
- `GET /users/me` → `200 { usuario: {...} }`
- `PATCH /users/me` → `200 { usuario: {...} }`
- `POST /users/me/password` → `200 { mensaje: "..." }`
- `POST /users/me/deactivate` → `200 { mensaje: "..." }` / `409` si ya está inactiva

Se usa el router existente de `users` (ya montado en `src/index.ts`). La ruta estática `/users/me` y la paramétrica `/users/{id}` coexisten sin conflicto: el router de Hono prioriza rutas estáticas sobre las paramétricas.
Alternativa considerada: reutilizar `GET /auth/me` para la lectura. Se descarta duplicar lógica en `/auth` — se mantiene `/auth/me` intacto (compatibilidad) y `GET /users/me` existe para completar el CRUD del módulo de usuarios; ambas usan la misma serialización `usuarioPublico`.

### 2. Actualización parcial con al menos un campo editable
`PATCH /users/me` acepta `{ nombre_completo?: string, telefono?: string | null }` y rechaza con `400` un cuerpo sin ningún campo editable (validador zod con `superRefine`). Solo se escriben los campos provistos mediante `db.usuario.update` con un objeto `data` construido selectivamente. `telefono` admite `null` para limpiar el valor; `nombre_completo` se trunca y no puede quedar vacío.

### 3. Cambio de contraseña revoca todas las sesiones
`POST /users/me/password` verifica la actual con `verifyPassword` (`401` si no coincide), hashea la nueva con `hashPassword` y revoca todas las sesiones activas (`sesion.updateMany`) antes de confirmar. Revocar todo es más seguro que conservar la sesión actual y fuerza el re-login tras el cambio.
Alternativa considerada: revocar solo las demás sesiones. Se descarta por simplicidad y porque el re-login tras un cambio de contraseña es el comportamiento esperado.

### 4. Desactivación lógica con chequeo previo
`POST /users/me/deactivate` lee el usuario autenticado; si `activo === false` responde `409` (la cuenta ya está desactivada). En caso contrario fija `activo = false`, revoca todas las sesiones y responde confirmación. No borra ningún registro (RF-07).
Alternativa considerada: aplicar el update y responder `200` siempre. Se descarta porque el spec exige distinguir `409` para el caso ya desactivado.

### 5. Middleware `requireAdmin` en `src/auth/middleware.ts`
Co-locado con `requireAuth` para reutilizar el parseo del header Bearer y `verifyAccessToken`. Tras validar el token, consulta `db.usuario_rol.findFirst({ where: { id_usuario, rol: { nombre: "Administrador" } } })`; si no existe registro, responde `403` "Permisos insuficientes". Depende del middleware global que inyecta `db` (ya presente en `src/index.ts` y en los `makeApp` de test).
Falla en modo seguro (fail-closed): si no existe el rol "Administrador" en BD, nadie pasa. Requiere que dicho rol exista (seed futuro); se documenta como riesgo.

## Risks / Trade-offs

- **[Dependencia de datos de rol]** `requireAdmin` depende de que exista un rol con nombre `Administrador` en la BD; sin seed, siempre devuelve `403` → Mitigación: fail-closed es el comportamiento deseado; el seed de roles queda para el cambio que implemente RF-09.
- **[Duplicación `GET /auth/me` vs `GET /users/me`]** Dos rutas que devuelven el mismo perfil → Mitigación: ambas serializan con `usuarioPublico`; se mantiene `/auth/me` por compatibilidad y se documenta en la API.
- **[Riesgo de confundir `/users/me` con `/users/{id}`]** Un `GET /users/me` podría interpretarse como `id = "me"` → Mitigación: el router de Hono prioriza rutas estáticas; se cubre con test de integración.
- **[Revocar sesiones en password/deactivate]** El usuario pierde la sesión actual y debe volver a iniciar sesión → Mitigación: comportamiento intencional, documentado en la respuesta de la API.

## Migration Plan

- Sin migraciones de esquema ni cambios de datos: se usan columnas existentes (`activo`, `contrasena_hash`, `Sesion.revocado`).
- Deploy: build + `wrangler deploy` estándar; rollback trivial (no hay cambios de esquema).

## Open Questions

- Ninguna. El alcance y comportamiento quedan definidos por el spec.
