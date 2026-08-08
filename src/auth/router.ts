import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { PrismaClient } from "../../prisma/prisma/client";
import { hashPassword, verifyPassword } from "../lib/password";
import {
	parseDuration,
	randomRefreshToken,
	signAccessToken,
} from "../lib/tokens";
import {
	AuthResponseSchema,
	CredencialesSchema,
	ErrorBloqueoSchema,
	ErrorSchema,
	MensajeSchema,
	RefreshTokenSchema,
	RegistroSchema,
	TokenResponseSchema,
	UsuarioResponseSchema,
} from "../openapi/schemas";
import type { AppEnv, AppVariables } from "../types";
import { usuarioPublico } from "../users/model";
import { requireAuth } from "./middleware";

const MAX_INTENTOS = 5;
const BLOQUEO_MS = 15 * 60 * 1000;

type AuthEnv = { Bindings: AppEnv; Variables: AppVariables };
type AuthContext = Context<AuthEnv>;

const auth = new OpenAPIHono<AuthEnv>({
	defaultHook: (result, c) => {
		if (!result.success) {
			const message = result.error.issues[0]?.message ?? "Datos inválidos";
			return c.json({ error: message }, 400);
		}
	},
}).basePath("/auth");

function fail<S extends ContentfulStatusCode>(
	c: AuthContext,
	status: S,
	error: string,
	extra?: Record<string, unknown>,
) {
	return c.json({ error, ...(extra ?? {}) }, status);
}

async function crearSesion(db: PrismaClient, env: AppEnv, idUsuario: number) {
	const refreshToken = randomRefreshToken();
	const ttlSegundos = parseDuration(env.REFRESH_TOKEN_TTL ?? "30d");
	const expiraEn = new Date(Date.now() + ttlSegundos * 1000);
	await db.sesion.create({
		data: {
			id_usuario: idUsuario,
			refresh_token: refreshToken,
			expira_en: expiraEn,
		},
	});
	const accessToken = await signAccessToken(env, idUsuario);
	return { accessToken, refreshToken, expiraEn };
}

const registerRoute = createRoute({
	method: "post",
	path: "/register",
	tags: ["Autenticación"],
	summary: "Registrar un usuario nuevo",
	description:
		"Crea una cuenta con nombre completo, correo y contraseña (mínimo 8 caracteres). " +
		"La contraseña se almacena con hash PBKDF2-SHA256 y al registrarse se crea una sesión con access y refresh token.",
	request: {
		body: {
			content: { "application/json": { schema: RegistroSchema } },
			description: "Datos del nuevo usuario",
			required: true,
		},
	},
	responses: {
		201: {
			description: "Usuario registrado y sesión creada",
			content: { "application/json": { schema: AuthResponseSchema } },
		},
		400: {
			description:
				"Datos inválidos (campos faltantes, correo inválido o contraseña corta)",
			content: { "application/json": { schema: ErrorSchema } },
		},
		409: {
			description: "El correo ya está registrado",
			content: { "application/json": { schema: ErrorSchema } },
		},
	},
});

const loginRoute = createRoute({
	method: "post",
	path: "/login",
	tags: ["Autenticación"],
	summary: "Iniciar sesión",
	description:
		"Verifica las credenciales y devuelve una sesión (access + refresh token). " +
		"Tras 5 intentos fallidos la cuenta queda bloqueada por 15 minutos.",
	request: {
		body: {
			content: { "application/json": { schema: CredencialesSchema } },
			description: "Correo y contraseña del usuario",
			required: true,
		},
	},
	responses: {
		200: {
			description: "Sesión iniciada",
			content: { "application/json": { schema: AuthResponseSchema } },
		},
		400: {
			description: "Faltan los campos correo y contrasena",
			content: { "application/json": { schema: ErrorSchema } },
		},
		401: {
			description:
				"Credenciales inválidas o cuenta bloqueada por intentos fallidos",
			content: { "application/json": { schema: ErrorSchema } },
		},
		403: {
			description: "Usuario desactivado",
			content: { "application/json": { schema: ErrorSchema } },
		},
		423: {
			description: "Cuenta temporalmente bloqueada",
			content: { "application/json": { schema: ErrorBloqueoSchema } },
		},
	},
});

const refreshRoute = createRoute({
	method: "post",
	path: "/refresh",
	tags: ["Autenticación"],
	summary: "Renovar la sesión",
	description:
		"Recibe un refresh token válido, revoca la sesión usada (rotación) y emite un nuevo par de tokens.",
	request: {
		body: {
			content: { "application/json": { schema: RefreshTokenSchema } },
			description: "Refresh token vigente",
			required: true,
		},
	},
	responses: {
		200: {
			description: "Nuevo par de tokens",
			content: { "application/json": { schema: TokenResponseSchema } },
		},
		400: {
			description: "Falta el campo refreshToken",
			content: { "application/json": { schema: ErrorSchema } },
		},
		401: {
			description: "Sesión inválida o expirada",
			content: { "application/json": { schema: ErrorSchema } },
		},
	},
});

const logoutRoute = createRoute({
	method: "post",
	path: "/logout",
	tags: ["Autenticación"],
	summary: "Cerrar sesión",
	description: "Revoca la sesión asociada al refresh token recibido.",
	request: {
		body: {
			content: { "application/json": { schema: RefreshTokenSchema } },
			description: "Refresh token de la sesión a cerrar",
			required: true,
		},
	},
	responses: {
		200: {
			description: "Sesión cerrada",
			content: { "application/json": { schema: MensajeSchema } },
		},
		400: {
			description: "Falta el campo refreshToken",
			content: { "application/json": { schema: ErrorSchema } },
		},
	},
});

