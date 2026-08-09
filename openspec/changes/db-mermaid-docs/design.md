# DB Mermaid Docs — Design

## Context

See proposal.md — Why. El estado actual: `prisma/schema.prisma` es la fuente de verdad del modelo de datos (25+ modelos, tablas mapeadas a mayúsculas vía `@@map`, enums, claves compuestas en las tablas de relación). No existe documentación visual; la sección "Base de datos" del README está vacía. No hay dependencias de diagramación instaladas y el repo sigue convenciones de español para contenido visible.

## Goals / Non-Goals

**Goals:**
- Proveer un documento Markdown legible y renderizable que represente fielmente el modelo de `schema.prisma` con diagramas `erDiagram` de Mermaid.
- Dividir el esquema en dominios para que cada diagrama sea comprensible, más un diagrama global.
- Documentar enums, unicidades y claves compuestas que el `erDiagram` no puede expresar de forma nativa.
- Mantener `schema.prisma` como única fuente de verdad (el doc es una vista derivada).

**Non-Goals:**
- No modificar el esquema, ni las migraciones, ni el código de la API.
- No instalar herramientas de generación automática de diagramas desde Prisma.
- No documentar la API REST ni el modelo de acceso a datos (eso vive en OpenAPI).

## Decisions

- **Ubicación del documento:** crear `docs/database.md` y enlazarlo desde la sección "Base de datos" del `README.md`. Alternativa considerada: solo ampliar el README — descartada porque el esquema completo (25+ entidades) excede lo razonable para un README; un `docs/` dedicado permite crecer con guías por dominio.
- **Estructura por dominios:** una sección por dominio (identidad/roles, usuarios y cuentas, negocios/KYC, catálogo, pedidos, pagos, reseñas, mensajería, notificaciones, cupones, favoritos, reclamos, auditoría), cada una con su `erDiagram`, más una sección final con el diagrama global. Alternativa considerada: un único diagrama gigante — descartada por ilegibilidad; se elige una vista por dominio más una vista general.
- **Representación de tablas y columnas en Mermaid:** usar los nombres de tabla mapeados (`USUARIO`, `SOLICITUD`, …) como nombres de entidad, y las columnas con sus tipos Prisma (p.ej. `Int`, `String`, `Decimal`, `DateTime`, `Boolean`, `Float`). Las columnas clave (PK/FK) se etiquetan en la relación, ya que `erDiagram` soporta `PK`/`FK` inline.
- **Cardinalidad:** usar el formato `||--o{`, `||--||`, `}o--o{` de Mermaid para reflejar las relaciones de Prisma (1-N, 1-1, N-N vía tabla pivote). Cada relación del diagrama se contrasta contra las relaciones declaradas en los bloques de los modelos de `schema.prisma`.
- **Enums y restricciones fuera del diagrama:** Mermaid `erDiagram` no soporta enums, claves compuestas ni `@unique` de forma nativa. Se documentan en tablas/glosarios adyacentes:
  - Glosario de enums con todos sus valores (los 8 enums del esquema).
  - Nota de claves compuestas para `USUARIO_ROL`, `ROL_PERMISO`, `NEGOCIO_CATEGORIA`, `ITEM_VARIACION` (unique compuesto), `FAVORITO_ITEM` y `FAVORITO_NEGOCIO` (unique compuesto).
- **Exactitud y mantenibilidad:** cada diagrama se escribe manualmente a partir de `schema.prisma` y se valida visualmente (render Mermaid en GitHub). El documento declara explícitamente que `schema.prisma` es la fuente de verdad, para que cualquier divergencia detectada en la implementación se corrija en el esquema y luego en el doc.
- **Idioma:** todo el contenido del documento en español, acorde a las convenciones del proyecto.

## Risks / Trade-offs

- Divergencia entre el documento y `schema.prisma` si el esquema evoluciona → Mitigación: declarar `schema.prisma` como fuente de verdad en el propio doc y agregar una tarea de revisión que compare el diagrama global contra el esquema; el doc se actualiza junto con cada cambio de esquema.
- El `erDiagram` global con 25+ entidades puede quedar denso → Mitigación: dividir en dominios y mantener el global solo con entidades y relaciones principales.
- Render distinto entre visores Markdown → Mitigación: usar solo sintaxis `erDiagram` estándar de Mermaid, sin extras propietarios.

## Migration Plan

No aplica (cambio de documentación; no hay datos, código ni servicios que migrar). Publicación: el documento se renderiza automáticamente al hacer commit del archivo.

## Open Questions

Ninguna.
