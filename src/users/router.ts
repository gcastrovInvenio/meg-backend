import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { requireAuth } from "../auth/middleware";
import { hashPassword, verifyPassword } from "../lib/password";
import {
	ActualizarPerfilSchema,
	CambioContrasenaSchema,
	ErrorSchema,
	IdParamsSchema,
	MensajeSchema,
	UsuarioResponseSchema,
} from "../openapi/schemas";
import type { AppEnv, AppVariables } from "../types";
import { usuarioPublico } from "./model";

type UsersEnv = { Bindings: AppEnv; Variables: AppVariables };
type UsersContext = Context<UsersEnv>;

const users = new OpenAPIHono<UsersEnv>({
	defaultHook: (result, c) => {
		if (!result.success) {
			const message = result.error.issues[0]?.message ?? "Datos inválidos";
			return c.json({ error: message }, 400);
		}
	},
}).basePath("/users");

function fail<S extends ContentfulStatusCode>(
	c: UsersContext,
	status: S,
	error: string,
) {
	return c.json({ error }, status);
}

const getUsuarioRoute = createRoute({
	method: "get",
	path: "/{id}",
	tags: ["Usuarios"],
	summary: "Obtener un usuario por ID",
	description: "Devuelve los datos públicos de un usuario.",
	request: {
		params: IdParamsSchema,
	},
	responses: {
		200: {
			description: "Usuario encontrado",
			content: { "application/json": { schema: UsuarioResponseSchema } },
		},
		400: {
			description: "ID inválido",
			content: { "application/json": { schema: ErrorSchema } },
		},
		404: {
			description: "Usuario no encontrado",
			content: { "application/json": { schema: ErrorSchema } },
		},
	},
});

const getMeRoute = createRoute({
	method: "get",
	path: "/me",
	tags: ["Usuarios"],
	summary: "Obtener el perfil propio",
	description:
		"Devuelve los datos públicos del usuario autenticado mediante su access token.",
	security: [{ Bearer: [] }],
	responses: {
		200: {
			description: "Perfil del usuario",
			content: { "application/json": { schema: UsuarioResponseSchema } },
		},
		401: {
			description: "No autenticado o token inválido",
			content: { "application/json": { schema: ErrorSchema } },
		},
		404: {
			description: "Usuario no encontrado",
			content: { "application/json": { schema: ErrorSchema } },
		},
	},
});

const actualizarPerfilRoute = createRoute({
	method: "patch",
	path: "/me",
	tags: ["Usuarios"],
	summary: "Actualizar el perfil propio",
	description:
		"Actualiza los campos editables del usuario autenticado (nombre_completo y/o telefono). " +
		"Se debe enviar al menos un campo; los no provistos se conservan.",
	security: [{ Bearer: [] }],
	request: {
		body: {
			content: { "application/json": { schema: ActualizarPerfilSchema } },
			description: "Campos a actualizar",
			required: true,
		},
	},
	responses: {
		200: {
			description: "Perfil actualizado",
			content: { "application/json": { schema: UsuarioResponseSchema } },
		},
		400: {
			description: "Datos inválidos o cuerpo sin campos editables",
			content: { "application/json": { schema: ErrorSchema } },
		},
		401: {
			description: "No autenticado o token inválido",
			content: { "application/json": { schema: ErrorSchema } },
		},
	},
});

const cambiarContrasenaRoute = createRoute({
	method: "post",
	path: "/me/password",
	tags: ["Usuarios"],
	summary: "Cambiar la contraseña",
	description:
		"Verifica la contraseña actual, almacena la nueva con hash PBKDF2-SHA256 y revoca todas las sesiones activas.",
	security: [{ Bearer: [] }],
	request: {
		body: {
			content: { "application/json": { schema: CambioContrasenaSchema } },
			description: "Contraseña actual y nueva",
			required: true,
		},
	},
	responses: {
		200: {
			description: "Contraseña actualizada",
			content: { "application/json": { schema: MensajeSchema } },
		},
		400: {
			description: "Datos inválidos o nueva contraseña corta",
			content: { "application/json": { schema: ErrorSchema } },
		},
		401: {
			description: "Contraseña actual incorrecta",
			content: { "application/json": { schema: ErrorSchema } },
		},
		404: {
			description: "Usuario no encontrado",
			content: { "application/json": { schema: ErrorSchema } },
		},
	},
});

