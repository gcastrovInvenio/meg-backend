# Seguridad — MEG

Documentación del subsistema de seguridad del backend de **MEG (Mercado de Emprendimiento y Gestión)**: autenticación, sesiones, control de acceso por roles y decisiones de seguridad.

> **Fuente de verdad:** `src/` (código) y `prisma/schema.prisma` (modelo de datos). Este documento es una **vista derivada**; ante cualquier divergencia, prevalece el código y este documento debe actualizarse.

## Tabla de contenidos

1. [Convenciones](#1-convenciones)
2. [Casos de uso](#2-casos-de-uso)
3. [Diagrama de clases](#3-diagrama-de-clases)
4. [Diagramas de secuencia](#4-diagramas-de-secuencia)
5. [Workflows (diagramas de actividades)](#5-workflows-diagramas-de-actividades)
6. [Diagramas de estados](#6-diagramas-de-estados)
7. [Decisiones de seguridad](#7-decisiones-de-seguridad)
8. [Mitigación de amenazas: Privilege Escalation y Lateral Movement](#8-mitigación-de-amenazas-privilege-escalation-y-lateral-movement)

## 1. Convenciones

- En los diagramas se usan los **nombres reales** de módulos y funciones (`requireAuth`, `requireAdmin`, `verifyAccessToken`, `hashPassword`, `crearSesion`, etc.).
- Las entidades de base de datos se nombran con su `@@map` en **mayúsculas** (`USUARIO`, `SESION`, `ROL`, `PERMISO`, `USUARIO_ROL`, `ROL_PERMISO`).
- **Equivalencias Mermaid–UML:** Mermaid no ofrece un tipo nativo para casos de uso ni diagramas de actividades UML, por lo que:
  - Los **casos de uso** se dibujan con `flowchart` (actores como nodos, casos de uso como elipses dentro del límite del sistema).
  - Los **workflows** (actividades) se dibujan con `flowchart` con nodos de decisión.
  - Los diagramas de **clases**, **secuencia** y **estados** sí usan los tipos nativos `classDiagram`, `sequenceDiagram` y `stateDiagram-v2`.
- Los códigos de respuesta HTTP (401, 403, 423, 200, 201) y las condiciones de los flujos reflejan el comportamiento real de `src/auth/router.ts` y `src/auth/middleware.ts`.

## 2. Casos de uso

Actores y casos de uso del subsistema de seguridad.

```mermaid
flowchart LR
    subgraph API["MEG Backend (API)"]
        direction TB
        UC1(["Registrarse"])
        UC2(["Iniciar sesión"])
        UC3(["Renovar sesión"])
        UC4(["Cerrar sesión"])
        UC5(["Consultar perfil propio"])
        UC6(["Acceder a rutas protegidas"])
        UC7(["Gestionar roles y permisos"])
        UC8(["Gestionar KYC de negocios"])
    end

    Consumidor["Consumidor"] --> UC1
    Consumidor --> UC2
    Consumidor --> UC3
    Consumidor --> UC4
    Consumidor --> UC5
    Consumidor --> UC6

    Emprendedor["Emprendedor / Negocio"] --> UC1
    Emprendedor --> UC2
    Emprendedor --> UC3
    Emprendedor --> UC4
    Emprendedor --> UC5
    Emprendedor --> UC6

    Administrador["Administrador"] --> UC2
    Administrador --> UC3
    Administrador --> UC4
    Administrador --> UC6
    Administrador --> UC7
    Administrador --> UC8

    Sistema["Sistema (procesos automáticos)"] --> UC3
    Sistema --> UC6
```

### Mapeo a endpoints reales

| Caso de uso | Endpoint | Protección |
|---|---|---|
| Registrarse | `POST /auth/register` | Público |
| Iniciar sesión | `POST /auth/login` | Público (bloqueo tras 5 intentos fallidos) |
| Renovar sesión | `POST /auth/refresh` | Requiere `refreshToken` (rotación) |
| Cerrar sesión | `POST /auth/logout` | Requiere `refreshToken` |
| Consultar perfil propio | `GET /auth/me` | `Bearer` JWT (`requireAuth`) |
| Acceder a rutas protegidas | Rutas con `requireAuth` | `Bearer` JWT |
| Gestionar roles y permisos | Rutas administrativas con `requireAdmin` (planificado) | `Bearer` JWT + rol `Administrador` |
| Gestionar KYC de negocios | Aprobación KYC con `requireAdmin` (planificado) | `Bearer` JWT + rol `Administrador` |

---

## 3. Diagrama de clases

Entidades de datos del modelo de seguridad y módulos de código que las gestionan.

```mermaid
classDiagram
    direction LR

    namespace Datos {
        class USUARIO {
            +Int id_usuario PK
            +String correo UK
            +String contrasena_hash
            +Int intentos_fallidos_login
            +DateTime bloqueado_hasta
            +Boolean activo
        }
        class SESION {
            +Int id_sesion PK
            +Int id_usuario FK
            +String refresh_token UK
            +DateTime expira_en
            +Boolean revocado
        }
        class ROL {
            +Int id_rol PK
            +String nombre UK
        }
        class PERMISO {
            +Int id_permiso PK
            +String nombre UK
        }
        class USUARIO_ROL {
            +Int id_usuario PK FK
            +Int id_rol PK FK
        }
        class ROL_PERMISO {
            +Int id_rol PK FK
            +Int id_permiso PK FK
        }
    }

    namespace Codigo {
        class router["auth/router.ts"] {
            +register()
            +login()
            +refresh()
            +logout()
            +me()
            -crearSesion()
        }
        class middleware["auth/middleware.ts"] {
            +requireAuth()
            +requireAdmin()
        }
        class password["lib/password.ts"] {
            +hashPassword()
            +verifyPassword()
        }
        class tokens["lib/tokens.ts"] {
            +signAccessToken()
            +verifyAccessToken()
            +randomRefreshToken()
            +parseDuration()
        }
    }

    USUARIO "1" o-- "0..*" SESION : crea
    USUARIO "1" o-- "0..*" USUARIO_ROL : tiene
    ROL "1" o-- "0..*" USUARIO_ROL
    ROL "1" o-- "0..*" ROL_PERMISO
    PERMISO "1" o-- "0..*" ROL_PERMISO

    router --> middleware : usa
    router --> password : usa
    router --> tokens : usa
    middleware --> tokens : usa
```

## 4. Diagramas de secuencia

### 4.1 Registro — `POST /auth/register`

```mermaid
sequenceDiagram
    autonumber
    participant Cliente
    participant API as MEG API<br/>(auth/router.ts)
    participant Pwd as lib/password.ts
    participant Tok as lib/tokens.ts
    participant DB as USUARIO / SESION

    Cliente->>API: POST /auth/register { nombre_completo, correo, contrasena, telefono? }
    API->>DB: findUnique(USUARIO por correo)
    DB-->>API: null (no existe)
    alt correo ya registrado
        API-->>Cliente: 409 { error: "El correo ya está registrado" }
    else correo nuevo
        API->>Pwd: hashPassword(contrasena)
        Pwd-->>API: "pbkdf2_sha256$100000$salt$hash"
        API->>DB: create(USUARIO)
        DB-->>API: usuario creado
        API->>Tok: signAccessToken(env, id_usuario)
        Tok-->>API: accessToken (JWT HS256, 15 min)
        API->>DB: crearSesion: create(SESION)
        DB-->>API: sesion con refresh_token (48 bytes) y expira_en
        API-->>Cliente: 201 { usuario, accessToken, refreshToken, expiraEn }
    end
```

### 4.2 Login — `POST /auth/login`

```mermaid
sequenceDiagram
    autonumber
    participant Cliente
    participant API as MEG API<br/>(auth/router.ts)
    participant Pwd as lib/password.ts
    participant Tok as lib/tokens.ts
    participant DB as USUARIO / SESION

    Cliente->>API: POST /auth/login { correo, contrasena }
    API->>DB: findUnique(USUARIO por correo)
    DB-->>API: usuario | null
    alt usuario no existe
        API-->>Cliente: 401 { error: "Credenciales inválidas" }
    else usuario existe
        alt !activo
            API-->>Cliente: 403 { error: "Usuario desactivado" }
        else activo y bloqueado_hasta > ahora
            API-->>Cliente: 423 { error: "Cuenta temporalmente bloqueada", bloqueado_hasta }
        else activo y sin bloqueo vigente
            API->>Pwd: verifyPassword(contrasena, contrasena_hash)
            Pwd-->>API: true | false
            alt contraseña inválida
                API->>DB: update: intentos_fallidos_login = intentos + 1
                alt intentos >= 5
                    API->>DB: update: bloqueado_hasta = ahora + 15 min, intentos = 0
                    API-->>Cliente: 401 { error: "Demasiados intentos fallidos, cuenta bloqueada por 15 minutos" }
                else intentos < 5
                    API-->>Cliente: 401 { error: "Credenciales inválidas" }
                end
            else contraseña válida
                API->>DB: update: intentos_fallidos_login = 0, bloqueado_hasta = null
                API->>Tok: signAccessToken(env, id_usuario)
                Tok-->>API: accessToken (JWT HS256, 15 min)
                API->>DB: crearSesion: create(SESION)
                DB-->>API: sesion con refresh_token y expira_en
                API-->>Cliente: 200 { usuario, accessToken, refreshToken, expiraEn }
            end
        end
    end
```

### 4.3 Refresco de sesión — `POST /auth/refresh`

```mermaid
sequenceDiagram
    autonumber
    participant Cliente
    participant API as MEG API<br/>(auth/router.ts)
    participant Tok as lib/tokens.ts
    participant DB as SESION / USUARIO

    Cliente->>API: POST /auth/refresh { refreshToken }
    API->>DB: findUnique(SESION por refresh_token)
    DB-->>API: sesion | null
    alt sesion no existe, o revocada, o expirada
        API-->>Cliente: 401 { error: "Sesión inválida o expirada" }
    else sesion válida
        API->>DB: findUnique(USUARIO por id_usuario de la sesión)
        DB-->>API: usuario | null
        alt usuario inexistente o inactivo
            API-->>Cliente: 401 { error: "Sesión inválida o expirada" }
        else usuario activo
            API->>DB: update(SESION): revocado = true  (rotación)
            API->>Tok: signAccessToken(env, id_usuario)
            Tok-->>API: nuevo accessToken
            API->>DB: crearSesion: create(SESION con refresh_token nuevo)
            DB-->>API: nueva sesión
            API-->>Cliente: 200 { accessToken, refreshToken, expiraEn }
        end
    end
```

### 4.4 Logout — `POST /auth/logout`

```mermaid
sequenceDiagram
    autonumber
    participant Cliente
    participant API as MEG API<br/>(auth/router.ts)
    participant DB as SESION

    Cliente->>API: POST /auth/logout { refreshToken }
    API->>DB: findUnique(SESION por refresh_token)
    DB-->>API: sesion | null
    alt sesion existe y no está revocada
        API->>DB: update(SESION): revocado = true
        DB-->>API: ok
    end
    API-->>Cliente: 200 { mensaje: "Sesión cerrada" }
```

### 4.5 Acceso a endpoint protegido

```mermaid
sequenceDiagram
    autonumber
    participant Cliente
    participant API as MEG API
    participant MA as requireAuth
    participant MAdm as requireAdmin
    participant DB as USUARIO_ROL

    Note over Cliente,DB: Ruta protegida con requireAuth (p.ej. GET /auth/me)
    Cliente->>API: GET /auth/me (sin Authorization)
    API->>MA: requireAuth
    MA-->>API: 401 { error: "No autenticado" }
    API-->>Cliente: 401

    Cliente->>API: GET /auth/me (Authorization: Bearer token inválido/expirado)
    API->>MA: requireAuth
    MA->>MA: verifyAccessToken(token, JWT_SECRET)
    MA-->>API: 401 { error: "Token inválido o expirado" }
    API-->>Cliente: 401

    Cliente->>API: GET /auth/me (Authorization: Bearer token válido)
    API->>MA: requireAuth
    MA->>MA: verifyAccessToken(token, JWT_SECRET)
    MA->>API: next() con userId
    API->>DB: findUnique(USUARIO por userId)
    DB-->>API: usuario
    API-->>Cliente: 200 { usuario }

    Note over Cliente,DB: Ruta administrativa con requireAdmin
    Cliente->>API: POST /admin (Bearer token válido de usuario normal)
    API->>MA: requireAuth
    MA->>MA: verifyAccessToken(token, JWT_SECRET)
    MA->>API: next() con userId
    API->>MAdm: requireAdmin
    MAdm->>DB: findFirst(UsuarioRol id_usuario, rol "Administrador")
    DB-->>MAdm: null
    MAdm-->>API: 403 { error: "Permisos insuficientes" }
    API-->>Cliente: 403
```

## 5. Workflows (diagramas de actividades)

Flujos de trabajo representados con `flowchart` (equivalentes a diagramas de actividades UML).

### 5.1 Registro

```mermaid
flowchart TD
    A(["POST /auth/register"]) --> B["Validar datos<br/>(nombre, correo, contraseña >= 8)"]
    B --> C{"¿Correo ya registrado?<br/>(findUnique)"}
    C -- Sí --> R409(["409 El correo ya está registrado"])
    C -- No --> D["hashPassword (PBKDF2-SHA256)"]
    D --> E["create(USUARIO)"]
    E --> F["crearSesion: signAccessToken + create(SESION)"]
    F --> G(["201 { usuario, accessToken, refreshToken, expiraEn }"])
```

### 5.2 Login

```mermaid
flowchart TD
    A(["POST /auth/login"]) --> B["findUnique(USUARIO por correo)"]
    B --> C{"¿Usuario existe?"}
    C -- No --> R401(["401 Credenciales inválidas"])
    C -- Sí --> D{"¿activo?"}
    D -- No --> R403(["403 Usuario desactivado"])
    D -- Sí --> E{"¿bloqueado_hasta > ahora?"}
    E -- Sí --> R423(["423 Cuenta temporalmente bloqueada"])
    E -- No --> F["verifyPassword(contrasena, contrasena_hash)"]
    F --> G{"¿Contraseña válida?"}
    G -- No --> H["intentos_fallidos_login = intentos + 1"]
    H --> I{"¿intentos >= 5?"}
    I -- No --> R401b(["401 Credenciales inválidas"])
    I -- Sí --> J["bloqueado_hasta = ahora + 15 min<br/>intentos = 0"]
    J --> R401c(["401 Demasiados intentos, cuenta bloqueada 15 min"])
    G -- Sí --> K["intentos = 0, bloqueado_hasta = null"]
    K --> L["crearSesion: signAccessToken + create(SESION)"]
    L --> M(["200 { usuario, accessToken, refreshToken, expiraEn }"])
```

### 5.3 Renovación de sesión

```mermaid
flowchart TD
    A(["POST /auth/refresh (refreshToken)"]) --> B["findUnique(SESION por refresh_token)"]
    B --> C{"¿Sesión existe y no revocada?"}
    C -- No --> R401(["401 Sesión inválida o expirada"])
    C -- Sí --> D{"¿expira_en > ahora?"}
    D -- No --> R401
    D -- Sí --> E{"¿Usuario activo?"}
    E -- No --> R401
    E -- Sí --> F["update(SESION): revocado = true (rotación)"]
    F --> G["crearSesion: nuevo refresh token + access token"]
    G --> H(["200 { accessToken, refreshToken, expiraEn }"])
```

## 6. Diagramas de estados

### 6.1 Ciclo de vida de la sesión

```mermaid
stateDiagram-v2
    [*] --> Activa : crearSesion (login / register / refresh)
    Activa --> Rotada : refresh usa el token
    Activa --> Revocada : logout
    Activa --> Expirada : expira_en alcanzado
    Rotada --> Activa : emisión de nuevo par de tokens
    Rotada --> Expirada : expira_en alcanzado
    Revocada --> [*]
    Expirada --> [*]
```

### 6.2 Estados de la cuenta según intentos fallidos

```mermaid
stateDiagram-v2
    [*] --> Activa : registro
    Activa --> Bloqueada : 5 intentos fallidos de login
    Bloqueada --> Activa : login correcto
    Bloqueada --> Activa : transcurren 15 minutos (bloqueado_hasta vence)
    Activa --> [*] : desactivación de cuenta
```

## 7. Decisiones de seguridad

| Decisión | Implementación | Justificación |
|---|---|---|
| Hash de contraseña | PBKDF2-SHA256, 100 000 iteraciones, salt de 16 bytes aleatorios, key de 64 bytes (`hashPassword`/`verifyPassword`) | Derivación lenta y salada que dificulta ataques de fuerza bruta y de tablas precomputadas (rainbow tables). |
| Comparación de hashes | XOR bit a bit en tiempo constante (`verifyPassword`) | Evita ataques de timing que revelen la contraseña. |
| Access token | JWT HS256 (`signAccessToken`/`verifyAccessToken`), payload solo `sub`/`iat`/`exp`, TTL por defecto 15 min | Stateless y verificable sin consultar BD; la ventana corta limita el uso de un token robado. |
| Refresh token | Opaco, 48 bytes aleatorios (`randomRefreshToken`), TTL 30 días por defecto | Alta entropía, no adivinable, no derivable del access token. |
| Rotación de refresh token | Cada uso revoca la sesión anterior (`SESION.revocado = true`) | Un token robado y reutilizado queda inservible (mitiga lateral movement). |
| Revocación por sesión | `logout` y cambio de contraseña revocan sesiones | Permite invalidación individual y control del usuario. |
| Bloqueo por intentos fallidos | Tras 5 fallos, `bloqueado_hasta = ahora + 15 min` | Mitiga fuerza bruta sobre el login. |
| Autorización por rol | `requireAdmin` verifica `USUARIO_ROL` en BD por request | El JWT no porta claims de rol; la escalada de privilegios requiere manipular BD (mitiga privilege escalation). |
| Transporte | Tokens vía header `Authorization: Bearer` (nunca en la URL) | Evita exposición en logs/proxies de URLs. |

**Fuentes de referencia:** `src/auth/router.ts`, `src/auth/middleware.ts`, `src/lib/password.ts`, `src/lib/tokens.ts`, `src/lib/encoding.ts`, `src/types.ts`, `prisma/schema.prisma`.

## 8. Mitigación de amenazas: Privilege Escalation y Lateral Movement

Cómo el diseño del subsistema impide dos ataques clásicos: escalada de privilegios (obtener permisos que no corresponden) y movimiento lateral (reutilizar una sesión robada para desplazarse dentro del sistema).

### 8.1 Privilege Escalation

El backend limita la escalada de privilegios con tres capas:

1. **El access token no porta claims de rol**: el JWT solo contiene `sub` (id de usuario), `iat` y `exp`. Nunca contiene `rol` ni `permiso`. Un atacante que intente inyectar un claim `rol=Administrador` debe re-firmar el token, y como no conoce `JWT_SECRET`, la firma HS256 no valida.
2. **Autorización verificada en BD por request**: `requireAdmin` consulta `USUARIO_ROL` en cada petición y exige una fila con rol `Administrador` vigente. No confía en lo que diga el token.
3. **Ventana corta**: el access token expira en 15 min por defecto, limitando cuánto tiempo sirve un token robado.

#### Vector 1: JWT falsificado con claim de rol

```mermaid
sequenceDiagram
    autonumber
    participant Atacante
    participant API as MEG API
    participant MA as requireAuth
    participant MAdm as requireAdmin
    participant DB as USUARIO_ROL

    Note over Atacante,DB: Vector 1: JWT falsificado con claim rol=Administrador
    Atacante->>API: POST /admin (Authorization: Bearer <JWT con claim de rol inventado>)
    API->>MA: verificar token
    MA->>MA: verifyAccessToken(token, JWT_SECRET) [HS256]
    MA-->>API: 401 "Token inválido o expirado" (firma no coincide)
    API-->>Atacante: 401 { error: "Token inválido o expirado" }
```

#### Vector 2: Token válido de un usuario normal intentando una ruta admin

```mermaid
sequenceDiagram
    autonumber
    participant Atacante
    participant API as MEG API
    participant MA as requireAuth
    participant MAdm as requireAdmin
    participant DB as USUARIO_ROL

    Note over Atacante,DB: Vector 2: access token válido de usuario normal en ruta admin
    Atacante->>API: POST /admin (Authorization: Bearer <token válido de usuario normal>)
    API->>MA: requireAuth
    MA->>MA: verifyAccessToken(token, JWT_SECRET)
    MA-->>API: 200/next (userId = 123)
    API->>MAdm: requireAdmin
    MAdm->>DB: findFirst(UsuarioRol id_usuario=123, rol.nombre="Administrador")
    DB-->>MAdm: null (sin rol Administrador)
    MAdm-->>API: 403 "Permisos insuficientes"
    API-->>Atacante: 403 { error: "Permisos insuficientes" }
```

#### Flujo de decisión de `requireAdmin`

```mermaid
flowchart TD
    A(["Petición a ruta protegida con requireAdmin"]) --> B{¿Header Authorization Bearer?}
    B -- No --> R401a(["401 No autenticado"])
    B -- Sí --> C["Extraer access token"]
    C --> D{"verifyAccessToken<br/>(HS256 + JWT_SECRET)"}
    D -- Firma/expiración inválida --> R401b(["401 Token inválido o expirado"])
    D -- Válido --> E["userId = sub del token"]
    E --> F{Buscar USUARIO_ROL<br/>con rol Administrador}
    F -- No existe la relación --> R403(["403 Permisos insuficientes"])
    F -- Existe --> G(["Acceso permitido"])
```

### 8.2 Lateral Movement

El backend impide reutilizar sesiones robadas con:

1. **Rotación de refresh token**: cada uso de un refresh token revoca esa sesión (`SESION.revocado = true`) y emite un par nuevo. Un token ya usado —o robado y usado una vez— queda inservible.
2. **Revocación por sesión**: el logout marca la sesión como revocada; el mismo refresh token no vuelve a servir.
3. **Tokens opacos de alta entropía**: el refresh token son 48 bytes aleatorios (`randomRefreshToken`), imposibles de adivinar o deducir del access token.
4. **Ventana corta del access token**: aunque se robe un access token, expira en 15 min.

#### Reutilización de un refresh token ya rotado

```mermaid
sequenceDiagram
    autonumber
    participant Victima as Víctima
    participant Atacante
    participant API as MEG API
    participant DB as SESION

    Note over Victima,DB: La víctima usa su refresh token legítimamente
    Victima->>API: POST /auth/refresh (refreshToken_v1)
    API->>DB: findUnique(SESION por refresh_token)
    DB-->>API: sesión activa (revocado=false)
    API->>DB: update: revocado=true (rotación)
    API-->>Victima: 200 { accessToken, refreshToken_v2, expiraEn }

    Note over Atacante,DB: El atacante intenta reutilizar el token ya rotado
    Atacante->>API: POST /auth/refresh (refreshToken_v1 robado)
    API->>DB: findUnique(SESION por refresh_token)
    DB-->>API: sesión con revocado=true
    API-->>Atacante: 401 "Sesión inválida o expirada"
```

#### Flujo de detección de reutilización en `/auth/refresh`

```mermaid
flowchart TD
    A(["POST /auth/refresh (refreshToken)"]) --> B{Buscar SESION<br/>por refresh_token}
    B -- No existe --> R1(["401 Sesión inválida o expirada"])
    B -- Existe --> C{¿revocado = true?}
    C -- Sí --> R1
    C -- No --> D{¿expira_en &lt;= ahora?}
    D -- Sí --> R1
    D -- No --> E{¿usuario.activo?}
    E -- No --> R1
    E -- Sí --> F["Revocar sesión usada (rotación)"]
    F --> G["crearSesion: nuevo refresh token (48 bytes aleatorios)"]
    G --> H(["200 { accessToken, refreshToken, expiraEn }"])
```
