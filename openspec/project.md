# MEG — Mercado de Emprendimiento y Gestión
## Documento de Requerimientos de Backend

**Autores:** Elias Caleb Hernández Salguero, Mariangel Rodríguez Diaz, Guillermo Jesús Castro Vargas

---

## 1. Contexto del proyecto

MEG es una plataforma digital que conecta a consumidores con emprendedores, micro y pequeñas empresas (MYPES) de su comunidad, permitiendo la promoción y contratación de productos/servicios de forma local, segura y confiable. El backend debe soportar el ciclo completo: registro y verificación de usuarios/negocios, catálogo de productos y servicios, solicitudes/pedidos, pagos, mensajería, reseñas, notificaciones, cupones, reclamos y auditoría — todo bajo un enfoque fuerte de seguridad y confianza (KYC, reputación, roles y permisos).

## 2. Objetivo del backend

Diseñar e implementar una API backend robusta, segura y escalable que sirva como núcleo de la aplicación MEG, exponiendo la funcionalidad necesaria para las apps cliente (web/móvil) de consumidores y negocios, sobre el modelo de datos definido en Prisma/SQLite.

## 3. Stack tecnológico sugerido

- **ORM / Modelado de datos:** Prisma (ya definido en `schema.prisma`)
- **Base de datos:** SQLite (desarrollo) — evaluar migración a PostgreSQL en producción por concurrencia y tipos `Decimal`/geoespaciales
- **Runtime:** Node.js (TypeScript recomendado por tipado fuerte junto a Prisma)
- **Framework API:** REST (Express/Fastify/NestJS) o GraphQL, a definir por el equipo
- **Autenticación:** JWT (access + refresh token), MFA opcional (`mfa_secreto` ya contemplado en el modelo)
- **Almacenamiento de archivos:** servicio de almacenamiento de objetos (S3-compatible) para `url_documento_identidad`, `Imagen.url`
- **Notificaciones:** proveedor push (FCM/APNs), email (SMTP/servicio transaccional), SMS (proveedor tercero)
- **Pagos:** pasarela de pago externa (campo `pasarela` en `Transaccion`) — ej. tarjetas, SINPE Móvil u otro proveedor local

## 4. Actores del sistema

| Rol | Descripción |
|---|---|
| **Consumidor** | Usuario que busca y contrata productos/servicios |
| **Emprendedor / Negocio** | Usuario que publica y gestiona productos/servicios de su negocio |
| **Administrador** | Gestiona KYC, roles, permisos, reclamos y auditoría de la plataforma |
| **Sistema** | Procesos automáticos (notificaciones, cálculo de comisiones, expiración de sesiones/tokens) |

El sistema debe soportar control de acceso basado en roles y permisos (`Rol`, `Permiso`, `UsuarioRol`, `RolPermiso`), permitiendo que un mismo usuario tenga múltiples roles (ej. consumidor y dueño de negocio a la vez).

## 5. Requerimientos funcionales por módulo

### 5.1 Autenticación y gestión de usuarios (`Usuario`, `Sesion`)
- RF-01: Registro de usuario con correo, contraseña (hash seguro, ej. bcrypt/argon2) y datos básicos.
- RF-02: Verificación de correo electrónico (`correo_verificado`) antes de habilitar funciones sensibles.
- RF-03: Inicio de sesión con control de intentos fallidos (`intentos_fallidos_login`) y bloqueo temporal (`bloqueado_hasta`).
- RF-04: Soporte de autenticación multifactor (MFA) mediante `mfa_secreto`.
- RF-05: Recuperación de contraseña vía token temporal (`token_recuperacion`, `expiracion_token_recuperacion`).
- RF-06: Gestión de sesiones activas por dispositivo mediante refresh tokens (`Sesion`), con capacidad de revocación individual o total.
- RF-07: Desactivación/reactivación de cuentas (`activo`) sin eliminar el historial de datos.
- RF-08: Gestión de direcciones múltiples por usuario (`DireccionUsuario`), con marcado de dirección principal y coordenadas geográficas para búsquedas por proximidad.

### 5.2 Roles y permisos (`Rol`, `Permiso`, `UsuarioRol`, `RolPermiso`)
- RF-09: CRUD de roles y permisos (solo administradores).
- RF-10: Asignación/revocación de roles a usuarios.
- RF-11: Middleware de autorización que valide permisos por endpoint según el rol del usuario autenticado.

