# API Endpoints

Referencia completa de todos los endpoints del backend MEG.

**Base URL:** configurable via `wrangler.jsonc`  
**OpenAPI:** JSON spec disponible en `GET /doc`, Swagger UI en `GET /docs`

---

## Tabla resumen

| # | Método | Path | Auth | Descripción |
|---|--------|------|------|-------------|
| 1 | `GET` | `/ping` | No | Health check |
| 2 | `GET` | `/doc` | No | OpenAPI JSON spec |
| 3 | `GET` | `/docs` | No | Swagger UI |
| 4 | `POST` | `/auth/register` | No | Registrar usuario |
| 5 | `POST` | `/auth/login` | No | Iniciar sesión |
| 6 | `POST` | `/auth/refresh` | No | Renovar sesión |
| 7 | `POST` | `/auth/logout` | No | Cerrar sesión |
| 8 | `GET` | `/auth/me` | Bearer JWT | Usuario autenticado |
| 9 | `GET` | `/users/{id}` | No | Obtener usuario por ID |
| 10 | `GET` | `/users/me` | Bearer JWT | Obtener perfil propio |
| 11 | `PATCH` | `/users/me` | Bearer JWT | Actualizar perfil |
| 12 | `POST` | `/users/me/password` | Bearer JWT | Cambiar contraseña |
| 13 | `POST` | `/users/me/deactivate` | Bearer JWT | Desactivar cuenta |

---

## Autenticación

La API usa JWT (HS256) para autenticación. Los endpoints protegidos requieren el header:

```
Authorization: Bearer <accessToken>
```

Los refresh tokens se envían en el body de las requests, no en headers.

| Endpoint | Auth requerido | Mecanismo |
|----------|---------------|-----------|
| `GET /ping` | No | — |
| `GET /doc` | No | — |
| `GET /docs` | No | — |
| `POST /auth/register` | No | — |
| `POST /auth/login` | No | — |
| `POST /auth/refresh` | No | Refresh token en body |
| `POST /auth/logout` | No | Refresh token en body |
| `GET /auth/me` | **Sí** | `Authorization: Bearer <JWT>` |
| `GET /users/{id}` | No | — |
| `GET /users/me` | **Sí** | `Authorization: Bearer <JWT>` |
| `PATCH /users/me` | **Sí** | `Authorization: Bearer <JWT>` |
| `POST /users/me/password` | **Sí** | `Authorization: Bearer <JWT>` |
| `POST /users/me/deactivate` | **Sí** | `Authorization: Bearer <JWT>` |

---

## Schemas comunes

### UsuarioPublico

```json
{
  "id_usuario": 1,
  "nombre_completo": "María García",
  "correo": "maria@example.com",
  "telefono": "555-1234",
  "correo_verificado": false,
  "fecha_registro": "2026-01-15T12:00:00.000Z"
}
```

### Error

```json
{
  "error": "Mensaje de error"
}
```

### Error con bloqueo

```json
{
  "error": "Cuenta temporalmente bloqueada",
  "bloqueado_hasta": "2026-01-15T12:15:00.000Z"
}
```

### Mensaje

```json
{
  "mensaje": "Confirmación"
}
```

---

## Health Check

### `GET /ping`

Verifica que el servicio esté activo.

**Auth:** No  
**Parámetros:** Ninguno

**Respuestas:**

| Código | Descripción |
|--------|-------------|
| `200` | `"Connected!"` (text/plain) |

---

## Documentación

### `GET /doc`

Devuelve el spec OpenAPI 3.0.3 en JSON.

**Auth:** No  
**Parámetros:** Ninguno

**Respuestas:**

| Código | Descripción |
|--------|-------------|
| `200` | JSON con el spec OpenAPI completo |

### `GET /docs`

Interfaz Swagger UI que referencia `/doc`.

**Auth:** No  
**Parámetros:** Ninguno

**Respuestas:**

| Código | Descripción |
|--------|-------------|
| `200` | HTML con Swagger UI |

---

## Autenticación (`/auth/*`)

### `POST /auth/register`

