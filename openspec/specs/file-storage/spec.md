# file-storage Specification

## Purpose
Capacidad de almacenamiento y servicio de archivos en R2 para imágenes de perfil, cédulas de identidad y cédulas jurídicas. Provee upload multipart, validación de tipo/tamaño, servicio de objetos y eliminación.

## Requirements

### Requirement: Subir archivo a R2
El sistema SHALL proveer un endpoint `POST /uploads` que acepte multipart/form-data con un campo `file`, valide tipo MIME y tamaño, almacene el objeto en el bucket R2 `IMAGES` bajo una clave prefijo basada en categoría (`profile/`, `cedula/`, `cedula-juridica/`), y devuelva la clave del objeto resultante.

#### Scenario: Upload exitoso de imagen de perfil
- **WHEN** un usuario autenticado envía `POST /uploads` con un archivo JPEG de 500KB en el campo `file` y query param `category=profile`
- **THEN** el sistema almacena el archivo en R2 con clave `profile/<uuid>.jpg`, responde `201` con `{ "key": "profile/<uuid>.jpg" }`

#### Scenario: Archivo excede tamaño máximo
- **WHEN** un usuario envía `POST /uploads` con un archivo de 15MB (excediendo el límite de 10MB)
- **THEN** el sistema responde `413` con `{ "error": "El archivo excede el tamaño máximo de 10MB" }` y no almacena nada

#### Scenario: Tipo MIME no permitido
- **WHEN** un usuario envía `POST /uploads` con un archivo PDF (application/pdf)
- **THEN** el sistema responde `415` con `{ "error": "Tipo de archivo no permitido. Use JPEG, PNG o WebP" }` y no almacena nada

#### Scenario: Sin archivo en el request
- **WHEN** un usuario envía `POST /uploads` sin el campo `file` en el multipart
- **THEN** el sistema responde `400` con `{ "error": "Se requiere un archivo" }`

#### Scenario: Sin autenticación
- **WHEN** un cliente no autenticado envía `POST /uploads`
- **THEN** el sistema responde `401` con `{ "error": "No autenticado" }`

### Requirement: Servir archivo desde R2
El sistema SHALL proveer un endpoint `GET /uploads/:key` que recupere el objeto del bucket R2 `IMAGES` usando la clave proporcionada, devuelva el contenido con el Content-Type correcto y headers de cache optimizados, o devuelva 404 si la clave no existe.

#### Scenario: Archivo existe
- **WHEN** un cliente solicita `GET /uploads/profile/abc123.jpg` y el objeto existe en R2
- **THEN** el sistema responde `200` con el contenido binario del archivo, Content-Type `image/jpeg`, y headers `Cache-Control: public, max-age=31536000, immutable`

#### Scenario: Archivo no existe
- **WHEN** un cliente solicita `GET /uploads/profile/inexistente.jpg` y el objeto no existe en R2
- **THEN** el sistema responde `404` con `{ "error": "Archivo no encontrado" }`

### Requirement: Eliminar archivo de R2
El sistema SHALL proveer una función utilitaria `removeUpload(key)` que elimine un objeto del bucket R2 por su clave, y que devuelva `true` si se eliminó correctamente o `false` si la clave no existía. Esta función será consumida por módulos de KYC y gestión de imágenes.

#### Scenario: Eliminar archivo existente
- **WHEN** se invoca `removeUpload("profile/abc123.jpg")` y el objeto existe
- **THEN** el objeto se elimina de R2 y la función retorna `true`

#### Scenario: Eliminar archivo inexistente
- **WHEN** se invoca `removeUpload("profile/inexistente.jpg")` y el objeto no existe
- **THEN** la función retorna `false` sin lanzar error

### Requirement: Validación de categorías
El sistema SHALL aceptar solo las siguientes categorías válidas en el query param `category` del upload: `profile`, `cedula`, `cedula-juridica`. Categoría no válida resulta en error 400.

#### Scenario: Categoría no válida
- **WHEN** un usuario envía `POST /uploads?category=invalid`
- **THEN** el sistema responde `400` con `{ "error": "Categoría no válida. Use: profile, cedula, cedula-juridica" }`

#### Scenario: Sin categoría
- **WHEN** un usuario envía `POST /uploads` sin query param `category`
- **THEN** el sistema usa `other` como categoría por defecto y almacena con prefijo `other/`
