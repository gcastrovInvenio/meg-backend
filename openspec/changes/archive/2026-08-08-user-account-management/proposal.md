## Why

El módulo `src/users` solo expone `GET /users/{id}`; los usuarios no pueden gestionar su propia cuenta (perfil, contraseña, desactivación) a través de la API, y no existe una base de autorización por rol para proteger endpoints administrativos futuros. Se requiere el ciclo de gestión de cuenta self-service para soportar el requerimiento RF-07 (desactivación/reactivación sin eliminar historial).

## What Changes

- Nuevos endpoints self-service en `src/users/router.ts` (protegidos con `requireAuth`):
  - `GET /users/me` — perfil público del usuario autenticado.
  - `PATCH /users/me` — actualizar campos editables del propio perfil (`nombre_completo`, `telefono`).
  - `POST /users/me/password` — cambiar contraseña verificando la actual (hash PBKDF2-SHA256) e invalidando sesiones.
  - `POST /users/me/deactivate` — desactivación lógica (`activo = false`) sin eliminar datos, revocando todas las sesiones.
- Nuevo middleware `requireAdmin` en `src/auth/middleware.ts` (verifica rol `Administrador` vía `UsuarioRol`/`Rol`), listo para proteger endpoints administrativos futuros.
- Se mantiene `GET /users/{id}` público y `POST /auth/register` como creación de usuario (ya existentes).
- Schemas zod-openapi nuevos en `src/openapi/schemas.ts` y tests de unidad con Vitest para cada endpoint y el middleware.

## Capabilities

### New Capabilities
- `user-account-management`: gestión self-service de la propia cuenta de usuario (consulta y edición de perfil, cambio de contraseña y desactivación lógica), más el middleware mínimo de autorización por rol administrador.

### Modified Capabilities
<!-- Ninguna: `openspec/specs/` está vacío y no existen specs previas que modificar. -->

## Impact

- **Código:** `src/users/router.ts`, `src/users/model.ts`, `src/auth/middleware.ts`, `src/openapi/schemas.ts`, `src/index.ts` (registro de rutas/middleware), archivos de test nuevos en `src/users/`.
- **API:** endpoints nuevos bajo `/users/me/*` y middleware `requireAdmin` (sin endpoints administrativos en este cambio).
- **Datos:** sin migraciones; usa campos existentes (`activo`, `contrasena_hash`, `Sesion`).
- **Seguridad:** cambio de contraseña y desactivación revocan sesiones activas; contraseñas nunca viajan en texto plano en respuestas.
