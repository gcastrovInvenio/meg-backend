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
