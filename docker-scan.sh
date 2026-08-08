#!/bin/sh

set -e

IMAGE="${1:-meg-backend}"

echo "Analizando la imagen '$IMAGE' con Docker Scout..."

echo "-> Generando reporte de CVEs (cves-logs)..."
docker scout cves --output cves-logs.report "$IMAGE"

echo "-> Generando SBOM (sbom-logs)..."
docker scout sbom --output sbom-logs.sbom "$IMAGE"

echo
echo "Analisis completado:"
echo "  CVEs: cves-logs"
echo "  SBOM: sbom-logs"