### 5.3 Negocios y confianza (`Negocio`, KYC)
- RF-12: Registro de negocio asociado a un usuario, incluyendo cédula jurídica/física.
- RF-13: Flujo de verificación KYC: carga de documento de identidad (`url_documento_identidad`), cambio de `estado_kyc` (Pendiente → Aprobado/Rechazado) y registro de `fecha_auditoria_kyc` por un administrador.
- RF-14: Bloqueo de publicación de productos/servicios hasta que el negocio tenga KYC Aprobado.
- RF-15: Gestión de ubicación del negocio (dirección física, latitud/longitud) para búsquedas de proximidad.
- RF-16: Cálculo y actualización de `calificacion_promedio` a partir de las reseñas recibidas.
- RF-17: Gestión de horarios de atención (`HorarioNegocio`) por día de la semana.
- RF-18: Gestión de imágenes del negocio (`Imagen`), con orden y marca de imagen principal.
- RF-19: Activar/desactivar negocio (`activo`).

### 5.4 Categorías y catálogo (`Categoria`, `ServicioProducto`, `Variacion`, `ItemVariacion`, `NegocioCategoria`)
- RF-20: CRUD de categorías con soporte jerárquico (categoría padre/subcategorías).
- RF-21: Asociación de negocios a una o varias categorías.
- RF-22: CRUD de productos/servicios (`ServicioProducto`) con tipo (Producto/Servicio), precio base y estado activo.
- RF-23: Gestión de variaciones de producto (ej. talla, color) y su sobreprecio.
- RF-24: Gestión de combinaciones item-variación con control de stock y SKU único.
- RF-25: Gestión de imágenes por producto/servicio.
- RF-26: Búsqueda y filtrado de productos/servicios por categoría, ubicación/proximidad, precio y disponibilidad (posible integración con IA para búsqueda inteligente, mencionada en la propuesta de solución).
- RF-27: Gestión de favoritos de items y negocios por usuario (`FavoritoItem`, `FavoritoNegocio`).

### 5.5 Solicitudes y pedidos (`Solicitud`, `Pedido`, `HistorialEstadoSolicitud`)
- RF-28: Creación de solicitud de un consumidor sobre un producto/servicio (con variación opcional).
- RF-29: Gestión de carrito de compras (`Pedido` en estado Carrito) que agrupa múltiples solicitudes.
- RF-30: Flujo de estados de pedido: Carrito → Confirmado → Pagado → Enviado → Entregado / Cancelado.
- RF-31: Flujo de estados de solicitud: Pendiente → Aceptada → Completada / Cancelada.
- RF-32: Registro de historial de cambios de estado de cada solicitud, incluyendo el usuario responsable del cambio y comentario opcional (trazabilidad/auditoría).
- RF-33: Cálculo de subtotal, descuento total y total del pedido.
- RF-34: Cancelación de solicitudes/pedidos según reglas de negocio (ventanas de tiempo, estado actual).

### 5.6 Pagos (`Transaccion`)
- RF-35: Integración con pasarela(s) de pago externas; registro de `id_pago_externo`.
- RF-36: Registro de monto, moneda, comisión de plataforma y estado de la transacción (Pendiente, Completado, Fallido, Reembolsado).
- RF-37: Soporte de transacciones asociadas a una solicitud individual o a un pedido completo.
- RF-38: Procesamiento de reembolsos y actualización de estado correspondiente.
- RF-39: Webhooks/callbacks para actualizar el estado de la transacción según respuesta de la pasarela.

### 5.7 Cupones y descuentos (`Cupon`, `CuponAplicado`)
- RF-40: CRUD de cupones con tipo de descuento (porcentaje/fijo), vigencia, monto mínimo de compra y límite de usos.
- RF-41: Validación y aplicación de cupón a un pedido (verificar vigencia, usos disponibles, monto mínimo).
- RF-42: Registro de cupones aplicados por usuario/pedido y actualización de `usos_actuales`.

### 5.8 Reseñas y reputación (`Resena`)
- RF-43: Creación de reseña asociada a una solicitud completada (1 reseña por solicitud, `id_solicitud` único).
- RF-44: Registro de puntuación y comentario, vinculado al negocio evaluado.
- RF-45: Actualización automática de la calificación promedio del negocio al crear/editar una reseña.

### 5.9 Mensajería (`Mensaje`)
- RF-46: Chat entre consumidor y negocio en el contexto de una solicitud específica.
- RF-47: Marcado de mensajes como leídos/no leídos.
- RF-48: Notificación en tiempo real (websockets o polling) de nuevos mensajes.

