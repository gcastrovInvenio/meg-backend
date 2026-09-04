## 1. Escaneo local

- [x] 1.1 En `vuln-scanner.sh`, agregar `--only-package-type npm` a la invocación `docker scout cves --only-severity critical,high` (línea 55), para restringir el escaneo a paquetes npm
- [x] 1.2 En `vuln-scanner.sh`, eliminar el bloque `ACCEPTED_CVES` (líneas 57-64) y su comentario doc sobre el riesgo aceptado tsgo
- [x] 1.3 En `vuln-scanner.sh`, eliminar el loop de validación por CVE (líneas 66-84) y dejar el gate basado únicamente en CVEs altas/críticas presentes tras el filtro `npm` (ajustar la lógica `SCOUT_STATUS` y los mensajes)
- [x] 1.4 Actualizar el mensaje de salida del script (líneas 87-91) para reflejar que el reporte CVEs está restringido a paquetes npm

## 2. Escaneo en CI

- [x] 2.1 En `.github/workflows/docker-scout.yml`, agregar `only-package-types: npm` al paso `Docker Scout - CVEs` (junto a `only-severities: critical,high` y `exit-code: true`)

## 3. Especificación y documentación

- [x] 3.1 En `openspec/specs/vulnerability-scan/spec.md`, reemplazar la entrada de riesgo aceptado "stdlib Go embebido en tsgo (6 CVEs)" por la regla de alcance "solo paquetes npm" + limitación documentada de `docker/scout-action@v1` (no expone `--only-package`; dev deps npm permanecen en el alcance)
- [x] 3.2 En `docs/security.md`, actualizar la sección de escaneo de imagen de contenedor para reflejar el filtro de tipo de paquete `npm` (local y CI)
- [x] 3.3 En `docs/pentest-playbook.md`, actualizar el comando del script local (línea 276) y cualquier referencia a `--exit-code`/CVEs para incluir `--only-package-type npm` donde corresponda

## 4. Verificación

- [x] 4.1 Ejecutar `docker scout cves --only-severity critical,high --only-package-type npm meg-backend:latest` manualmente y confirmar que ya no aparecen CVEs `golang`/`tsgo` ni paquetes del sistema/base
- [x] 4.2 Ejecutar `./vuln-scanner.sh meg-backend:latest` completo y confirmar que termina en éxito (gate Docker Scout aprobado) y que `cves-logs.report` no contiene CVEs golang
- [x] 4.3 Ejecutar `npx biome check vuln-scanner.sh .github/workflows/docker-scout.yml` (si aplica a shell/yaml) o revisar que no queden referencias huérfanas a `ACCEPTED_CVES` en el repo
- [x] 4.4 Ejecutar `openspec validate --change scope-docker-scout-to-prod-npm --strict` y confirmar que el delta spec cumple