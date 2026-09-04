#!/bin/sh

set -e

IMAGE="${1:-meg-backend}"
CVES_FILE=cves-logs.report
SBOM_FILE=sbom-logs.sbom
DEPS_REPORT=snyk-deps-report.txt
CODE_REPORT=snyk-code-report.txt
SNYK_STATUS=0

echo "Analizando el proyecto con Docker Scout (imagen) y Snyk (dependencias y codigo)."

# --- Seccion Snyk (dependencias npm + codigo fuente) ---
echo
echo "-> Analizando con Snyk..."

if ! command -v snyk >/dev/null 2>&1; then
	echo "ERROR: la CLI de Snyk no esta instalada."
	echo "  Instalala con: npm install -g snyk"
	echo "  O consulta: https://docs.snyk.io/snyk-cli/install-or-update-the-snyk-cli"
	exit 1
fi

if [ -z "$(snyk config get api 2>/dev/null)" ] && [ ! -f "${HOME}/.config/configstore/snyk.json" ]; then
	echo "ERROR: Snyk no esta autenticado."
	echo "  Autenticate con: snyk auth <SNYK_TOKEN>"
	exit 1
fi

echo "  -> Escaneando dependencias npm ($DEPS_REPORT)..."
if snyk test --severity-threshold=high --json >"$DEPS_REPORT"; then
	echo "     Dependencias: sin vulnerabilidades altas o criticas."
else
	echo "     Dependencias: SE ENCONTRARON vulnerabilidades altas o criticas."
	SNYK_STATUS=1
fi

echo "  -> Escaneando codigo fuente / SAST ($CODE_REPORT)..."
if snyk code test --severity-threshold=high --json >"$CODE_REPORT"; then
	echo "     Codigo: sin vulnerabilidades altas o criticas."
else
	echo "     Codigo: SE ENCONTRARON vulnerabilidades altas o criticas."
	SNYK_STATUS=1
fi

# --- Seccion Docker Scout (imagen de contenedor) ---
echo
echo "Analizando la imagen '$IMAGE' con Docker Scout..."

echo "-> Generando SBOM ($SBOM_FILE)..."
docker scout sbom --output $SBOM_FILE "$IMAGE"

echo "-> Generando reporte de CVEs de paquetes npm ($CVES_FILE)..."
docker scout cves --only-severity critical,high --only-package-type npm --output $CVES_FILE "$IMAGE" || true

FOUND_CVES=$(grep -oE "CVE-[0-9]{4}-[0-9]+" "$CVES_FILE" 2>/dev/null | sort -u)

SCOUT_STATUS=0
if [ -n "$FOUND_CVES" ]; then
	echo "     Imagen: SE ENCONTRARON vulnerabilidades altas o criticas:$FOUND_CVES"
	SCOUT_STATUS=1
else
	echo "     Imagen: sin vulnerabilidades altas o criticas."
fi

echo
echo "Analisis completado (Docker Scout restringido a paquetes npm):"
echo "  CVEs (Docker Scout): $CVES_FILE"
echo "  SBOM (Docker Scout): $SBOM_FILE"
echo "  Dependencias (Snyk): $DEPS_REPORT"
echo "  Codigo (Snyk):       $CODE_REPORT"

[ "$SNYK_STATUS" -gt "$SCOUT_STATUS" ] && exit "$SNYK_STATUS"
exit "$SCOUT_STATUS"