### 5.10 Notificaciones (`Notificacion`)
- RF-49: Envío de notificaciones push, email o SMS según el tipo configurado.
- RF-50: Registro de notificaciones en base de datos con estado leído/no leído y URL de destino (deep link).
- RF-51: Notificaciones automáticas ante eventos clave: cambio de estado de solicitud/pedido, nuevo mensaje, aprobación/rechazo de KYC, resolución de reclamo, pagos.

### 5.11 Reclamos (`Reclamo`)
- RF-52: Creación de reclamo asociado a una solicitud (1 reclamo por solicitud).
- RF-53: Flujo de estados: Abierto → En_revision → Resuelto, gestionado por administradores.
- RF-54: Registro de resolución y fecha de resolución.

### 5.12 Auditoría y seguridad (`LogAuditoria`)
- RF-55: Registro de acciones sensibles del sistema (login, cambios de estado, aprobaciones KYC, modificaciones administrativas) con usuario, entidad afectada, IP y detalle.
- RF-56: Endpoint de consulta de logs restringido a administradores, con filtros por usuario, entidad y rango de fechas.

## 6. Requerimientos no funcionales

- RNF-01 (Seguridad): Contraseñas almacenadas con hash seguro (bcrypt/argon2), nunca en texto plano.
- RNF-02 (Seguridad): Comunicación exclusivamente vía HTTPS/TLS.
- RNF-03 (Seguridad): Protección contra ataques comunes (SQL injection, XSS, CSRF, fuerza bruta con rate limiting).
- RNF-04 (Seguridad): Tokens JWT de corta duración + refresh tokens revocables almacenados en `Sesion`.
- RNF-05 (Privacidad): Cumplimiento con normativa de protección de datos personales aplicable en Costa Rica (Ley N.º 8968).
- RNF-06 (Confianza): El flujo KYC debe ser auditable y trazable (quién aprobó/rechazó y cuándo).
- RNF-07 (Escalabilidad): Diseño de API stateless para permitir escalado horizontal.
- RNF-08 (Disponibilidad): Objetivo de disponibilidad razonable para un MVP (ej. 99%), con manejo de errores y reintentos en integraciones externas (pagos, notificaciones).
- RNF-09 (Rendimiento): Consultas de búsqueda por proximidad geográfica optimizadas (índices geoespaciales o cálculo de distancia eficiente).
- RNF-10 (Mantenibilidad): Código organizado por módulos/dominios (usuarios, negocios, catálogo, pedidos, pagos, mensajería, notificaciones), documentado y con pruebas automatizadas.
- RNF-11 (Trazabilidad): Toda acción crítica sobre el estado de una solicitud debe dejar registro en `HistorialEstadoSolicitud` y/o `LogAuditoria`.
- RNF-12 (Internacionalización): Soporte de moneda configurable (`moneda` en `Transaccion`), aunque el MVP se enfoque en Costa Rica.
- RNF-13 (Prevención de abuso): Mecanismos para mitigar el uso indebido de la plataforma para actividades ilegales (contrabando, estupefacientes, personas), mencionado explícitamente como riesgo identificado en la validación del proyecto — reforzar KYC, moderación de contenido y canal de reporte/reclamo.

## 7. Alcance del MVP sugerido

1. Registro/login de usuarios con verificación de correo.
2. Registro de negocio y flujo KYC básico.
3. CRUD de catálogo (productos/servicios, categorías, variaciones).
4. Creación de solicitudes y carrito/pedido con historial de estados.
5. Integración con una pasarela de pago.
6. Reseñas básicas y cálculo de calificación promedio.
7. Notificaciones básicas (email + in-app).
8. Mensajería simple entre consumidor y negocio.
9. Panel administrativo mínimo (aprobar KYC, gestionar reclamos, ver logs).

Fuera de alcance para el MVP (fase 2+): cupones avanzados, búsqueda con IA, notificaciones push/SMS, analítica avanzada de reputación.

## 8. Referencias del modelo de datos

El detalle completo de entidades, relaciones y enumeraciones se encuentra definido en `schema.prisma` (proveedor SQLite), el cual debe considerarse la fuente de verdad para el diseño de la API y las validaciones de negocio.

## 9. Stack tecnológico confirmado

