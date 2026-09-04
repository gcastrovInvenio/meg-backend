## Context

Ver proposal.md (Why/What). Estado actual relevante:

- `vuln-scanner.sh` llama `docker scout cves --only-severity critical,high --output $CVES_FILE` y luego filtra con `ACCEPTED_CVES` (lista hardcodeada de 6 CVEs de `tsgo`/golang stdlib) mediante grep, fallando si aparece una CVE no aceptada.
- `.github/workflows/docker-scout.yml` paso `cves` usa `only-severities: critical,high` + `exit-code: true` sin ningún filtro de paquete → el CI falla por las 6 CVEs golang.
- La CLI local `docker scout cves` expone `--only-package-type` (y también `--only-package`, regex fino por nombre, más `--only-vex-affected`/`--vex-location`).
- La action `docker/scout-action@v1` **solo** expone `only-package-types`, `only-severities`, `only-fixed/unfixed`, `only-cisa-kev` y VEX (`vex-location`/`only-vex-affected`); **NO** expone `--only-package` (regex por nombre). Esto limita el alcance fino en CI.

## Goals / Non-Goals

**Goals:**
- Que Docker Scout (local y CI) analice solo paquetes de tipo `npm`, excluyendo `golang` (tsgo) y las librerías del sistema/base (`apk`/base).
- Eliminar el hack `ACCEPTED_CVES` (lista manual de CVEs) del `vuln-scanner.sh`.
- Consistencia de alcance entre local y CI: ambos restringen a `npm`.

**Non-Goals:**
- NO implementar scoping fino por nombre de paquete (`--only-package`) en CI: no está disponible en `docker/scout-action@v1`. No agregamos pasos de filtrado SARIF propios ni reemplazamos la action.
- NO cambiar el Dockerfile a multi-stage / target solo-producción (opción descartada por el usuario).
- NO usar VEX para marcar las 6 CVEs `tsgo` como `not_affected` (opción descartada por el usuario).

## Decisions

**Decisión 1 — Alcance por tipo de paquete `npm` en ambos escenarios.**
- Local: `docker scout cves --only-severity critical,high --only-package-type npm --output $CVES_FILE`.
- CI: `only-package-types: npm` en el paso `cves` de `docker/scout-action@v1`.
- *Rationale*: consistente, soportado por ambas interfaces (CLI y action), elimina `golang`/`tsgo` y `apk`/base del reporte y del gate.
- *Alternativa descartada*: `--only-package` regex fino — solo existe en CLI, no en la action, rompería la consistencia local/CI.

**Decisión 2 — Eliminar `ACCEPTED_CVES` y su loop de validación.**
- Tras restringir a `npm`, los 6 CVEs golang desaparecen del reporte por defecto, por lo que la lista manual y el loop de grep quedan obsoletos. El gate queda definido por "¿hay CVEs altas/críticas en paquetes npm?".
- *Rationale*: menos código, cero lista hardcodeada, no hay "red de seguridad" redundante porque no pueden aparecer CVEs golang bajo `--only-package-type npm`.
- *Trade-off*: si Docker clasificara algún paquete golang como npm (improbable), aparecería y gatía el gate — comportamiento deseable (fail-closed).

**Decisión 3 — Aceptar la limitación de que dev deps npm siguen en el reporte.**
- `--only-package-type npm` / `only-package-types: npm` incluye TODAS las deps npm, tanto de producción (hono, zod, @hono/*, @prisma/*, dotenv, googleapis) como dev (typescript, vite, wrangler, prisma, etc.).
- *Rationale*: la action no permite excluir dev deps npm. Documentamos esta limitación en la spec (riesgo aceptado) y en `docs/security.md`.
- *Alternativa considerada*: Dockerfile multi-stage produciendo un target `prod` con `npm ci --omit=dev` y escaneo por `--target`/`--only-stage`. Descartada por el usuario (rompería la CMD dev actual y requiere reestructurar el build).

**Decisión 4 — Actualizar la especificación `vulnerability-scan` y su riesgo aceptado.**
- Reemplazar la fila de riesgo "lista de 6 CVEs tsgo filtrada a mano" por la regla de alcance "solo paquetes npm" + limitación "dev deps npm permanecen en el alcance (limitación de `docker/scout-action@v1`)".
- Revisar `docs/security.md` y `docs/pentest-playbook.md` por menciones a `ACCEPTED_CVES`/tsgo/la lista.

## Risks / Trade-offs

- [Alcance grueso: dev deps npm (typescript/vite/wrangler) permanecen en el reporte y en el gate de CI] → Documentar como riesgo aceptado en la spec; monitorear que no haya CVEs altas/críticas en esas dev deps (hoy no las hay). Si aparecieran, el CI fallaría y habría que decidir excepción explícita (p. ej. VEX) o migrar el Dockerfile a multi-stage.
- [Consistencia local/CI depende de que ambas interfaces soporten `--only-package-type npm`] → Verificado: la CLI local lo soporta (`--only-package-type`) y la action lo soporta (`only-package-types`).
- [Regresión: cambio de "gate por lista de CVEs aceptadas" a "gate por alcance npm"] → Con `npm` no quedan CVEs conocidas en deps de producción ni de desarrollo (verificado en el árbol prod de 9 paquetes, `npm audit --omit=dev` 0), por lo que el gate no se afloja en la práctica; solo se silencia ruido no-producción.

## Migration Plan

1. Actualizar `vuln-scanner.sh`: línea del `docker scout cves` con `--only-package-type npm`, eliminar bloque `ACCEPTED_CVES` y su loop.
2. Actualizar `.github/workflows/docker-scout.yml`: agregar `only-package-types: npm` al paso `cves`.
3. Actualizar `openspec/specs/vulnerability-scan/spec.md` (riesgo aceptado) y `docs/security.md`/`docs/pentest-playbook.md`.
4. Verificar localmente con `./vuln-scanner.sh meg-backend:latest` que el gate pasa y `docs/security.md` refleja el nuevo alcance.
5. Rollback: revertir los 2 archivos de configuración; el comportamiento anterior (lista de CVEs) queda documentado en git history.

## Open Questions

Ninguna que cambie specs/approach/desglose. La diferencia menor restante (si un paquete golang se clasificara como npm por error) se resuelve por el comportamiento fail-closed del gate.
