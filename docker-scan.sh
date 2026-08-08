#!/bin/sh

set -e

IMAGE="${1:-meg-backend}"
CVES_FILE=cves-logs.report
SBOM_FILE=sbom-logs.sbom

echo "Analizando la imagen '$IMAGE' con Docker Scout..."

echo "-> Generando SBOM ($SBOM_FILE)..."
docker scout sbom --output $SBOM_FILE "$IMAGE"

echo "-> Generando reporte de CVEs ($CVES_FILE)..."
docker scout cves --only-severity critical,high --exit-code --output $CVES_FILE "$IMAGE"

echo
echo "Analisis completado sin vulnerabilidades criticas o altas:"
echo "  CVEs: $CVES_FILE"
echo "  SBOM: $SBOM_FILE"
