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

echo "-> Generando reporte de CVEs ($CVES_FILE)..."
docker scout cves --only-severity critical,high --output $CVES_FILE "$IMAGE" || true

# --- Riesgo aceptado: stdlib Go embebido en typescript (tsgo) ---
# El binario nativo de typescript@7 (github.com/microsoft/typescript-go, tsgo)
# embebe golang stdlib 1.26.4 con 6 CVEs (1 critica, 5 altas) sin fix upstream
# (typescript 7.0.2 es el ultimo estable; requiere Go >=1.26.6).
# Riesgo aceptado: es una devDependency, el contenedor solo ejecuta 'npm run dev'
# (vite) y nunca invoca 'tsc', por lo que el binario no participa del request-path.
# Re-evaluar cuando typescript publique una version con Go >=1.26.6.
ACCEPTED_CVES="CVE-2026-39821 CVE-2026-56862 CVE-2026-56859 CVE-2026-56853 CVE-2026-46600 CVE-2026-33818"

FOUND_CVES=$(grep -oE "CVE-[0-9]{4}-[0-9]+" "$CVES_FILE" 2>/dev/null | sort -u)
unaccepted_cves=""

for cve in $FOUND_CVES; do
	case " $ACCEPTED_CVES " in
		*" $cve "*) ;;
		*) unaccepted_cves="$unaccepted_cves $cve" ;;
	esac
done

SCOUT_STATUS=0
if [ -n "$unaccepted_cves" ]; then
	echo "     Imagen: SE ENCONTRARON vulnerabilidades no aceptadas:$unaccepted_cves"
	SCOUT_STATUS=1
elif [ -n "$FOUND_CVES" ]; then
	echo "     Imagen: solo hallazgos de riesgo aceptado (stdlib/tsgo), ver $CVES_FILE"
else
	echo "     Imagen: sin vulnerabilidades altas o criticas."
fi

echo
echo "Analisis completado:"
echo "  CVEs (Docker Scout): $CVES_FILE"
echo "  SBOM (Docker Scout): $SBOM_FILE"
echo "  Dependencias (Snyk): $DEPS_REPORT"
echo "  Codigo (Snyk):       $CODE_REPORT"

[ "$SNYK_STATUS" -gt "$SCOUT_STATUS" ] && exit "$SNYK_STATUS"
exit "$SCOUT_STATUS"
