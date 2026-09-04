## Why

Docker Scout reporta 6 CVEs de `pkg:golang/stdlib@1.26.4` que provienen del binario nativo `tsgo` de `typescript` (una devDependency que NO viaja a producción) y del paquete del sistema/base de la imagen. Tanto el escaneo local (`vuln-scanner.sh`) como el de CI (`.github/workflows/docker-scout.yml`) los tratan como hallazgos reales: el primero los filtra a mano con una lista hardcodeada de CVEs (`ACCEPTED_CVES`), y el segundo, que no filtra nada, hace fallar el CI con `exit-code: true`. El objetivo es que ambos escaneos de Docker Scout solo analicen los paquetes que efectivamente llegan a producción (dependencias npm), eliminando el ruido de golang (tsgo) y los paquetes del sistema/base.

## What Changes

- **`vuln-scanner.sh`**: restringir el `docker scout cves` a `--only-package-type npm` y eliminar el bloque hardcodeado `ACCEPTED_CVES` y su lógica de validación por CVE. El gate pasa a basarse en el alcance nativo "solo paquetes npm" en lugar de una lista manual de CVEs.
- **`.github/workflows/docker-scout.yml`**: agregar `only-package-types: npm` al paso `cves` (junto a `only-severities: critical,high` y `exit-code: true`) para que CI no falle por las CVEs de golang/base.
- **Spec `vulnerability-scan`**: reemplazar el riesgo aceptado "lista de 6 CVEs tsgo filtradas a mano" por una regla de alcance "solo paquetes npm". Documentar la limitación conocida: la action `docker/scout-action@v1` solo expone `only-package-types` (grueso, mantiene dev deps npm como typescript/vite/wrangler) y NO expone `--only-package`; por lo tanto el alcance fino por paquete no es posible vía esa action.

## Capabilities

### New Capabilities

- Ninguna.

### Modified Capabilities

- `vulnerability-scan`: cambia el comportamiento del escaneo Docker Scout — pasa de filtrar una lista explícita de CVEs aceptadas a restringir el alcance del análisis a los paquetes npm (con la limitación de que dev deps npm siguen dentro).

## Impact

- **Código**: `vuln-scanner.sh`, `.github/workflows/docker-scout.yml`.
- **Specs**: `openspec/specs/vulnerability-scan/spec.md` (delta).
- **Docs**: `docs/security.md` y `docs/pentest-playbook.md` pueden mencionar `ACCEPTED_CVES`/tsgo y requerir ajuste.
- **Dependencias**: ninguna (solo configuración de herramienta de escaneo).
- **Comportamiento observable**: las CVEs de golang (tsgo) y los paquetes del sistema/base dejan de aparecer en el reporte de Docker Scout y dejan de hacer fallar CI/local; las CVEs npm (incluidas dev deps) siguen apareciendo y gating.
