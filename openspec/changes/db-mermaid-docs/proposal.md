# DB Mermaid Docs

## Why

La fuente de verdad del modelo de datos de MEG vive en `prisma/schema.prisma` con más de 25 entidades, pero el proyecto no tiene documentación visual del esquema. La sección "Base de datos" del README está vacía, lo que dificulta que el equipo (y nuevos integrantes) entiendan las relaciones entre entidades, los dominios del negocio y las restricciones clave (unicidad, enums, claves compuestas).

## What Changes

- Crear `docs/database.md` con documentación de la base de datos en español que incluya:
  - Diagramas ER en Mermaid (`erDiagram`) por dominio: identidad/roles, usuarios y cuentas, negocios/KYC, catálogo, pedidos/solicitudes, pagos, reseñas, mensajería, notificaciones, cupones, favoritos, reclamos y auditoría.
  - Un diagrama ER global que relacione todos los dominios.
  - Glosario de enums (`EstadoKyc`, `TipoItem`, `EstadoSolicitud`, `EstadoTransaccion`, `EstadoPedido`, `TipoNotificacion`, `TipoDescuento`, `EstadoReclamo`) con sus valores.
  - Notas sobre convenciones: campos en `snake_case`, claves primarias autoincrementales, claves compuestas (`@@id`) en las tablas de relación y restricciones de unicidad.
  - Declaración de que `schema.prisma` es la fuente de verdad y el documento es una vista derivada.
- Enlazar la nueva documentación desde el README en la sección "Base de datos" que hoy está vacía.
- Sin cambios de código, API, esquema de datos ni comportamiento del sistema.

## Capabilities

### New Capabilities
- Ninguna: cambio de documentación puro, sin comportamiento de sistema. Se usa `skip_specs: true`.

### Modified Capabilities
- Ninguna: no cambian requerimientos existentes.

## Impact

- **Archivos nuevos:** `docs/database.md` (documentación con diagramas Mermaid).
- **Archivos modificados:** `README.md` (enlace a la documentación en la sección "Base de datos").
- **Fuente de datos:** `prisma/schema.prisma` (solo lectura; no se modifica).
- **Dependencias:** ninguna nueva; los diagramas Mermaid se renderizan de forma nativa en GitHub/GitLab y editores Markdown.
