# meg-backend

## Requisitos

- Node.js 24+
- npm
- Cuenta de Cloudflare (para `deploy` y migraciones remotas)

## Setup

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Crear el archivo `.env` en la raíz:

   ```bash
   DATABASE_URL="file:./dev.db"
   JWT_SECRET="<genera-un-secreto-aleatorio>"
   JWT_EXPIRES_IN="15m"
   REFRESH_TOKEN_TTL="30d"
   ```

3. Aplicar las migraciones a la base de datos local (D1):

   ```bash
   npm run cloudflare-db-local
   ```

4. Levantar el servidor en desarrollo:

   ```bash
   npm run dev
   ```

## Otros comandos

- Aplicar migraciones a la base remota: `npm run cloudflare-db-remote`
- Desplegar a Cloudflare Workers: `npm run deploy`
- Generar/sincronizar los tipos de tu configuración de Worker: `npm run cf-typegen`

   ```ts
   // src/index.ts
   const app = new Hono<{ Bindings: CloudflareBindings }>()
   ```

- Ejecutar tests: `npm test`
- Lint: `npm run lint`
- Documentación swagger: `npm run docs`

Para ver la documentación abre directamente:
  http://localhost:5173/docs
Después de ejecutar el anterior comando

## Base de datos

´´´mermaid