const meRoute = createRoute({
	method: "get",
	path: "/me",
	tags: ["Autenticación"],
	summary: "Obtener el usuario autenticado",
	description:
		"Devuelve los datos públicos del usuario correspondiente al access token enviado.",
	security: [{ Bearer: [] }],
	responses: {
		200: {
			description: "Usuario autenticado",
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

auth.openapi(registerRoute, async (c) => {
	const body = c.req.valid("json");
	const correo = body.correo.trim().toLowerCase();
	const existente = await c.get("db").usuario.findUnique({ where: { correo } });
	if (existente) {
		return fail(c, 409, "El correo ya está registrado");
	}

	const contrasenaHash = await hashPassword(body.contrasena);
	const usuario = await c.get("db").usuario.create({
		data: {
			nombre_completo: body.nombre_completo,
			correo,
			contrasena_hash: contrasenaHash,
			telefono: body.telefono ?? null,
		},
	});

	const sesion = await crearSesion(c.get("db"), c.env, usuario.id_usuario);
	return c.json(
		{
			usuario: usuarioPublico(usuario),
			accessToken: sesion.accessToken,
			refreshToken: sesion.refreshToken,
			expiraEn: sesion.expiraEn,
		},
		201,
	);
});

auth.openapi(loginRoute, async (c) => {
	const body = c.req.valid("json");
	const correo = body.correo.trim().toLowerCase();
	const usuario = await c.get("db").usuario.findUnique({ where: { correo } });
	if (!usuario) {
		return fail(c, 401, "Credenciales inválidas");
	}
	if (!usuario.activo) {
		return fail(c, 403, "Usuario desactivado");
	}

	const bloqueadoHasta = usuario.bloqueado_hasta;
	if (bloqueadoHasta && bloqueadoHasta.getTime() > Date.now()) {
		return fail(c, 423, "Cuenta temporalmente bloqueada", {
			bloqueado_hasta: bloqueadoHasta.toISOString(),
		});
	}

	const valida = await verifyPassword(body.contrasena, usuario.contrasena_hash);
	if (!valida) {
		const intentos = usuario.intentos_fallidos_login + 1;
		const bloquear = intentos >= MAX_INTENTOS;
		await c.get("db").usuario.update({
			where: { id_usuario: usuario.id_usuario },
			data: {
				intentos_fallidos_login: bloquear ? 0 : intentos,
				bloqueado_hasta: bloquear
					? new Date(Date.now() + BLOQUEO_MS)
					: undefined,
			},
		});
		return fail(
			c,
			401,
			bloquear
				? "Demasiados intentos fallidos, cuenta bloqueada por 15 minutos"
				: "Credenciales inválidas",
		);
	}

	await c.get("db").usuario.update({
		where: { id_usuario: usuario.id_usuario },
		data: { intentos_fallidos_login: 0, bloqueado_hasta: null },
	});

	const sesion = await crearSesion(c.get("db"), c.env, usuario.id_usuario);
	return c.json(
		{
			usuario: usuarioPublico(usuario),
			accessToken: sesion.accessToken,
			refreshToken: sesion.refreshToken,
			expiraEn: sesion.expiraEn,
		},
		200,
	);
});

auth.openapi(refreshRoute, async (c) => {
	const { refreshToken } = c.req.valid("json");

	const sesion = await c
		.get("db")
		.sesion.findUnique({ where: { refresh_token: refreshToken } });
	if (!sesion || sesion.revocado || sesion.expira_en.getTime() <= Date.now()) {
		return fail(c, 401, "Sesión inválida o expirada");
	}

	const usuario = await c
		.get("db")
		.usuario.findUnique({ where: { id_usuario: sesion.id_usuario } });
	if (!usuario?.activo) {
		return fail(c, 401, "Sesión inválida o expirada");
	}

	await c.get("db").sesion.update({
		where: { id_sesion: sesion.id_sesion },
		data: { revocado: true },
	});

	const nuevaSesion = await crearSesion(c.get("db"), c.env, sesion.id_usuario);
	return c.json(
		{
			accessToken: nuevaSesion.accessToken,
			refreshToken: nuevaSesion.refreshToken,
			expiraEn: nuevaSesion.expiraEn,
		},
		200,
	);
});

auth.openapi(logoutRoute, async (c) => {
	const { refreshToken } = c.req.valid("json");

	const sesion = await c
		.get("db")
		.sesion.findUnique({ where: { refresh_token: refreshToken } });
	if (sesion && !sesion.revocado) {
		await c.get("db").sesion.update({
			where: { id_sesion: sesion.id_sesion },
			data: { revocado: true },
		});
	}
	return c.json({ mensaje: "Sesión cerrada" }, 200);
});

auth.openapi({ ...meRoute, middleware: requireAuth }, async (c) => {
	const usuario = await c
		.get("db")
		.usuario.findUnique({ where: { id_usuario: c.get("userId") } });
	if (!usuario) {
		return fail(c, 404, "Usuario no encontrado");
	}
	return c.json({ usuario: usuarioPublico(usuario) }, 200);
});

export default auth;
