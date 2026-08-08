import type { Context, Next } from "hono";
import { verifyAccessToken } from "../lib/tokens";
import type { AppEnv, AppVariables } from "../types";

type AuthContext = Context<{ Bindings: AppEnv; Variables: AppVariables }>;

function getBearerToken(c: AuthContext): string | undefined {
	const header = c.req.header("Authorization");
	return header?.startsWith("Bearer ") ? header.slice(7) : undefined;
}

export async function requireAuth(c: AuthContext, next: Next) {
	const token = getBearerToken(c);
	if (!token) {
		return c.json({ error: "No autenticado" }, 401);
	}
	try {
		const userId = await verifyAccessToken(token, c.env.JWT_SECRET);
		c.set("userId", userId);
		return next();
	} catch {
		return c.json({ error: "Token inválido o expirado" }, 401);
	}
}

export async function requireAdmin(c: AuthContext, next: Next) {
	const token = getBearerToken(c);
	if (!token) {
		return c.json({ error: "No autenticado" }, 401);
	}
	let userId: number;
	try {
		userId = await verifyAccessToken(token, c.env.JWT_SECRET);
	} catch {
		return c.json({ error: "Token inválido o expirado" }, 401);
	}
	const vinculo = await c.get("db").usuarioRol.findFirst({
		where: { id_usuario: userId, rol: { nombre: "Administrador" } },
	});
	if (!vinculo) {
		return c.json({ error: "Permisos insuficientes" }, 403);
	}
	c.set("userId", userId);
	return next();
}