erDiagram
    USUARIO ||--o{ SESION : "tiene"
    USUARIO ||--o{ DIRECCION_USUARIO : "registra"
    USUARIO ||--o{ NEGOCIO : "administra"
    USUARIO ||--o{ SOLICITUD : "realiza (consumidor)"
    USUARIO ||--o{ RESENA : "escribe"
    USUARIO ||--o{ MENSAJE : "envía"
    USUARIO ||--o{ NOTIFICACION : "recibe"
    USUARIO ||--o{ PEDIDO : "genera"
    USUARIO ||--o{ FAVORITO_ITEM : "marca"
    USUARIO ||--o{ FAVORITO_NEGOCIO : "marca"
    USUARIO ||--o{ RECLAMO : "presenta"
    USUARIO ||--o{ LOG_AUDITORIA : "genera"
    USUARIO }o--|| ROL : "tiene (a través de USUARIO_ROL)"

    NEGOCIO ||--o{ SERVICIO_PRODUCTO : "ofrece"
    NEGOCIO ||--o{ RESENA : "recibe"
    NEGOCIO ||--o{ MENSAJE : "recibe"
    NEGOCIO ||--o{ IMAGEN : "posee"
    NEGOCIO ||--o{ HORARIO_NEGOCIO : "define"
    NEGOCIO }o--o{ CATEGORIA : "categorías de interés (opcional)"
    NEGOCIO ||--o{ FAVORITO_NEGOCIO : "es añadido a favoritos"

    SERVICIO_PRODUCTO ||--o{ SOLICITUD : "es objeto de"
    SERVICIO_PRODUCTO ||--o{ IMAGEN : "posee"
    SERVICIO_PRODUCTO ||--o{ VARIACION : "posee"
    SERVICIO_PRODUCTO ||--o{ FAVORITO_ITEM : "es añadido a favoritos"
    SERVICIO_PRODUCTO }o--|| CATEGORIA : "pertenece"

    CATEGORIA ||--o{ CATEGORIA : "subcategoría (id_padre)"

    SOLICITUD ||--o| RESENA : "genera"
    SOLICITUD ||--o{ MENSAJE : "contiene hilo de chat"
    SOLICITUD ||--o{ HISTORIAL_ESTADO_SOLICITUD : "tiene"
    SOLICITUD ||--o{ TRANSACCION : "genera pago"
    SOLICITUD }o--|| PEDIDO : "forma parte de (opcional)"

    PEDIDO ||--o{ SOLICITUD : "agrupa"
    PEDIDO ||--o{ TRANSACCION : "paga (una por pedido)"

    VARIACION ||--o{ ITEM_VARIACION : "desglose de stock/precio"
    ITEM_VARIACION }o--|| SERVICIO_PRODUCTO : "referencia"

    CUPON ||--o{ CUPON_APLICADO : "aplicado en"
    CUPON_APLICADO }o--|| PEDIDO : "beneficia a"
    CUPON_APLICADO }o--|| USUARIO : "usado por"

    ROL ||--o{ USUARIO_ROL : "asignado a"
    ROL ||--o{ ROL_PERMISO : "posee permisos"
    PERMISO ||--o{ ROL_PERMISO : "asignado a rol"
    
    %% ========== TABLAS EXISTENTES MEJORADAS ==========
    USUARIO {
        int id_usuario PK
        string nombre_completo
        string correo UNIQUE
        string contrasena_hash
        string telefono
        datetime fecha_registro
        boolean correo_verificado
        int intentos_fallidos_login
        datetime bloqueado_hasta
        string mfa_secreto
        string token_recuperacion
        datetime expiracion_token_recuperacion
        boolean activo "Borrado lógico"
    }

    SESION {
        int id_sesion PK
        int id_usuario FK
        string refresh_token UNIQUE
        string dispositivo
        string direccion_ip
        datetime creado_en
        datetime expira_en
        boolean revocado
    }

    NEGOCIO {
        int id_negocio PK
        int id_usuario FK
        string nombre_negocio
        string descripcion
        string cedula_juridica_fisica
        string estado_kyc "Pendiente, Aprobado, Rechazado"
        string url_documento_identidad
        datetime fecha_auditoria_kyc
        string direccion_fisica
        float latitud
        float longitud
        float calificacion_promedio
        boolean activo "Soft delete"
    }

    CATEGORIA {
        int id_categoria PK
        int id_categoria_padre FK "Nullable, jerarquía"
        string nombre_categoria
        string slug "URL amigable"
    }

    SERVICIO_PRODUCTO {
        int id_item PK
        int id_negocio FK
        int id_categoria FK
        string tipo "Producto o Servicio"
        string nombre
        string descripcion
        decimal precio_base "Precio sin variaciones"
        boolean activo "Soft delete"
        datetime fecha_creacion
    }

    SOLICITUD {
        int id_solicitud PK
        int id_consumidor FK
        int id_item FK
        int id_pedido FK "Nullable, si pertenece a un pedido"
        int id_variacion FK "Nullable, variante elegida"
        string estado "Pendiente, Aceptada, Completada, Cancelada"
        datetime fecha_solicitud
        decimal precio_final "Precio acordado (con variación o cupón)"
    }

    RESENA {
        int id_resena PK
        int id_solicitud FK UNIQUE "Una sola reseña por solicitud"
        int id_autor FK
        int id_negocio FK
        int puntuacion "1 a 5"
        string comentario
        datetime fecha_resena
    }

    %% ========== NUEVAS TABLAS (CORRECCIONES) ==========
    DIRECCION_USUARIO {
        int id_direccion PK
        int id_usuario FK
        string alias "Casa, Oficina..."
        string calle
        string ciudad
        string codigo_postal
        float latitud
        float longitud
        boolean es_principal
    }

    TRANSACCION {
        int id_transaccion PK
        int id_solicitud FK UNIQUE "Cada solicitud se paga una vez"
        int id_pedido FK "Si se pagó todo el pedido junto"
        string pasarela "Stripe, PayPal..."
        string id_pago_externo
        decimal monto
        string moneda
        string estado "Pendiente, Completado, Fallido, Reembolsado"
        decimal comision_plataforma
        datetime fecha_transaccion
    }

    MENSAJE {
        int id_mensaje PK
        int id_solicitud FK
        int id_remitente FK
        string contenido
        datetime fecha_envio
        boolean leido
    }

    NOTIFICACION {
        int id_notificacion PK
        int id_usuario FK
        string tipo "push, email, sms"
        string titulo
        string mensaje
        boolean leida
        datetime fecha_creacion
        string url_destino "Deep link dentro de la app"
    }

    HISTORIAL_ESTADO_SOLICITUD {
        int id_historial PK
        int id_solicitud FK
        string estado_anterior
        string estado_nuevo
        int id_usuario_responsable FK "Usuario que hizo el cambio"
        datetime fecha_cambio
        string comentario
    }

    IMAGEN {
        int id_imagen PK
        int id_entidad FK "id_negocio o id_item"
        string tipo_entidad "negocio o item"
        string url
        int orden
        boolean es_principal
    }

    HORARIO_NEGOCIO {
        int id_horario PK
        int id_negocio FK
        int dia_semana "0=Domingo..6=Sábado"
        time hora_apertura
        time hora_cierre
        boolean cerrado "Día no laborable"
    }

    PEDIDO {
        int id_pedido PK
        int id_consumidor FK
        string estado "Carrito, Confirmado, Pagado, Enviado, Entregado, Cancelado"
        decimal subtotal
        decimal descuento_total
        decimal total
        datetime fecha_creacion
    }

    VARIACION {
        int id_variacion PK
        int id_item FK
        string nombre "Ej: Color, Talla, Duración"
        string valor "Ej: Rojo, XL, 2 horas"
        decimal sobreprecio "Precio adicional respecto al base"
    }

    ITEM_VARIACION {
        int id_item_variacion PK
        int id_item FK
        int id_variacion FK
        int stock "Cantidad disponible"
        string sku "Código único de variante"
    }

    CUPON {
        int id_cupon PK
        string codigo UNIQUE
        string tipo_descuento "porcentaje o fijo"
        decimal valor
        date fecha_inicio
        date fecha_fin
        int usos_maximos
        int usos_actuales
        decimal monto_minimo_compra
        boolean activo
    }

    CUPON_APLICADO {
        int id_cupon_aplicado PK
        int id_cupon FK
        int id_pedido FK
        int id_usuario FK
        decimal monto_descontado
        datetime fecha_aplicacion
    }

    FAVORITO_ITEM {
        int id_favorito_item PK
        int id_usuario FK
        int id_item FK
        datetime fecha_agregado
    }

    FAVORITO_NEGOCIO {
        int id_favorito_negocio PK
        int id_usuario FK
        int id_negocio FK
        datetime fecha_agregado
    }

    RECLAMO {
        int id_reclamo PK
        int id_solicitud FK
        int id_usuario FK
        string motivo
        string estado "Abierto, En revisión, Resuelto"
        datetime fecha_creacion
        string resolucion
        datetime fecha_resolucion
    }

    ROL {
        int id_rol PK
        string nombre "consumidor, emprendedor, pyme, admin, soporte"
    }

    PERMISO {
        int id_permiso PK
        string nombre "gestionar_usuarios, ver_reportes, etc."
    }

    USUARIO_ROL {
        int id_usuario FK
        int id_rol FK
        PRIMARY KEY (id_usuario, id_rol)
    }

    ROL_PERMISO {
        int id_rol FK
        int id_permiso FK
        PRIMARY KEY (id_rol, id_permiso)
    }

    LOG_AUDITORIA {
        int id_log PK
        int id_usuario FK
        string accion "LOGIN, KYC_APROBADO, BORRADO_CUENTA..."
        string entidad_afectada
        int id_entidad
        string detalles
        string direccion_ip
        datetime fecha
    }

´´´
