import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import {
	ErrorSchema,
	IdParamsSchema,
	UsuarioResponseSchema,
} from "../openapi/schemas";
import type { AppEnv, AppVariables } from "../types";
import { usuarioPublico } from "./model";

type UsersEnv = { Bindings: AppEnv; Variables: AppVariables };

const users = new OpenAPIHono<UsersEnv>({
	defaultHook: (result, c) => {
		if (!result.success) {
			const message = result.error.issues[0]?.message ?? "Datos inválidos";
			return c.json({ error: message }, 400);
		}
	},
}).basePath("/users");

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
