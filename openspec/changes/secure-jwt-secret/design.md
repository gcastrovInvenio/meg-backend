## Context

El valor `JWT_SECRET` estaba definido en `wrangler.jsonc` → `vars`, quedando versionado y accesible a cualquiera con acceso al repo (hallazgo H-1). Ya se eliminó esa línea del `wrangler.jsonc` local (cambio sin commitear en el working tree). El resto del stack no cambia: `src/lib/tokens.ts` firma/verifica HS256 leyendo `c.env.JWT_SECRET`, y `src/types.ts` lo tipa como binding requerido (`JWT_SECRET: string`) sin default. Ver proposal.md para la motivación completa.

## Goals / Non-Goals

**Goals:**
- Que ningún archivo versionado contenga `JWT_SECRET` ni un placeholder.
- Que el Worker en producción obtenga `JWT_SECRET` de un binding de secretos de Cloudflare.
- Que el desarrollo local siga funcionando con un secreto provisto por el desarrollador.
- Comportamiento fail-closed cubierto por tests cuando falta el secreto.

**Non-Goals:**
- Cambiar el formato, algoritmo o duración de los tokens (HS256, `JWT_EXPIRES_IN`).
- Introducir gestión de múltiples secretos / rotación automática / KMS.
- Mover `DATABASE_URL`, `JWT_EXPIRES_IN` o `REFRESH_TOKEN_TTL` fuera de `vars` (no son secretos).
- Guardar el secreto en un vault ni orquestar CI/CD de secrets.

## Decisions

**D1 — Secreto local vía `.dev.vars` (gitignored).**
El desarrollador crea `.dev.vars` en la raíz con `JWT_SECRET="<valor-aleatorio>"`. Wrangler (y `@cloudflare/vite-plugin`) carga `.dev.vars` como bindings locales, por lo que `c.env.JWT_SECRET` queda disponible en `npm run dev`.
- Alternativa considerada: seguir documentando `.env` (estado actual del README). Rechazada: los bindings de Worker provienen de wrangler (`vars` + `.dev.vars`); sin `.dev.vars`, tras el remove el dev local quedaría con `c.env.JWT_SECRET === undefined`. `.env` puede seguir existiendo para otros usos, pero no es la fuente del binding.

**D2 — Producción vía `wrangler secret put JWT_SECRET`.**
El valor se inyecta con `wrangler secret put JWT_SECRET` (o desde el dashboard), nunca en `vars` ni en el repo.
- Alternativa considerada: variable de entorno en el panel de Cloudflare. Equivalente en efecto; `wrangler secret` se prefiere por ser scriptable y visible en el README de deploy.

**D3 — Mantener `vars` solo con configuración no sensible.**
`JWT_EXPIRES_IN`, `REFRESH_TOKEN_TTL` y `DATABASE_URL` (ruta local de dev) permanecen en `vars`.

**D4 — Fail-closed sin guard de arranque.**
El comportamiento actual ya es fail-closed: con `c.env.JWT_SECRET` ausente, `sign`/`verify` de `hono/jwt` lanzan y los endpoints de auth responden `500`/`401` sin emitir tokens. No se añade un guard de arranque en `index.ts`; en su lugar se agregan tests que fijan el comportamiento. (Si en producción se desplegara sin secreto, solo fallarían los endpoints de auth — mitigado por D2 + tarea de documentación de deploy.)

**D5 — Rotación del valor.**
El valor antiguo (`dev-only-secret-cambiar-en-produccion`) quedó en el historial de git y se descarta. Al implementar se genera un secreto aleatorio nuevo para local y para producción; el valor viejo nunca se reutiliza.

## Risks / Trade-offs

- [Desarrollo local roto si no se crea `.dev.vars` tras el remove] → README actualizado con el paso explícito de `.dev.vars`; si falta, solo fallan los endpoints de auth (fail-closed visible, no silencioso).
- [Deploy a producción sin ejecutar `wrangler secret put` → auth caído en prod] → sección de deploy del README con el orden correcto (secret primero, deploy después).
- [Valor viejo sigue legible en git history] → rotación (D5); el valor era un placeholder de dev y no se desplegó, riesgo residual bajo.
- [Ambigüedad de origen del binding en dev (`@cloudflare/vite-plugin` con `.env` vs `.dev.vars`)] → se fija `.dev.vars` como fuente documentada y se verifica con un flujo de login local en la tarea de implementación.

## Migration Plan

1. Confirmar el remove de `JWT_SECRET` en `vars` de `wrangler.jsonc` (ya en working tree; se commiteará con el cambio).
2. Crear `.dev.vars` local (no se commitea) con un secreto aleatorio nuevo.
3. Actualizar `README.md`: setup local (`.dev.vars`) y sección de deploy (`wrangler secret put JWT_SECRET` antes de `npm run deploy`).
4. Agregar tests de fail-closed (sign sin secreto, verify sin secreto) en `src/lib/tokens.test.ts` / `src/auth/middleware.test.ts`.
5. Ejecutar `npm test` y `npm run lint`.
6. En despliegue: `wrangler secret put JWT_SECRET` y luego `npm run deploy`.

## Open Questions

Ninguna que bloquee el diseño: la pregunta sobre el origen exacto del binding en dev se resuelve en la implementación (verificación local en la tarea 3) sin cambiar el approach ni las specs.
