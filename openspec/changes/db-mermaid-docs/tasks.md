# DB Mermaid Docs — Tasks

## 1. Estructura del documento

- [x] 1.1 Crear el directorio `docs/` y el archivo `docs/database.md` con un encabezado que presente el modelo de datos de MEG y declare `prisma/schema.prisma` como fuente de verdad (vista derivada).
- [x] 1.2 Agregar una tabla de contenidos con las secciones por dominio y las secciones de diagrama global y glosario de enums.
- [x] 1.3 Redactar una nota de convenciones del modelo: campos en `snake_case`, PK autoincrementales (`Int @id @default(autoincrement())`), claves compuestas (`@@id`) en tablas de relación y restricciones `@unique`.

## 2. Diagramas por dominio

- [x] 2.1 Diagrama `erDiagram` del dominio identidad/roles: `ROL`, `PERMISO`, `USUARIO_ROL` (clave compuesta), `ROL_PERMISO` (clave compuesta).
- [x] 2.2 Diagrama `erDiagram` del dominio usuarios y cuentas: `USUARIO`, `SESION`, `DIRECCION_USUARIO`, `NOTIFICACION`, `LOG_AUDITORIA`.
- [x] 2.3 Diagrama `erDiagram` del dominio negocios/KYC: `NEGOCIO`, `HORARIO_NEGOCIO`, `IMAGEN` (asociada a negocio), `NEGOCIO_CATEGORIA` (clave compuesta).
- [x] 2.4 Diagrama `erDiagram` del dominio catálogo: `CATEGORIA` (auto-relación padre/subcategorías), `SERVICIO_PRODUCTO`, `VARIACION`, `ITEM_VARIACION` (unique compuesto), `IMAGEN` (asociada a item).
- [x] 2.5 Diagrama `erDiagram` del dominio pedidos y solicitudes: `PEDIDO`, `SOLICITUD`, `HISTORIAL_ESTADO_SOLICITUD`.
- [x] 2.6 Diagrama `erDiagram` del dominio pagos: `TRANSACCION` (relaciones opcionales a solicitud y pedido).
- [x] 2.7 Diagrama `erDiagram` del dominio reseñas: `RESENA` (1-1 con solicitud, relación a negocio y autor).
- [x] 2.8 Diagrama `erDiagram` del dominio mensajería: `MENSAJE` (contexto de solicitud).
- [x] 2.9 Diagrama `erDiagram` del dominio cupones: `CUPON`, `CUPON_APLICADO`.
- [x] 2.10 Diagrama `erDiagram` del dominio favoritos: `FAVORITO_ITEM` (unique compuesto), `FAVORITO_NEGOCIO` (unique compuesto).
- [x] 2.11 Diagrama `erDiagram` del dominio reclamos: `RECLAMO` (1-1 con solicitud).
- [x] 2.12 Verificar que cada diagrama usa los nombres de tabla mapeados (`@@map`), los tipos de columna de Prisma y la cardinalidad correcta según los bloques `@relation` de `schema.prisma`.

## 3. Diagrama global y glosario

- [x] 3.1 Crear el diagrama `erDiagram` global con todas las entidades y las relaciones principales entre dominios.
- [x] 3.2 Crear el glosario de enums con sus valores: `EstadoKyc`, `TipoItem`, `EstadoSolicitud`, `EstadoTransaccion`, `EstadoPedido`, `TipoNotificacion`, `TipoDescuento`, `EstadoReclamo`.
- [x] 3.3 Documentar en tablas adyacentes las claves compuestas y unicidades que `erDiagram` no expresa (`USUARIO_ROL`, `ROL_PERMISO`, `NEGOCIO_CATEGORIA`, `ITEM_VARIACION`, `FAVORITO_ITEM`, `FAVORITO_NEGOCIO`).

## 4. Integración y validación

- [x] 4.1 Enlazar `docs/database.md` desde la sección "Base de datos" del `README.md`.
- [x] 4.2 Revisar que todos los modelos de `schema.prisma` estén representados en al menos un diagrama y que no existan columnas/relaciones omitidas.
- [x] 4.3 Validar el render de los diagramas Mermaid (p.ej. abriendo el archivo en GitHub) y corregir errores de sintaxis `erDiagram`.
- [x] 4.4 Ejecutar `npm run lint` para confirmar que no hay regresiones de formato/lint en el repo.