const desactivarCuentaRoute = createRoute({
	method: "post",
	path: "/me/deactivate",
	tags: ["Usuarios"],
	summary: "Desactivar la propia cuenta",
	description:
		"Desactiva de forma lógica la cuenta del usuario autenticado (activo = false) y revoca todas sus sesiones, sin eliminar datos.",
	security: [{ Bearer: [] }],
	responses: {
		200: {
			description: "Cuenta desactivada",
			content: { "application/json": { schema: MensajeSchema } },
		},
		401: {
			description: "No autenticado o token inválido",
			content: { "application/json": { schema: ErrorSchema } },
		},
		404: {
			description: "Usuario no encontrado",
			content: { "application/json": { schema: ErrorSchema } },
		},
		409: {
			description: "La cuenta ya está desactivada",
			content: { "application/json": { schema: ErrorSchema } },
		},
	},
});

users.openapi({ ...getMeRoute, middleware: requireAuth }, async (c) => {
	const usuario = await c
		.get("db")
		.usuario.findUnique({ where: { id_usuario: c.get("userId") } });
	if (!usuario) {
		return fail(c, 404, "Usuario no encontrado");
	}
	return c.json({ usuario: usuarioPublico(usuario) }, 200);
});

users.openapi(
	{ ...actualizarPerfilRoute, middleware: requireAuth },
	async (c) => {
		const body = c.req.valid("json");
		const data: {
			nombre_completo?: string;
			telefono?: string | null;
			foto_perfil_key?: string | null;
		} = {};
		if (body.nombre_completo !== undefined) {
			data.nombre_completo = body.nombre_completo;
		}
		if (body.telefono !== undefined) {
			data.telefono = body.telefono;
		}
		if (body.foto_perfil_key !== undefined) {
			data.foto_perfil_key = body.foto_perfil_key;
		}
		const usuario = await c.get("db").usuario.update({
			where: { id_usuario: c.get("userId") },
			data,
		});
		return c.json({ usuario: usuarioPublico(usuario) }, 200);
	},
);

users.openapi(
	{ ...cambiarContrasenaRoute, middleware: requireAuth },
	async (c) => {
		const { contrasena_actual, contrasena_nueva } = c.req.valid("json");
		const usuario = await c
			.get("db")
			.usuario.findUnique({ where: { id_usuario: c.get("userId") } });
		if (!usuario) {
			return fail(c, 404, "Usuario no encontrado");
		}
		const valida = await verifyPassword(
			contrasena_actual,
			usuario.contrasena_hash,
		);
		if (!valida) {
			return fail(c, 401, "Credenciales inválidas");
		}
		const contrasenaHash = await hashPassword(contrasena_nueva);
		await c.get("db").usuario.update({
			where: { id_usuario: usuario.id_usuario },
			data: { contrasena_hash: contrasenaHash },
		});
		await c.get("db").sesion.updateMany({
			where: { id_usuario: usuario.id_usuario, revocado: false },
			data: { revocado: true },
		});
		return c.json({ mensaje: "Contraseña actualizada" }, 200);
	},
);

users.openapi(
	{ ...desactivarCuentaRoute, middleware: requireAuth },
	async (c) => {
		const usuario = await c
			.get("db")
			.usuario.findUnique({ where: { id_usuario: c.get("userId") } });
		if (!usuario) {
			return fail(c, 404, "Usuario no encontrado");
		}
		if (!usuario.activo) {
			return fail(c, 409, "La cuenta ya está desactivada");
		}
		await c.get("db").usuario.update({
			where: { id_usuario: usuario.id_usuario },
			data: { activo: false },
		});
		await c.get("db").sesion.updateMany({
			where: { id_usuario: usuario.id_usuario, revocado: false },
			data: { revocado: true },
		});
		return c.json({ mensaje: "Cuenta desactivada" }, 200);
	},
);

users.openapi(getUsuarioRoute, async (c) => {
	const id = c.req.valid("param").id;
	const usuario = await c
		.get("db")
		.usuario.findUnique({ where: { id_usuario: id } });
	if (!usuario) {
		return c.json({ error: "Usuario no encontrado" }, 404);
	}
	return c.json({ usuario: usuarioPublico(usuario) }, 200);
});

export default users;
