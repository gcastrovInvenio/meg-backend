-- CreateTable
CREATE TABLE "USUARIO" (
    "id_usuario" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre_completo" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "contrasena_hash" TEXT NOT NULL,
    "telefono" TEXT,
    "fecha_registro" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "correo_verificado" BOOLEAN NOT NULL DEFAULT false,
    "intentos_fallidos_login" INTEGER NOT NULL DEFAULT 0,
    "bloqueado_hasta" DATETIME,
    "mfa_secreto" TEXT,
    "token_recuperacion" TEXT,
    "expiracion_token_recuperacion" DATETIME,
    "activo" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "SESION" (
    "id_sesion" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "id_usuario" INTEGER NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "dispositivo" TEXT,
    "direccion_ip" TEXT,
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expira_en" DATETIME NOT NULL,
    "revocado" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "SESION_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "USUARIO" ("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DIRECCION_USUARIO" (
    "id_direccion" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "id_usuario" INTEGER NOT NULL,
    "alias" TEXT,
    "calle" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL,
    "codigo_postal" TEXT,
    "latitud" REAL,
    "longitud" REAL,
    "es_principal" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "DIRECCION_USUARIO_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "USUARIO" ("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NEGOCIO" (
    "id_negocio" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "id_usuario" INTEGER NOT NULL,
    "nombre_negocio" TEXT NOT NULL,
    "descripcion" TEXT,
    "cedula_juridica_fisica" TEXT,
    "estado_kyc" TEXT NOT NULL DEFAULT 'Pendiente',
    "url_documento_identidad" TEXT,
    "fecha_auditoria_kyc" DATETIME,
    "direccion_fisica" TEXT,
    "latitud" REAL,
    "longitud" REAL,
    "calificacion_promedio" REAL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "NEGOCIO_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "USUARIO" ("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CATEGORIA" (
    "id_categoria" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "id_categoria_padre" INTEGER,
    "nombre_categoria" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    CONSTRAINT "CATEGORIA_id_categoria_padre_fkey" FOREIGN KEY ("id_categoria_padre") REFERENCES "CATEGORIA" ("id_categoria") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SERVICIO_PRODUCTO" (
    "id_item" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "id_negocio" INTEGER NOT NULL,
    "id_categoria" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "precio_base" DECIMAL NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_creacion" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SERVICIO_PRODUCTO_id_negocio_fkey" FOREIGN KEY ("id_negocio") REFERENCES "NEGOCIO" ("id_negocio") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SERVICIO_PRODUCTO_id_categoria_fkey" FOREIGN KEY ("id_categoria") REFERENCES "CATEGORIA" ("id_categoria") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SOLICITUD" (
    "id_solicitud" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "id_consumidor" INTEGER NOT NULL,
    "id_item" INTEGER NOT NULL,
    "id_pedido" INTEGER,
    "id_variacion" INTEGER,
    "estado" TEXT NOT NULL DEFAULT 'Pendiente',
    "fecha_solicitud" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "precio_final" DECIMAL,
    CONSTRAINT "SOLICITUD_id_consumidor_fkey" FOREIGN KEY ("id_consumidor") REFERENCES "USUARIO" ("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SOLICITUD_id_item_fkey" FOREIGN KEY ("id_item") REFERENCES "SERVICIO_PRODUCTO" ("id_item") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SOLICITUD_id_pedido_fkey" FOREIGN KEY ("id_pedido") REFERENCES "PEDIDO" ("id_pedido") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SOLICITUD_id_variacion_fkey" FOREIGN KEY ("id_variacion") REFERENCES "VARIACION" ("id_variacion") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RESENA" (
    "id_resena" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "id_solicitud" INTEGER NOT NULL,
    "id_autor" INTEGER NOT NULL,
    "id_negocio" INTEGER NOT NULL,
    "puntuacion" INTEGER NOT NULL,
    "comentario" TEXT,
    "fecha_resena" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RESENA_id_solicitud_fkey" FOREIGN KEY ("id_solicitud") REFERENCES "SOLICITUD" ("id_solicitud") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RESENA_id_autor_fkey" FOREIGN KEY ("id_autor") REFERENCES "USUARIO" ("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RESENA_id_negocio_fkey" FOREIGN KEY ("id_negocio") REFERENCES "NEGOCIO" ("id_negocio") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TRANSACCION" (
    "id_transaccion" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "id_solicitud" INTEGER,
    "id_pedido" INTEGER,
    "pasarela" TEXT NOT NULL,
    "id_pago_externo" TEXT,
    "monto" DECIMAL NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'USD',
    "estado" TEXT NOT NULL DEFAULT 'Pendiente',
    "comision_plataforma" DECIMAL,
    "fecha_transaccion" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TRANSACCION_id_solicitud_fkey" FOREIGN KEY ("id_solicitud") REFERENCES "SOLICITUD" ("id_solicitud") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TRANSACCION_id_pedido_fkey" FOREIGN KEY ("id_pedido") REFERENCES "PEDIDO" ("id_pedido") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MENSAJE" (
    "id_mensaje" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "id_solicitud" INTEGER NOT NULL,
    "id_remitente" INTEGER NOT NULL,
    "contenido" TEXT NOT NULL,
    "fecha_envio" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leido" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "MENSAJE_id_solicitud_fkey" FOREIGN KEY ("id_solicitud") REFERENCES "SOLICITUD" ("id_solicitud") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MENSAJE_id_remitente_fkey" FOREIGN KEY ("id_remitente") REFERENCES "USUARIO" ("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NOTIFICACION" (
    "id_notificacion" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "id_usuario" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "fecha_creacion" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "url_destino" TEXT,
    CONSTRAINT "NOTIFICACION_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "USUARIO" ("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HISTORIAL_ESTADO_SOLICITUD" (
    "id_historial" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "id_solicitud" INTEGER NOT NULL,
    "estado_anterior" TEXT,
    "estado_nuevo" TEXT NOT NULL,
    "id_usuario_responsable" INTEGER NOT NULL,
    "fecha_cambio" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "comentario" TEXT,
    CONSTRAINT "HISTORIAL_ESTADO_SOLICITUD_id_solicitud_fkey" FOREIGN KEY ("id_solicitud") REFERENCES "SOLICITUD" ("id_solicitud") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HISTORIAL_ESTADO_SOLICITUD_id_usuario_responsable_fkey" FOREIGN KEY ("id_usuario_responsable") REFERENCES "USUARIO" ("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IMAGEN" (
    "id_imagen" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "url" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "es_principal" BOOLEAN NOT NULL DEFAULT false,
    "id_negocio" INTEGER,
    "id_item" INTEGER,
    CONSTRAINT "IMAGEN_id_negocio_fkey" FOREIGN KEY ("id_negocio") REFERENCES "NEGOCIO" ("id_negocio") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "IMAGEN_id_item_fkey" FOREIGN KEY ("id_item") REFERENCES "SERVICIO_PRODUCTO" ("id_item") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HORARIO_NEGOCIO" (
    "id_horario" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "id_negocio" INTEGER NOT NULL,
    "dia_semana" INTEGER NOT NULL,
    "hora_apertura" TEXT,
    "hora_cierre" TEXT,
    "cerrado" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "HORARIO_NEGOCIO_id_negocio_fkey" FOREIGN KEY ("id_negocio") REFERENCES "NEGOCIO" ("id_negocio") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PEDIDO" (
    "id_pedido" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "id_consumidor" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'Carrito',
    "subtotal" DECIMAL NOT NULL,
    "descuento_total" DECIMAL NOT NULL,
    "total" DECIMAL NOT NULL,
    "fecha_creacion" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PEDIDO_id_consumidor_fkey" FOREIGN KEY ("id_consumidor") REFERENCES "USUARIO" ("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VARIACION" (
    "id_variacion" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "id_item" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "sobreprecio" DECIMAL NOT NULL,
    CONSTRAINT "VARIACION_id_item_fkey" FOREIGN KEY ("id_item") REFERENCES "SERVICIO_PRODUCTO" ("id_item") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ITEM_VARIACION" (
    "id_item_variacion" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "id_item" INTEGER NOT NULL,
    "id_variacion" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "sku" TEXT,
    CONSTRAINT "ITEM_VARIACION_id_item_fkey" FOREIGN KEY ("id_item") REFERENCES "SERVICIO_PRODUCTO" ("id_item") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ITEM_VARIACION_id_variacion_fkey" FOREIGN KEY ("id_variacion") REFERENCES "VARIACION" ("id_variacion") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CUPON" (
    "id_cupon" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "codigo" TEXT NOT NULL,
    "tipo_descuento" TEXT NOT NULL,
    "valor" DECIMAL NOT NULL,
    "fecha_inicio" DATETIME NOT NULL,
    "fecha_fin" DATETIME NOT NULL,
    "usos_maximos" INTEGER,
    "usos_actuales" INTEGER NOT NULL DEFAULT 0,
    "monto_minimo_compra" DECIMAL,
    "activo" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "CUPON_APLICADO" (
    "id_cupon_aplicado" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "id_cupon" INTEGER NOT NULL,
    "id_pedido" INTEGER NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "monto_descontado" DECIMAL NOT NULL,
    "fecha_aplicacion" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CUPON_APLICADO_id_cupon_fkey" FOREIGN KEY ("id_cupon") REFERENCES "CUPON" ("id_cupon") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CUPON_APLICADO_id_pedido_fkey" FOREIGN KEY ("id_pedido") REFERENCES "PEDIDO" ("id_pedido") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CUPON_APLICADO_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "USUARIO" ("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FAVORITO_ITEM" (
    "id_favorito_item" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "id_usuario" INTEGER NOT NULL,
    "id_item" INTEGER NOT NULL,
    "fecha_agregado" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FAVORITO_ITEM_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "USUARIO" ("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FAVORITO_ITEM_id_item_fkey" FOREIGN KEY ("id_item") REFERENCES "SERVICIO_PRODUCTO" ("id_item") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FAVORITO_NEGOCIO" (
    "id_favorito_negocio" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "id_usuario" INTEGER NOT NULL,
    "id_negocio" INTEGER NOT NULL,
    "fecha_agregado" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FAVORITO_NEGOCIO_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "USUARIO" ("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FAVORITO_NEGOCIO_id_negocio_fkey" FOREIGN KEY ("id_negocio") REFERENCES "NEGOCIO" ("id_negocio") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RECLAMO" (
    "id_reclamo" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "id_solicitud" INTEGER NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "motivo" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'Abierto',
    "fecha_creacion" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolucion" TEXT,
    "fecha_resolucion" DATETIME,
    CONSTRAINT "RECLAMO_id_solicitud_fkey" FOREIGN KEY ("id_solicitud") REFERENCES "SOLICITUD" ("id_solicitud") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RECLAMO_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "USUARIO" ("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ROL" (
    "id_rol" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "PERMISO" (
    "id_permiso" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "USUARIO_ROL" (
    "id_usuario" INTEGER NOT NULL,
    "id_rol" INTEGER NOT NULL,

    PRIMARY KEY ("id_usuario", "id_rol"),
    CONSTRAINT "USUARIO_ROL_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "USUARIO" ("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "USUARIO_ROL_id_rol_fkey" FOREIGN KEY ("id_rol") REFERENCES "ROL" ("id_rol") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ROL_PERMISO" (
    "id_rol" INTEGER NOT NULL,
    "id_permiso" INTEGER NOT NULL,

    PRIMARY KEY ("id_rol", "id_permiso"),
    CONSTRAINT "ROL_PERMISO_id_rol_fkey" FOREIGN KEY ("id_rol") REFERENCES "ROL" ("id_rol") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ROL_PERMISO_id_permiso_fkey" FOREIGN KEY ("id_permiso") REFERENCES "PERMISO" ("id_permiso") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LOG_AUDITORIA" (
    "id_log" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "id_usuario" INTEGER NOT NULL,
    "accion" TEXT NOT NULL,
    "entidad_afectada" TEXT,
    "id_entidad" INTEGER,
    "detalles" TEXT,
    "direccion_ip" TEXT,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LOG_AUDITORIA_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "USUARIO" ("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NEGOCIO_CATEGORIA" (
    "id_negocio" INTEGER NOT NULL,
    "id_categoria" INTEGER NOT NULL,

    PRIMARY KEY ("id_negocio", "id_categoria"),
    CONSTRAINT "NEGOCIO_CATEGORIA_id_negocio_fkey" FOREIGN KEY ("id_negocio") REFERENCES "NEGOCIO" ("id_negocio") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "NEGOCIO_CATEGORIA_id_categoria_fkey" FOREIGN KEY ("id_categoria") REFERENCES "CATEGORIA" ("id_categoria") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "USUARIO_correo_key" ON "USUARIO"("correo");

-- CreateIndex
CREATE UNIQUE INDEX "SESION_refresh_token_key" ON "SESION"("refresh_token");

-- CreateIndex
CREATE UNIQUE INDEX "CATEGORIA_slug_key" ON "CATEGORIA"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "RESENA_id_solicitud_key" ON "RESENA"("id_solicitud");

-- CreateIndex
CREATE UNIQUE INDEX "TRANSACCION_id_solicitud_key" ON "TRANSACCION"("id_solicitud");

-- CreateIndex
CREATE UNIQUE INDEX "ITEM_VARIACION_sku_key" ON "ITEM_VARIACION"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "ITEM_VARIACION_id_item_id_variacion_key" ON "ITEM_VARIACION"("id_item", "id_variacion");

-- CreateIndex
CREATE UNIQUE INDEX "CUPON_codigo_key" ON "CUPON"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "FAVORITO_ITEM_id_usuario_id_item_key" ON "FAVORITO_ITEM"("id_usuario", "id_item");

-- CreateIndex
CREATE UNIQUE INDEX "FAVORITO_NEGOCIO_id_usuario_id_negocio_key" ON "FAVORITO_NEGOCIO"("id_usuario", "id_negocio");

-- CreateIndex
CREATE UNIQUE INDEX "RECLAMO_id_solicitud_key" ON "RECLAMO"("id_solicitud");

-- CreateIndex
CREATE UNIQUE INDEX "ROL_nombre_key" ON "ROL"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "PERMISO_nombre_key" ON "PERMISO"("nombre");
