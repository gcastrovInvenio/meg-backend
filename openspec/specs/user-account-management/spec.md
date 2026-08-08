# user-account-management Specification

## Purpose
Permite a los usuarios gestionar su propia cuenta en MEG — consultar y editar su perfil, cambiar su contraseña y desactivar su cuenta de forma lógica — y establece el middleware mínimo de autorización por rol de administrador para proteger endpoints administrativos futuros.
## Requirements
### Requirement: Consultar el perfil propio
El sistema SHALL permitir a un usuario autenticado consultar sus propios datos públicos (`GET /users/me`), devolviendo la misma estructura de datos públicos usada por `GET /users/{id}`, sin exponer `contrasena_hash`, `token_recuperacion`, `mfa_secreto` ni otros datos sensibles.

#### Scenario: Usuario autenticado consulta su perfil
- **WHEN** un usuario autenticado llama a `GET /users/me`
- **THEN** el sistema responde `200` con sus datos públicos (`id_usuario`, `nombre_completo`, `correo`, `telefono`, `correo_verificado`, `fecha_registro`)

#### Scenario: Sin autenticación
- **WHEN** un cliente no autenticado llama a `GET /users/me`
- **THEN** el sistema responde `401` con un error "No autenticado"

### Requirement: Actualizar el perfil propio
El sistema SHALL permitir a un usuario autenticado actualizar los campos editables de su propio perfil (`nombre_completo`, `telefono`) mediante `PATCH /users/me`, validando que el cuerpo no esté vacío y que los valores cumplan las reglas de formato, y devolver el perfil actualizado.

#### Scenario: Actualización exitosa
- **WHEN** un usuario autenticado envía `PATCH /users/me` con valores válidos para `nombre_completo` y/o `telefono`
- **THEN** el sistema actualiza solo los campos provistos, conserva el resto, y responde `200` con el perfil público actualizado

#### Scenario: Cuerpo inválido
- **WHEN** el usuario envía `PATCH /users/me` con un cuerpo sin campos editables válidos (vacío o solo campos no permitidos)
- **THEN** el sistema responde `400` con un mensaje de error indicando los campos permitidos

### Requirement: Cambiar la contraseña
El sistema SHALL permitir a un usuario autenticado cambiar su contraseña mediante `POST /users/me/password` con la contraseña actual y la nueva, verificando la contraseña actual con el hash almacenado, almacenando la nueva con hash PBKDF2-SHA256 y revocando todas las sesiones activas del usuario tras el cambio.

#### Scenario: Cambio de contraseña exitoso
- **WHEN** un usuario autenticado envía `POST /users/me/password` con la contraseña actual correcta y una nueva contraseña válida (mínimo 8 caracteres)
- **THEN** el sistema actualiza `contrasena_hash`, revoca todas sus sesiones activas y responde `200` con un mensaje de confirmación

#### Scenario: Contraseña actual incorrecta
- **WHEN** el usuario envía `POST /users/me/password` con una contraseña actual que no coincide con el hash almacenado
- **THEN** el sistema responde `401` con un error de credenciales inválidas y no modifica la contraseña ni las sesiones

#### Scenario: Nueva contraseña inválida
- **WHEN** el usuario envía `POST /users/me/password` con una nueva contraseña de menos de 8 caracteres
- **THEN** el sistema responde `400` indicando la longitud mínima y no modifica la contraseña

### Requirement: Desactivar la propia cuenta
El sistema SHALL permitir a un usuario autenticado desactivar su propia cuenta mediante `POST /users/me/deactivate`, marcando `activo = false` sin eliminar ningún dato asociado (historial, reseñas, negocios), revocando todas sus sesiones y confirmando la operación con un mensaje.

#### Scenario: Desactivación exitosa
- **WHEN** un usuario autenticado llama a `POST /users/me/deactivate`
- **THEN** el sistema marca su cuenta como inactiva, revoca todas sus sesiones y responde `200` con un mensaje de confirmación

#### Scenario: Cuenta ya desactivada
- **WHEN** el usuario vuelve a llamar a `POST /users/me/deactivate` con su cuenta ya inactiva
- **THEN** el sistema responde `409` indicando que la cuenta ya está desactivada

### Requirement: Autorización de administrador
El sistema SHALL proveer un middleware `requireAdmin` que, tras validar el access token JWT, verifique que el usuario autenticado tenga el rol `Administrador` (vía `UsuarioRol`/`Rol`), permitiendo la ejecución solo en ese caso.

#### Scenario: Usuario con rol administrador
- **WHEN** un usuario autenticado con el rol `Administrador` llama a un endpoint protegido por `requireAdmin`
- **THEN** el middleware deja pasar la solicitud

#### Scenario: Usuario sin rol administrador
- **WHEN** un usuario autenticado sin el rol `Administrador` llama a un endpoint protegido por `requireAdmin`
- **THEN** el sistema responde `403` con un error de permisos insuficientes

#### Scenario: Sin autenticación
- **WHEN** un cliente no autenticado llama a un endpoint protegido por `requireAdmin`
- **THEN** el sistema responde `401` con un error "No autenticado"

