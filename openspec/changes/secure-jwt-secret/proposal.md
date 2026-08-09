## Why

`wrangler.jsonc` commitea `JWT_SECRET` en `vars` (`"dev-only-secret-cambiar-en-produccion"`). Cualquiera con acceso al repositorio conoce el secreto que firma los access tokens HS256 y podría forjar sesiones válidas si ese valor llega a producción (hallazgo **H-1** del pentest `docs/security/pentest-report-2026-08-08.md`). Es necesario que el secreto se inyecte como binding de secretos de Cloudflare y nunca viva en archivos versionados.

## What Changes

- **Eliminar** `JWT_SECRET` del bloque `vars` de `wrangler.jsonc` (deja de estar versionado).
- Inyectar `JWT_SECRET` en producción vía `wrangler secret put JWT_SECRET` (binding de secretos de Cloudflare Workers).
- Proveer el valor para desarrollo local vía `.dev.vars` (ya ignorado por `.gitignore`), sin valor por defecto en código.
- **Rotar** el valor del secreto: el valor actual quedó expuesto en el historial de git y debe descartarse.
- Actualizar `README.md` (instrucciones de setup local y despliegue) y `docs/security.md`/`docs/pentest-playbook.md` si referencian el secreto commiteado.
- Verificar que `src/types.ts` siga tipando `JWT_SECRET` como binding requerido (sin default) y que el runtime **falle cerrado** si falta el secreto.

## Capabilities

### New Capabilities
- `runtime-secrets`: el sistema SHALL requerir `JWT_SECRET` como binding de secretos (no commiteado), fallar cerrado si falta, y no ofrecer ningún valor por defecto en configuración versionada.

### Modified Capabilities
_(Ninguna — `user-account-management` no cambia de comportamiento.)_

## Impact

- **Código:** `src/lib/tokens.ts` y `src/types.ts` (verificación de lectura del binding; sin cambio de firma de tokens).
- **Configuración:** `wrangler.jsonc` (remove `vars.JWT_SECRET`), nuevo `.dev.vars` local (gitignored).
- **Documentación:** `README.md` (setup), `docs/security.md` (§7 decisiones), `docs/pentest-playbook.md` (check F7).
- **Operación:** requiere `wrangler secret put JWT_SECRET` antes del primer `deploy`; rotación del secreto.
- **Compatibilidad:** sin cambios en la API pública ni en el modelo de datos. Breaking únicamente en despliegue: el Worker falla al iniciar si no se provee el secreto.
