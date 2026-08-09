## 1. Configuración del secreto

- [x] 1.1 Confirmar que `wrangler.jsonc` ya no contiene `JWT_SECRET` en `vars` (remove ya aplicado en el working tree; quedará incluido en el commit del cambio)
- [x] 1.2 Crear `.dev.vars` en la raíz con `JWT_SECRET="<secreto-aleatorio-nuevo>"` (valor recién generado, sin reutilizar `dev-only-secret-cambiar-en-produccion`)
- [x] 1.3 Verificar que `.dev.vars` y `.env` siguen ignorados por `.gitignore` (env → sección `# env`)

## 2. Documentación

- [x] 2.1 `README.md` setup: cambiar el paso 2 (`.env`) para indicar crear `.dev.vars` con `JWT_SECRET` como secreto local de wrangler; dejar `JWT_EXPIRES_IN`/`REFRESH_TOKEN_TTL` como configuración no sensible
- [x] 2.2 `README.md` deploy: documentar `wrangler secret put JWT_SECRET` como paso previo obligatorio a `npm run deploy`
- [x] 2.3 Actualizar `docs/security/pentest-report-2026-08-08.md`: marcar estado de H-1 (mitigado/plan) en la sección de hallazgos

## 3. Tests de falla cerrada

- [x] 3.1 `src/lib/tokens.test.ts`: agregar test de `signAccessToken`/`verifyAccessToken` con `JWT_SECRET` ausente (env sin secreto) → falla sin emitir/aceptar token
- [x] 3.2 `src/auth/middleware.test.ts`: agregar test de `requireAuth`/`requireAdmin` con env sin `JWT_SECRET` → responde error (500/401) y nunca acepta el token

## 4. Verificación

- [x] 4.1 Ejecutar `npm test` (suite completa verde, incluidos los nuevos tests)
- [x] 4.2 Ejecutar `npm run lint` (biome check sin errores)
- [x] 4.3 Levantar `npm run dev` y verificar flujo de login local: `c.env.JWT_SECRET` resuelto desde `.dev.vars` y se emite access token
- [x] 4.4 Verificar con búsqueda en el repo (git grep) que ningún archivo rastreado contiene un valor/placeholder de `JWT_SECRET` (solo referencias de código y docs)

## 5. Despliegue (operador)

- [ ] 5.1 Ejecutar `wrangler secret put JWT_SECRET` con el nuevo valor aleatorio antes del primer deploy
- [ ] 5.2 Desplegar con `npm run deploy` y confirmar que los endpoints de auth funcionan en producción