Registra un usuario nuevo y crea una sesión.

**Auth:** No  
**Content-Type:** `application/json`

**Request Body:**

```json
{
  "nombre_completo": "string (requerido, no vacío)",
  "correo": "string (requerido, email válido)",
  "contrasena": "string (requerido, mínimo 8 caracteres)",
  "telefono": "string (opcional)"
}
```

**Respuestas:**

| Código | Descripción | Body |
|--------|-------------|------|
| `201` | Usuario registrado | `{ usuario, accessToken, refreshToken, expiraEn }` |
| `400` | Datos inválidos | `{ error }` |
| `409` | Correo ya registrado | `{ error: "El correo ya está registrado" }` |

**Lógica de negocio:**
- El correo se normaliza a minúsculas y se hace trim
- La contraseña se almacena con hash PBKDF2-SHA256
- Se crea una sesión con access y refresh token

---

### `POST /auth/login`

Verifica credenciales y devuelve una sesión.

**Auth:** No  
**Content-Type:** `application/json`

**Request Body:**

```json
{
  "correo": "string (requerido, email válido)",
  "contrasena": "string (requerido)"
}
```

**Respuestas:**

| Código | Descripción | Body |
|--------|-------------|------|
| `200` | Sesión iniciada | `{ usuario, accessToken, refreshToken, expiraEn }` |
| `400` | Campos faltantes | `{ error }` |
| `401` | Credenciales inválidas | `{ error }` |
| `403` | Usuario desactivado | `{ error: "Usuario desactivado" }` |
| `423` | Cuenta bloqueada | `{ error, bloqueado_hasta }` |

**Lógica de negocio:**
- Después de 5 intentos fallidos consecutivos, la cuenta se bloquea por 15 minutos
- Un login exitoso resetea el contador de intentos fallidos
- Si la cuenta está desactivada, retorna 403

---

### `POST /auth/refresh`

Renueva la sesión usando refresh token rotation.

**Auth:** No (requiere refresh token válido en body)  
**Content-Type:** `application/json`

**Request Body:**

```json
{
  "refreshToken": "string (requerido, no vacío)"
}
```

**Respuestas:**

| Código | Descripción | Body |
|--------|-------------|------|
| `200` | Nuevo par de tokens | `{ accessToken, refreshToken, expiraEn }` |
| `400` | Falta refreshToken | `{ error }` |
| `401` | Sesión inválida o expirada | `{ error }` |

**Lógica de negocio:**
- La sesión antigua se marca como revocada (rotación)
- Se crea una nueva sesión con nuevos tokens

---

### `POST /auth/logout`

Revoca la sesión asociada al refresh token.

**Auth:** No (requiere refresh token en body)  
**Content-Type:** `application/json`

**Request Body:**

```json
{
  "refreshToken": "string (requerido, no vacío)"
}
```

**Respuestas:**

| Código | Descripción | Body |
|--------|-------------|------|
| `200` | Sesión cerrada | `{ mensaje: "Sesión cerrada" }` |
| `400` | Falta refreshToken | `{ error }` |

**Lógica de negocio:**
- Retorna 200 incluso si el token no existe (idempotente)

---

### `GET /auth/me`

Devuelve los datos del usuario autenticado.

**Auth:** **Requerido** — `Authorization: Bearer <JWT>`  
**Parámetros:** Ninguno

**Respuestas:**

| Código | Descripción | Body |
|--------|-------------|------|
| `200` | Usuario autenticado | `{ usuario: UsuarioPublico }` |
| `401` | No autenticado / token inválido | `{ error }` |
| `404` | Usuario no encontrado | `{ error }` |

---

## Usuarios (`/users/*`)

### `GET /users/{id}`

Obtiene un usuario por su ID.

**Auth:** No  
**Path Parameters:**

| Param | Tipo | Descripción |
|-------|------|-------------|
| `id` | integer (positivo) | ID del usuario |

**Respuestas:**

