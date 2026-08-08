## 1. Schemas OpenAPI

- [x] 1.1 Agregar `ActualizarPerfilSchema` en `src/openapi/schemas.ts` (`nombre_completo?`, `telefono?` nullable) con `superRefine` que exija al menos un campo editable, y `.openapi("ActualizarPerfil", {...})`
- [x] 1.2 Agregar `CambioContrasenaSchema` en `src/openapi/schemas.ts` (`contrasena_actual`, `contrasena_nueva` mínimo 8 caracteres) con `.openapi("CambioContrasena", {...})`

## 2. Infraestructura de test del módulo users

- [x] 2.1 Crear `src/users/test-utils.ts` con `makeDb()` (mock de `usuario.findUnique/create/update` y `sesion.updateMany`) y `makeApp(db)` que monte el router `users` con inyección de `db`

## 3. Endpoint GET /users/me

- [x] 3.1 Definir `getMeRoute` con `createRoute` (protegido con `requireAuth`, respuestas 200/401/404) y registrarlo en `src/users/router.ts`
- [x] 3.2 Implementar el handler que devuelve `{ usuario: usuarioPublico(...) }` del usuario autenticado
- [x] 3.3 Tests de `GET /users/me` (éxito, 401 sin token)

## 4. Endpoint PATCH /users/me

- [x] 4.1 Definir `actualizarPerfilRoute` con `createRoute` (body `ActualizarPerfilSchema`, respuestas 200/400/401) y registrarlo
- [x] 4.2 Implementar el handler que actualiza solo los campos provistos (construyendo `data` selectivamente) y devuelve el perfil actualizado
- [x] 4.3 Tests de `PATCH /users/me` (actualización exitosa, 400 con cuerpo vacío)

## 5. Endpoint POST /users/me/password

- [x] 5.1 Definir `cambiarContrasenaRoute` con `createRoute` (body `CambioContrasenaSchema`, respuestas 200/400/401) y registrarlo
- [x] 5.2 Implementar el handler: verificar contraseña actual, hashear la nueva y revocar todas las sesiones (`sesion.updateMany`)
- [x] 5.3 Tests de `POST /users/me/password` (éxito revocando sesiones, 401 con contraseña actual incorrecta, 400 con nueva corta)

## 6. Endpoint POST /users/me/deactivate

- [x] 6.1 Definir `desactivarCuentaRoute` con `createRoute` (protegido, respuestas 200/401/404/409) y registrarlo
- [x] 6.2 Implementar el handler: si `activo === false` responder 409; si no, fijar `activo = false`, revocar sesiones y confirmar
- [x] 6.3 Tests de `POST /users/me/deactivate` (éxito, 409 si ya está desactivada)

## 7. Middleware requireAdmin

- [x] 7.1 Implementar `requireAdmin` en `src/auth/middleware.ts`: validar token Bearer, consultar `UsuarioRol` con rol `Administrador` y responder 403 si no aplica
- [x] 7.2 Tests de `requireAdmin` (401 sin token, 403 sin rol administrador, paso con rol administrador)

## 8. Verificación

- [x] 8.1 Ejecutar `npm test` y `npm run lint` y corregir cualquier fallo
- [x] 8.2 Verificar que `/docs` (Swagger) lista los nuevos endpoints `/users/me/*`
