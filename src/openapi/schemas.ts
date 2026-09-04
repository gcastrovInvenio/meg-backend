import { z } from "@hono/zod-openapi";

export const ErrorSchema = z
	.object({
		error: z.string(),
	})
	.openapi("Error", { description: "Respuesta de error" });

export const ErrorBloqueoSchema = z
	.object({
		error: z.string(),
		bloqueado_hasta: z.string().optional(),
	})
	.openapi("ErrorBloqueo", {
		description: "Error que incluye la fecha de desbloqueo",
	});

export const UsuarioPublicoSchema = z
	.object({
		id_usuario: z.number().int(),
		nombre_completo: z.string(),
		correo: z.string(),
		telefono: z.string().nullable(),
		correo_verificado: z.boolean(),
		fecha_registro: z.string(),
		foto_perfil_key: z.string().nullable(),
	})
	.openapi("UsuarioPublico", {
		description: "Datos públicos del usuario (nunca incluye datos sensibles)",
	});

export const RegistroSchema = z
	.object({
		nombre_completo: z
			.string({ error: "Falta el campo nombre_completo" })
			.trim()
			.min(1, "Falta el campo nombre_completo"),
		correo: z.string().trim().email("Correo electrónico inválido"),
		contrasena: z
			.string({ error: "Falta el campo contrasena" })
			.min(8, "La contraseña debe tener al menos 8 caracteres"),
		telefono: z.string().optional(),
	})
	.openapi("Registro", {
		description: "Datos de registro de un usuario nuevo",
	});

export const CredencialesSchema = z
	.object({
		correo: z
			.string({ error: "Faltan los campos correo y contrasena" })
			.trim()
			.email("Correo electrónico inválido"),
		contrasena: z.string({ error: "Faltan los campos correo y contrasena" }),
	})
	.openapi("Credenciales", { description: "Credenciales de acceso" });

export const RefreshTokenSchema = z
	.object({
		refreshToken: z
			.string({ error: "Falta el campo refreshToken" })
			.min(1, "Falta el campo refreshToken"),
	})
	.openapi("RefreshToken", {
		description: "Refresh token de la sesión vigente",
	});

export const AuthResponseSchema = z
	.object({
		usuario: UsuarioPublicoSchema,
		accessToken: z.string(),
		refreshToken: z.string(),
		expiraEn: z.string(),
	})
	.openapi("AuthResponse", { description: "Sesión creada" });

export const TokenResponseSchema = z
	.object({
		accessToken: z.string(),
		refreshToken: z.string(),
		expiraEn: z.string(),
	})
	.openapi("TokenResponse", { description: "Nuevo par de tokens" });

export const MensajeSchema = z
	.object({
		mensaje: z.string(),
	})
	.openapi("Mensaje", { description: "Mensaje de confirmación" });

export const UsuarioResponseSchema = z
	.object({
		usuario: UsuarioPublicoSchema,
	})
	.openapi("UsuarioResponse", { description: "Respuesta con un usuario" });

export const IdParamsSchema = z.object({
	id: z.coerce
		.number({ error: "ID inválido" })
		.int("ID inválido")
		.positive("ID inválido")
		.openapi({
			param: { name: "id", in: "path" },
			example: 1,
			description: "ID del usuario",
		}),
});

const FotoPerfilKeySchema = z
	.string({ error: "Clave de foto de perfil inválida" })
	.regex(
		/^profile\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/,
		"Clave de foto de perfil inválida",
	);

export const ActualizarPerfilSchema = z
	.object({
		nombre_completo: z
			.string({ error: "Falta el campo nombre_completo" })
			.trim()
			.min(1, "Falta el campo nombre_completo")
			.optional(),
		telefono: z.string().trim().nullish(),
		foto_perfil_key: FotoPerfilKeySchema.nullish(),
	})
	.superRefine((val, ctx) => {
		if (
			val.nombre_completo === undefined &&
			val.telefono === undefined &&
			val.foto_perfil_key === undefined
		) {
			ctx.addIssue({
				code: "custom",
				message:
					"Debe enviar al menos un campo editable (nombre_completo, telefono o foto_perfil_key)",
			});
		}
	})
	.openapi("ActualizarPerfil", {
		description: "Campos editables del perfil de usuario",
	});

export const CambioContrasenaSchema = z
	.object({
		contrasena_actual: z
			.string({ error: "Falta el campo contrasena_actual" })
			.min(1, "Falta el campo contrasena_actual"),
		contrasena_nueva: z
			.string({ error: "Falta el campo contrasena_nueva" })
			.min(8, "La contraseña debe tener al menos 8 caracteres"),
	})
	.openapi("CambioContrasena", {
		description: "Cambio de contraseña del usuario",
	});

export const UploadQuerySchema = z
	.object({
		category: z
			.string()
			.optional()
			.openapi({
				param: { name: "category", in: "query" },
				description:
					"Categoría de la imagen. Determina la carpeta en R2 (profile, cedula, cedula-juridica)",
				example: "profile",
			}),
	})
	.openapi("UploadQuery", { description: "Categoría del archivo a subir" });

export const UploadRequestSchema = z
	.object({
		file: z.any().openapi({
			type: "string",
			format: "binary",
			description: "Archivo de imagen (JPEG, PNG o WebP, máximo 10MB)",
		}),
	})
	.openapi("UploadRequest", {
		description: "Archivo multipart/form-data a subir a R2",
	});

export const UploadResponseSchema = z
	.object({
		key: z.string(),
	})
	.openapi("UploadResponse", {
		description: "Clave del objeto almacenado en R2",
	});

export const UploadKeyParamsSchema = z.object({
	key: z
		.string()
		.min(1)
		.openapi({
			param: { name: "key", in: "path" },
			description: "Clave del objeto en R2",
			example: "profile/abc123.jpg",
		}),
});