| Código | Descripción | Body |
|--------|-------------|------|
| `200` | Usuario encontrado | `{ usuario: UsuarioPublico }` |
| `400` | ID inválido | `{ error: "ID inválido" }` |
| `404` | Usuario no encontrado | `{ error }` |

---

### `GET /users/me`

Obtiene el perfil del usuario autenticado.

**Auth:** **Requerido** — `Authorization: Bearer <JWT>`  
**Parámetros:** Ninguno

**Respuestas:**

| Código | Descripción | Body |
|--------|-------------|------|
| `200` | Perfil del usuario | `{ usuario: UsuarioPublico }` |
| `401` | No autenticado / token inválido | `{ error }` |
| `404` | Usuario no encontrado | `{ error }` |

---

### `PATCH /users/me`

Actualiza los campos editables del perfil.

**Auth:** **Requerido** — `Authorization: Bearer <JWT>`  
**Content-Type:** `application/json`

**Request Body:**

```json
{
  "nombre_completo": "string (opcional, no vacío si se provee)",
  "telefono": "string | null (opcional; null limpia el valor)"
}
```

Se debe enviar al menos un campo. Los campos no provistos se conservan.

**Respuestas:**

| Código | Descripción | Body |
|--------|-------------|------|
| `200` | Perfil actualizado | `{ usuario: UsuarioPublico }` |
| `400` | Sin campos editables / datos inválidos | `{ error }` |
| `401` | No autenticado / token inválido | `{ error }` |

---

### `POST /users/me/password`

Cambia la contraseña del usuario autenticado.

**Auth:** **Requerido** — `Authorization: Bearer <JWT>`  
**Content-Type:** `application/json`

**Request Body:**

```json
{
  "contrasena_actual": "string (requerido, no vacío)",
  "contrasena_nueva": "string (requerido, mínimo 8 caracteres)"
}
```

**Respuestas:**

| Código | Descripción | Body |
|--------|-------------|------|
| `200` | Contraseña actualizada | `{ mensaje: "Contraseña actualizada" }` |
| `400` | Datos inválidos / contraseña corta | `{ error }` |
| `401` | Contraseña actual incorrecta | `{ error: "Credenciales inválidas" }` |
| `404` | Usuario no encontrado | `{ error }` |

**Lógica de negocio:**
- La nueva contraseña se almacena con hash PBKDF2-SHA256
- Se revocan **todas** las sesiones activas del usuario

---

### `POST /users/me/deactivate`

Desactiva la cuenta del usuario autenticado (soft delete).

**Auth:** **Requerido** — `Authorization: Bearer <JWT>`  
**Parámetros:** Ninguno (no body)

**Respuestas:**

| Código | Descripción | Body |
|--------|-------------|------|
| `200` | Cuenta desactivada | `{ mensaje: "Cuenta desactivada" }` |
| `401` | No autenticado / token inválido | `{ error }` |
| `404` | Usuario no encontrado | `{ error }` |
| `409` | Cuenta ya desactivada | `{ error: "La cuenta ya está desactivada" }` |

**Lógica de negocio:**
- Se establece `activo = false` (soft delete, datos preservados)
- Se revocan todas las sesiones activas

---

## Middlewares

### `requireAuth`

Extrae el token Bearer del header `Authorization`, verifica el JWT (HS256) y establece `userId` en el contexto. Retorna 401 si falta o es inválido.

**Aplicado a:** `GET /auth/me`, `GET /users/me`, `PATCH /users/me`, `POST /users/me/password`, `POST /users/me/deactivate`

### `requireAdmin`

Igual que `requireAuth` más verificación de rol "Administrador" via tabla `usuarioRol`. Retorna 403 si no es admin.

**Estado:** Definido pero aún no aplicado a ningún endpoint.

---

## Notas

- El OpenAPI spec se genera en runtime via `@hono/zod-openapi` — no hay archivo estático en el repo
- Los modelos de Prisma como `Negocio`, `ServicioProducto`, `Solicitud`, `Pedido`, `Resena`, etc. existen en el schema pero aún no tienen endpoints
- La API está construida sobre Cloudflare Workers con Hono como framework HTTP