| Capa | Tecnología | Detalles |
|---|---|---|
| Runtime / Deploy | **Cloudflare Workers** | Wrangler 4, `compatibility_flags: ["nodejs_compat"]`, config en `wrangler.jsonc` |
| Dev / Build | **Vite 8** + `@cloudflare/vite-plugin` | `npm run dev`, `npm run build`, `npm run deploy` |
| Framework API | **Hono 4** (`OpenAPIHono`) + `@hono/zod-openapi` | REST con OpenAPI 3.0.3 generado automáticamente (`/doc`) y Swagger UI en `/docs` |
| ORM / Modelado | **Prisma 7** | Generador `prisma-client` con salida en `prisma/prisma/`; datasource `sqlite`; migraciones en `prisma/migrations/` |
| Base de datos | SQLite (desarrollo, `dev.db`) / **Cloudflare D1** (producción) | Acceso vía `@prisma/adapter-d1` con binding `DB` |
| Validación | **Zod 4** | Schemas con `zod-openapi` en `src/openapi/schemas.ts` |
| Autenticación | JWT **HS256** (`hono/jwt`) + PBKDF2-SHA256 (Web Crypto) | Access token corto (`JWT_EXPIRES_IN`) + refresh token rotativo almacenado en `Sesion`; hash en `src/lib/password.ts` |
| Tests | **Vitest 4** | `npm test`, archivos `*.test.ts` junto al código |
| Lint / Format | **Biome 2** | Tabs, comillas dobles, preset `recommended`; `npm run lint` |
| Lenguaje | **TypeScript** (ESM) | `"type": "module"`, bindings tipados de Worker |

## 10. Arquitectura y convenciones de código

### Estructura de carpetas (organización por dominios)

```
src/
  index.ts        # app principal (OpenAPIHono), middleware global y registro de rutas
  types.ts        # AppEnv (bindings) y AppVariables (userId, db)
  auth/           # módulo de autenticación (router, middleware, test-utils, tests)
  users/          # módulo de usuarios (router, model)
  lib/            # utilidades compartidas (db, password, tokens, encoding)
  openapi/        # schemas zod-openapi compartidos (schemas.ts)
  test/           # helpers de test (test-env.ts)
prisma/
  schema.prisma   # fuente de verdad del modelo de datos
  migrations/     # migraciones D1/SQLite
  prisma/         # cliente generado (no editar a mano)
```

### Convenciones

- **Rutas declarativas:** cada endpoint se define con `createRoute()` (método, path, tags, summary, description, request/response) y se registra con `router.openapi(route, handler)`.
- **Schemas:** entradas y salidas con `zod-openapi`, nombrados con `.openapi("Nombre", {...})` y agrupados en `src/openapi/schemas.ts`.
- **Errores:** respuestas JSON `{ "error": "mensaje en español" }`. El `defaultHook` de cada router valida el body/params y devuelve 400 con el primer mensaje de Zod. El resto usa el helper `fail(c, status, error, extra?)`.
- **Acceso a datos:** la instancia de Prisma se inyecta por request con `c.set("db", createPrisma(c.env.DB))` en `src/index.ts` y se lee con `c.get("db")`.
- **Tipos de entorno:** bindings y variables tipados en `src/types.ts` (`AppEnv`: `DB`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `REFRESH_TOKEN_TTL`; `AppVariables`: `userId`, `db`).
- **Naming:** campos de BD en `snake_case`; payloads de API en `camelCase` (p.ej. `accessToken`, `refreshToken`, `expiraEn`); respuestas envueltas (`{ usuario: ... }`, `{ mensaje: ... }`).
- **Endpoints protegidos:** usan `security: [{ Bearer: [] }]` en la ruta más el middleware `requireAuth` (`src/auth/middleware.ts`).
- **Tests:** unitarios con Vitest mockeando Prisma (`makeDb`/`makeApp` en `test-utils.ts`) y probando vía `app.request(...)`; viven junto al código (`router.test.ts`, `middleware.test.ts`).
- **Idioma:** todo el texto visible al usuario y las descripciones OpenAPI van en español.
- **Comandos:** `npm run dev` (vite), `npm test` (vitest run), `npm run lint` (biome check .), `npm run deploy` (build + wrangler deploy), `npm run cloudflare-db-local` / `cloudflare-db-remote` (migraciones D1).

## 11. Estado de implementación

- **Implementado:** autenticación completa (register, login, refresh, logout, me), consulta de usuarios por ID, endpoint `/ping` y documentación OpenAPI/Swagger.
- **Por implementar:** el resto de módulos (negocios/KYC, catálogo, pedidos, pagos, cupones, reseñas, mensajería, notificaciones, reclamos, auditoría), a partir de los deltas definidos en `openspec/specs`.
