# runtime-secrets Specification

## Purpose
Establece que los secretos de firma, en particular `JWT_SECRET`, se inyecten al Worker como binding de secretos en tiempo de despliegue y nunca se versionen ni tengan valor por defecto, garantizando que no exista material de firma conocido por el repositorio (hallazgo H-1 del pentest).

## ADDED Requirements

### Requirement: JWT_SECRET provisto como secreto no versionado
El sistema SHALL obtener `JWT_SECRET` exclusivamente de un binding de secretos de la plataforma (p. ej. `wrangler secret put JWT_SECRET`), y SHALL NOT depender de ningún valor en archivos versionados (`wrangler.jsonc`, `.env`, código) ni contener un valor por defecto.

#### Scenario: Despliegue con secreto configurado
- **WHEN** el Worker se despliega con el binding de secretos `JWT_SECRET` configurado
- **THEN** el sistema usa ese secreto para firmar y verificar los access tokens HS256 sin ningún error de configuración

#### Scenario: Repositorio sin material de firma
- **WHEN** se inspecciona el contenido versionado del repositorio (configuración y código)
- **THEN** no existe ningún valor ni placeholder de `JWT_SECRET` fuera de los archivos ignorados por git (`.dev.vars`, `.env`)

### Requirement: Falla cerrado sin secreto
El sistema SHALL fallar de forma cerrada — no emitir ni verificar tokens y no operar con un secreto implícito — cuando `JWT_SECRET` no esté disponible en el entorno, de modo que la ausencia de configuración nunca produzca tokens firmados con material no autenticado.

#### Scenario: Inicio de sesión sin secreto
- **WHEN** se intenta emitir un access token y `JWT_SECRET` no está disponible en el entorno
- **THEN** el sistema responde un error (p. ej. `500`) y no emite ningún access token

#### Scenario: Verificación de token sin secreto
- **WHEN** un request protegido llega con un access token y `JWT_SECRET` no está disponible en el entorno
- **THEN** el sistema rechaza la solicitud sin validar el token (respuesta `500` o `401`) y nunca acepta el token por defecto
